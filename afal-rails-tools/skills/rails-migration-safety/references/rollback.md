# Migration Rollback and Recovery Patterns

## Reversible Migrations

### Using change Method

Rails can auto-reverse most operations:

```ruby
class AddEmailToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :email, :string
    add_index :users, :email
  end
end

# Rails automatically generates:
# - remove_column :users, :email
# - remove_index :users, :email
```

Auto-reversible operations:
- `add_column` (reverses to remove_column)
- `add_index` (reverses to remove_index)
- `add_reference` (reverses to remove_reference)
- `add_foreign_key` (reverses to remove_foreign_key)
- `create_table` (reverses to drop_table)
- `create_join_table` (reverses to drop_join_table)
- `rename_column` (reverses to rename back)
- `rename_table` (reverses to rename back)

### When change Cannot Auto-Reverse

Some operations need explicit up/down:

```ruby
class RemoveEmailFromUsers < ActiveRecord::Migration[8.1]
  def up
    remove_column :users, :email
  end

  def down
    add_column :users, :email, :string
  end
end
```

Required for:
- `remove_column` (need type and options to restore)
- `change_column` (Rails doesn't know previous type)
- `change_column_default` (need previous default)
- `execute` (arbitrary SQL)
- `change_column_null` (doesn't know previous state)

### Making Operations Reversible

Use `reversible` block for complex migrations:

```ruby
class MigrateUserData < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :full_name, :string

    reversible do |dir|
      dir.up do
        User.find_each do |user|
          user.update_column(:full_name, "#{user.first_name} #{user.last_name}")
        end
      end

      dir.down do
        User.find_each do |user|
          parts = user.full_name.to_s.split(' ', 2)
          user.update_columns(
            first_name: parts[0],
            last_name: parts[1]
          )
        end
      end
    end

    remove_column :users, :first_name, :string
    remove_column :users, :last_name, :string
  end
end
```

### Handling remove_column Properly

Always include type and options for reversibility:

```ruby
# Bad - not reversible
class RemoveBioFromUsers < ActiveRecord::Migration[8.1]
  def change
    remove_column :users, :bio
  end
end

# Good - fully reversible
class RemoveBioFromUsers < ActiveRecord::Migration[8.1]
  def change
    remove_column :users, :bio, :text, default: '', null: false
  end
end
```

Check schema.rb or previous migrations for exact column definition.

## Irreversible Migrations

Some migrations cannot be reversed:

```ruby
class RemoveOldUserData < ActiveRecord::Migration[8.1]
  def up
    User.where('created_at < ?', 1.year.ago).delete_all
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "Cannot restore deleted user data"
  end
end
```

Or use helper:

```ruby
class DestructiveChange < ActiveRecord::Migration[8.1]
  def change
    # Prevents rollback
    raise ActiveRecord::IrreversibleMigration
  end
end
```

## Data Migration Rollback Strategies

### Strategy 1: Store Old Values

Preserve original data during migration:

```ruby
class MigrateEmailFormat < ActiveRecord::Migration[8.1]
  def up
    add_column :users, :old_email, :string

    User.find_each do |user|
      user.update_columns(
        old_email: user.email,
        email: normalize_email(user.email)
      )
    end
  end

  def down
    User.find_each do |user|
      user.update_column(:email, user.old_email) if user.old_email
    end

    remove_column :users, :old_email
  end

  private

  def normalize_email(email)
    email.to_s.downcase.strip
  end
end
```

### Strategy 2: Snapshot Table

For major data transformations:

```ruby
class RestructureOrders < ActiveRecord::Migration[8.1]
  def up
    # Create snapshot
    execute <<-SQL
      CREATE TABLE orders_backup AS
      SELECT * FROM orders;
    SQL

    # Transform data
    Order.find_each do |order|
      # Complex transformation
    end
  end

  def down
    # Restore from snapshot
    execute <<-SQL
      TRUNCATE orders;
      INSERT INTO orders SELECT * FROM orders_backup;
      DROP TABLE orders_backup;
    SQL
  end
end
```

### Strategy 3: Temporal Columns

Track migration state:

```ruby
class MigrateToNewSchema < ActiveRecord::Migration[8.1]
  def up
    add_column :users, :migrated_at, :timestamp

    User.find_each do |user|
      # Migration logic
      user.update_column(:migrated_at, Time.current)
    end
  end

  def down
    User.where.not(migrated_at: nil).find_each do |user|
      # Reverse migration
    end

    remove_column :users, :migrated_at
  end
end
```

## Testing Rollbacks

### In Development

Always test rollback before deploying:

```bash
# Run migration
rails db:migrate

# Test application works

# Rollback
rails db:rollback

# Verify application still works with old schema

# Re-migrate
rails db:migrate
```

### Testing Specific Migration

```bash
# Rollback specific version
rails db:migrate:down VERSION=20260214120000

# Re-run
rails db:migrate:up VERSION=20260214120000
```

### Testing in CI

Add rollback test to CI pipeline:

```ruby
# test/integration/migration_test.rb
class MigrationTest < ActiveSupport::TestCase
  test "migrations are reversible" do
    # Get current version
    current_version = ActiveRecord::Migrator.current_version

    # Rollback one step
    ActiveRecord::Migrator.rollback(1)

    # Re-migrate
    ActiveRecord::Migration.migrate(Rails.root.join('db/migrate'))

    # Verify we're back at same version
    assert_equal current_version, ActiveRecord::Migrator.current_version
  end
end
```

## Emergency Rollback Procedures

### Rolling Back in Production

When deployment fails due to migration:

**Step 1: Assess the situation**
```bash
# Check which migrations ran
rails db:migrate:status

# Check application logs
tail -f log/production.log

# Check database state
rails dbconsole
```

**Step 2: Rollback migration**
```bash
# Rollback last migration
rails db:rollback RAILS_ENV=production

# Or rollback to specific version
rails db:migrate:down VERSION=20260214120000 RAILS_ENV=production
```

**Step 3: Rollback application code**
```bash
# Revert to previous deploy
git revert HEAD
# or
git reset --hard <previous-commit>

# Redeploy
```

**Step 4: Verify**
```bash
# Check migration status
rails db:migrate:status

# Test critical paths
rails runner 'User.first' RAILS_ENV=production
```

### When Rollback Fails

If migration rollback fails:

```ruby
# Create hotfix migration to manually undo changes
class FixFailedMigration < ActiveRecord::Migration[8.1]
  def up
    # Manually reverse the changes
    remove_column :users, :broken_field if column_exists?(:users, :broken_field)
  end
end
```

### Point-in-Time Recovery

For catastrophic failures, restore database snapshot:

```bash
# Stop application
systemctl stop app

# Restore from backup (before failed migration)
pg_restore -d app_production backup_before_migration.dump

# Reset migration version in database
rails dbconsole
# UPDATE schema_migrations SET version = 'XXX' WHERE version = 'YYY';

# Restart application
systemctl start app
```

## Migration Dependencies and Ordering

### Sequential Dependencies

Ensure migrations run in order:

```ruby
# Migration 1
class CreateProjects < ActiveRecord::Migration[8.1]
  def change
    create_table :projects do |t|
      t.string :name
      t.timestamps
    end
  end
end

# Migration 2 - depends on migration 1
class AddOrganizationToProjects < ActiveRecord::Migration[8.1]
  def change
    # This will fail if projects table doesn't exist
    add_reference :projects, :organization, foreign_key: true
  end
end
```

Rails runs migrations by timestamp order. Ensure timestamps reflect dependencies.

### Cross-Database Dependencies

For Solid Queue setup:

```ruby
# Primary database migration
class CreateJobs < ActiveRecord::Migration[8.1]
  def change
    create_table :jobs do |t|
      t.string :queue_name
      t.timestamps
    end
  end
end

# Queue database migration - avoid referencing primary tables
class CustomizeSolidQueue < ActiveRecord::Migration[8.1]
  def change
    # Cannot add foreign key to primary database table
    add_column :solid_queue_jobs, :job_metadata, :jsonb
  end
end
```

### Checking Table Existence

For safer migrations:

```ruby
class SafeMigration < ActiveRecord::Migration[8.1]
  def change
    return unless table_exists?(:users)

    add_column :users, :field, :string unless column_exists?(:users, :field)
  end
end
```

## Schema Cache Considerations

### Clearing Schema Cache

After migrations, Rails schema cache may be stale:

```ruby
# In deployment script
rails db:schema:cache:dump RAILS_ENV=production

# Or in migration if needed
class CriticalMigration < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :important_field, :string

    # Clear schema cache to ensure immediate reflection
    Rails.cache.clear if Rails.cache.respond_to?(:clear)
  end
end
```

### Cache Invalidation in Zero-Downtime

Old app servers may cache old schema:

```ruby
# Restart strategy in deployment
# 1. Run migrations
rails db:migrate

# 2. Gradually restart app servers
# This ensures schema cache refreshes

# 3. Deploy new code
```

## Multi-Step Migration Tracking

### Tracking Migration Progress

For multi-deploy migrations, track state:

```ruby
# Step 1: Add column
class AddEmailToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :email, :string
    add_column :users, :email_migration_step, :integer, default: 1
  end
end

# Step 2: Backfill
class BackfillUserEmails < ActiveRecord::Migration[8.1]
  def up
    User.where(email_migration_step: 1).find_each do |user|
      user.update_columns(
        email: "#{user.username}@example.com",
        email_migration_step: 2
      )
    end
  end
end

# Step 3: Cleanup
class FinalizeEmailMigration < ActiveRecord::Migration[8.1]
  def change
    change_column_null :users, :email, false
    remove_column :users, :email_migration_step, :integer
  end
end
```

### Rollback State Tracking

```ruby
class ComplexMigration < ActiveRecord::Migration[8.1]
  def up
    add_column :users, :migration_state, :jsonb, default: {}

    User.find_each do |user|
      old_data = { name: user.name, email: user.email }
      user.update_column(:migration_state, { old_data: old_data })

      # Transform data
    end
  end

  def down
    User.find_each do |user|
      if user.migration_state['old_data']
        user.update_columns(user.migration_state['old_data'])
      end
    end

    remove_column :users, :migration_state
  end
end
```

## Handling Failed Partial Migrations

### Idempotent Cleanup

Make migrations safe to re-run after partial failure:

```ruby
class IdempotentMigration < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    # Add column if not exists
    unless column_exists?(:users, :status)
      add_column :users, :status, :string
    end

    # Backfill only unprocessed rows
    User.where(status: nil).in_batches do |batch|
      batch.update_all(status: 'active')
    end

    # Add constraint if not exists
    unless connection.index_exists?(:users, :status)
      add_index :users, :status, algorithm: :concurrently
    end
  end
end
```

### Transaction vs Non-Transaction

```ruby
# Default: runs in transaction (all-or-nothing)
class TransactionalMigration < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :field1, :string
    add_column :users, :field2, :string
    # If field2 fails, field1 is rolled back
  end
end

# No transaction: partial completion possible
class NonTransactionalMigration < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_column :users, :field1, :string
    add_index :users, :field1, algorithm: :concurrently
    # If index fails, field1 remains added
  end
end
```

Choose based on failure recovery strategy.

## Version Control Best Practices

### Commit Strategy

```bash
# Commit migration separately from code changes
git add db/migrate/20260214120000_add_email_to_users.rb
git commit -m "Add email column to users (step 1/3)"

# Later, commit application code
git add app/models/user.rb
git commit -m "Add email support to User model (step 2/3)"
```

### Merge Conflicts in schema.rb

When multiple developers create migrations:

```bash
# Regenerate schema.rb
rails db:migrate:reset  # Development only!

# Or manually fix version in schema.rb
# Find conflicting version numbers and keep both
```

### Never Edit Deployed Migrations

Once a migration runs in production, never edit it:

```ruby
# Wrong - editing deployed migration
class AddEmailToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :email, :string
    add_column :users, :phone, :string  # Added later - BAD
  end
end

# Correct - create new migration
class AddPhoneToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :phone, :string
  end
end
```
