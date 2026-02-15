---
name: rails-migration-safety
description: This skill should be used when the user asks to create a migration, add a column, rename a column, change a column type, add an index, remove a column, write a safe migration, ensure zero downtime migration, or work with database migrations in Rails.
---

# Safe Database Migration Patterns for AFAL Rails Apps

## Golden Rule

All migrations must be safe for zero-downtime deployments. Old and new application code must coexist with the database schema during deployment.

## Quick Safety Checklist

| Operation | Safe? | Pattern |
|-----------|-------|---------|
| Add column (nullable) | ✓ Yes | Standard migration |
| Add column (NOT NULL) | ⚠ Careful | Add nullable first, backfill, then add constraint |
| Add column (with default) | ✓ Yes | Rails 8 handles safely |
| Remove column | ⚠ Careful | Ignore in app first, remove in next deploy |
| Rename column | ✗ No | Add new, copy, switch, remove old (4 deploys) |
| Rename table | ✗ No | Add view, migrate, remove view |
| Add index | ⚠ Careful | Use `algorithm: :concurrently` |
| Remove index | ✓ Yes | Standard migration |
| Change column type | ✗ No | Add new column, migrate data, remove old |
| Add foreign key | ⚠ Careful | Add with `validate: false`, validate separately |
| Add check constraint | ⚠ Careful | Add NOT VALID, validate separately |

## Core Principles

### 1. Separate Schema from Data

Never mix DDL and data manipulation in the same migration.

```ruby
# Bad - schema and data mixed
class AddRoleToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :role, :string
    User.update_all(role: 'member')
  end
end

# Good - separate migrations
class AddRoleToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :role, :string
  end
end

class BackfillUserRoles < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    User.in_batches.update_all(role: 'member')
  end
end
```

### 2. Multi-Step Deployments for Breaking Changes

Dangerous operations require multiple deploys:

1. **Deploy 1**: Make schema backward compatible
2. **Deploy 2**: Update application code
3. **Deploy 3**: Clean up old schema

### 3. Use strong_migrations Gem

The `strong_migrations` gem catches unsafe patterns:

```ruby
# It will error on:
add_index :users, :email  # Missing concurrently
remove_column :users, :name  # Should ignore first
change_column :users, :age, :bigint  # Type change unsafe
```

Follow its suggestions or use safety_assured when you know better.

## Common Operations

### Adding Columns

**Nullable columns (always safe):**
```ruby
class AddBioToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :bio, :text
  end
end
```

**NOT NULL columns (3-step process):**
```ruby
# Step 1: Add nullable column
class AddEmailToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :email, :string
  end
end

# Step 2: Backfill data (separate migration)
class BackfillUserEmails < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    User.in_batches.update_all("email = CONCAT(id, '@example.com')")
  end
end

# Step 3: Add constraint (after ensuring all data exists)
class AddNotNullToUserEmail < ActiveRecord::Migration[8.1]
  def change
    change_column_null :users, :email, false
  end
end
```

**Columns with defaults (Rails 8 safe):**
```ruby
class AddActiveToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :active, :boolean, default: true, null: false
  end
end
# Rails 8 uses efficient backfill, this is safe
```

### Adding Indexes

Always use `algorithm: :concurrently` for production tables:

```ruby
class AddIndexToUsersEmail < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_index :users, :email, algorithm: :concurrently
  end
end
```

Unique indexes need extra care:
```ruby
class AddUniqueIndexToUsersEmail < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_index :users, :email, unique: true, algorithm: :concurrently
  end
end
```

### Removing Columns

Two-deploy process required:

```ruby
# Deploy 1: Ignore column in model
class User < ApplicationRecord
  self.ignored_columns += [:old_field]
end

# Deploy 2: Remove column
class RemoveOldFieldFromUsers < ActiveRecord::Migration[8.1]
  def change
    remove_column :users, :old_field, :string
  end
end
```

### Renaming Columns

Requires 4 deploys (use multi-step pattern):

1. Add new column
2. Write to both columns
3. Backfill data, read from new column
4. Remove old column

See `references/patterns.md` for complete example.

### Adding Foreign Keys

Add without validation first, then validate:

```ruby
# Step 1: Add FK without validation
class AddOrganizationFKToProjects < ActiveRecord::Migration[8.1]
  def change
    add_foreign_key :projects, :organizations, validate: false
  end
end

# Step 2: Validate separately (can take time)
class ValidateOrganizationFKOnProjects < ActiveRecord::Migration[8.1]
  def change
    validate_foreign_key :projects, :organizations
  end
end
```

## Data Migrations

**Batch processing pattern:**
```ruby
class BackfillUserStatus < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    User.in_batches(of: 1000) do |batch|
      batch.update_all(status: 'active')
      sleep 0.01  # Throttle to avoid load spikes
    end
  end

  def down
    # Make it reversible if possible
    User.in_batches(of: 1000) do |batch|
      batch.update_all(status: nil)
    end
  end
end
```

**Make data migrations idempotent:**
```ruby
def up
  User.where(status: nil).in_batches(of: 1000) do |batch|
    batch.update_all(status: 'active')
  end
end
```

## Multi-Tenant Considerations

AFAL apps use `organization_id` partitioning. Consider:

```ruby
# Add organization_id when creating tables
create_table :projects do |t|
  t.references :organization, null: false, foreign_key: true
  t.string :name
  t.timestamps
end

# Include organization_id in indexes
add_index :projects, [:organization_id, :status], algorithm: :concurrently
```

## Multi-Database Setup (Solid Queue)

AFAL uses Solid Queue with separate database. Be explicit:

```ruby
# Primary database (default)
class AddColumnToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :field, :string
  end
end

# Queue database (if needed)
class AddColumnToSolidJobs < ActiveRecord::Migration[8.1]
  def change
    # This runs on queue database
    add_column :solid_queue_jobs, :custom_field, :string
  end
end
```

## Common Mistakes

| Mistake | Why Unsafe | Fix |
|---------|-----------|-----|
| `add_index` without concurrently | Locks table | Use `algorithm: :concurrently` |
| Removing column immediately | Old code crashes | Ignore first, remove later |
| NOT NULL on new column | Breaks on INSERT | Add nullable, backfill, add constraint |
| Data migration in DDL transaction | Long-running transaction locks | Use `disable_ddl_transaction!` |
| Renaming in one step | Old code uses old name | Multi-step rename |
| Large batch updates | Database overload | Use `in_batches` with throttling |

## Verification Steps

Before marking migration complete:

1. Run `rails db:migrate` in development
2. Verify `rails db:rollback` works
3. Check schema.rb changes are minimal and expected
4. Test with both old and new application code if possible
5. Review strong_migrations warnings
6. Consider impact on multi-tenant queries

## References

Detailed patterns and examples:
- `references/patterns.md` - Complete safe migration patterns
- `references/rollback.md` - Rollback strategies and reversibility

## When to Break Rules

Use `safety_assured` when strong_migrations is overly cautious:

```ruby
class AddIndexToSmallTable < ActiveRecord::Migration[8.1]
  def change
    safety_assured { add_index :settings, :key }
  end
end
# OK for small tables (<10k rows) that lock briefly
```

Document why in migration comment.
