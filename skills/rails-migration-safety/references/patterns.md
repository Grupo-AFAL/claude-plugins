# Detailed Safe Migration Patterns

## Adding Columns

### Nullable Columns

Always safe in a single deploy:

```ruby
class AddDescriptionToProjects < ActiveRecord::Migration[8.1]
  def change
    add_column :projects, :description, :text
    add_column :projects, :metadata, :jsonb, default: {}
  end
end
```

The application can immediately read these columns (will be NULL). Writing happens when code is updated.

### NOT NULL Columns (Three-Deploy Process)

**Deploy 1: Add nullable column**
```ruby
class AddEmailToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :email, :string
  end
end
```

**Deploy 2: Backfill data**
```ruby
class BackfillUserEmails < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    # Option 1: Simple backfill
    User.where(email: nil).in_batches(of: 1000) do |batch|
      batch.update_all("email = CONCAT(username, '@example.com')")
      sleep 0.01
    end

    # Option 2: From related table
    User.where(email: nil).includes(:profile).find_each do |user|
      user.update_column(:email, user.profile.email) if user.profile
    end
  end

  def down
    # Usually just leave data
  end
end
```

**Deploy 3: Add NOT NULL constraint**
```ruby
class AddNotNullConstraintToUserEmail < ActiveRecord::Migration[8.1]
  def change
    change_column_null :users, :email, false
  end
end
```

Verify all rows have data before this deploy:
```ruby
# In rails console
User.where(email: nil).count  # Must be 0
```

### Columns with Defaults

Rails 8 handles this efficiently:

```ruby
class AddStatusToOrders < ActiveRecord::Migration[8.1]
  def change
    add_column :orders, :status, :string, default: 'pending', null: false
  end
end
```

PostgreSQL 11+ uses efficient default value storage. For older versions or large tables, use three-step process:

```ruby
# Step 1: Add nullable with default
class AddStatusToOrders < ActiveRecord::Migration[8.1]
  def change
    add_column :orders, :status, :string, default: 'pending'
  end
end

# Step 2: Backfill existing rows
class BackfillOrderStatus < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    Order.where(status: nil).in_batches.update_all(status: 'pending')
  end
end

# Step 3: Add NOT NULL
class AddNotNullToOrderStatus < ActiveRecord::Migration[8.1]
  def change
    change_column_null :orders, :status, false
  end
end
```

### Columns on Large Tables

For tables with millions of rows, consider:

```ruby
class AddIndexedTimestampToEvents < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    # Add column
    add_column :events, :processed_at, :timestamp

    # Add index concurrently in same migration
    add_index :events, :processed_at,
              where: 'processed_at IS NOT NULL',
              algorithm: :concurrently
  end
end
```

Partial indexes reduce overhead on sparse columns.

## Removing Columns

### Two-Deploy Process

**Deploy 1: Ignore column in application**

```ruby
# app/models/user.rb
class User < ApplicationRecord
  self.ignored_columns += [:deprecated_field]
end

# app/models/project.rb
class Project < ApplicationRecord
  self.ignored_columns = %w[old_status legacy_id]
end
```

Deploy and verify application works without column.

**Deploy 2: Remove column from database**

```ruby
class RemoveDeprecatedFieldFromUsers < ActiveRecord::Migration[8.1]
  def change
    remove_column :users, :deprecated_field, :string
  end
end

# Also remove from ignored_columns in model after deploy
```

### Removing Multiple Columns

```ruby
class RemoveLegacyColumnsFromProjects < ActiveRecord::Migration[8.1]
  def change
    # Include type for better rollback
    remove_column :projects, :old_status, :string
    remove_column :projects, :legacy_id, :integer
    remove_column :projects, :deprecated_flag, :boolean, default: false
  end
end
```

Always include type and options for reversibility.

## Renaming Columns

Four-deploy process (never rename directly):

**Deploy 1: Add new column**
```ruby
class AddEmailToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :email, :string
  end
end
```

**Deploy 2: Dual-write to both columns**
```ruby
# app/models/user.rb
class User < ApplicationRecord
  before_save :sync_email_columns

  private

  def sync_email_columns
    self.email = email_address if email_address_changed?
    self.email_address = email if email_changed?
  end
end
```

**Deploy 3: Backfill and switch reads**
```ruby
# Migration to backfill
class BackfillUserEmail < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    User.where(email: nil).in_batches do |batch|
      batch.update_all('email = email_address')
    end
  end
end

# Update application to read from new column
class User < ApplicationRecord
  alias_attribute :email_address, :email  # Temporary compatibility

  before_save :sync_email_columns  # Keep dual-write
end
```

**Deploy 4: Remove old column**
```ruby
# Remove dual-write logic from model
class User < ApplicationRecord
  # Remove alias_attribute and before_save
end

# Remove old column
class RemoveEmailAddressFromUsers < ActiveRecord::Migration[8.1]
  def change
    remove_column :users, :email_address, :string
  end
end
```

## Renaming Tables

Use database views for compatibility:

**Deploy 1: Create view**
```ruby
class CreateProjectsView < ActiveRecord::Migration[8.1]
  def up
    execute <<-SQL
      CREATE VIEW new_projects AS SELECT * FROM projects;
    SQL
  end

  def down
    execute "DROP VIEW IF EXISTS new_projects;"
  end
end
```

**Deploy 2: Update application to use new name**
```ruby
# Change model table_name
class Project < ApplicationRecord
  # Was implicitly 'projects', now:
  self.table_name = 'new_projects'
end
```

**Deploy 3: Rename table, recreate view pointing to new name**
```ruby
class RenameProjectsTable < ActiveRecord::Migration[8.1]
  def up
    rename_table :projects, :new_projects
    execute "DROP VIEW new_projects;"
    execute "CREATE VIEW projects AS SELECT * FROM new_projects;"
  end

  def down
    execute "DROP VIEW projects;"
    rename_table :new_projects, :projects
    execute "CREATE VIEW new_projects AS SELECT * FROM projects;"
  end
end
```

**Deploy 4: Remove view**
```ruby
class RemoveProjectsView < ActiveRecord::Migration[8.1]
  def up
    execute "DROP VIEW projects;"
  end

  def down
    execute "CREATE VIEW projects AS SELECT * FROM new_projects;"
  end
end

# Remove table_name override from model
```

## Indexes

### Concurrent Index Creation

Always use for production tables:

```ruby
class AddIndexToUsersEmail < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_index :users, :email, algorithm: :concurrently
  end
end
```

`disable_ddl_transaction!` is required for concurrent operations.

### Partial Indexes

Efficient for sparse columns:

```ruby
class AddPartialIndexToOrders < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_index :orders, :processed_at,
              where: 'processed_at IS NOT NULL',
              algorithm: :concurrently

    add_index :users, :suspended_at,
              where: 'suspended_at IS NOT NULL',
              name: 'index_suspended_users',
              algorithm: :concurrently
  end
end
```

### Multi-Column Indexes

Order matters for query optimization:

```ruby
class AddCompoundIndexToProjects < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    # organization_id first (for tenant partitioning)
    # status second (common filter)
    # created_at third (for sorting)
    add_index :projects, [:organization_id, :status, :created_at],
              name: 'idx_projects_org_status_created',
              algorithm: :concurrently
  end
end
```

For AFAL multi-tenant apps, always include `organization_id` first.

### Unique Indexes

Add unique constraint safely:

```ruby
class AddUniqueIndexToUserEmails < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    # First ensure data is actually unique
    # Run in console: User.group(:email).having('count(*) > 1').count

    add_index :users, :email,
              unique: true,
              algorithm: :concurrently
  end
end
```

If duplicates exist, clean them first:

```ruby
class RemoveDuplicateEmails < ActiveRecord::Migration[8.1]
  def up
    # Keep newest user for each email
    execute <<-SQL
      DELETE FROM users
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM users
        GROUP BY email
      );
    SQL
  end
end
```

### Removing Indexes

Safe to remove immediately:

```ruby
class RemoveUnusedIndexes < ActiveRecord::Migration[8.1]
  def change
    remove_index :users, :old_field
    remove_index :projects, name: 'idx_temporary'
  end
end
```

## Changing Column Types

Never change type in place. Use new column pattern:

**Deploy 1: Add new column**
```ruby
class AddPriceIntegerToProducts < ActiveRecord::Migration[8.1]
  def change
    add_column :products, :price_cents, :integer
  end
end
```

**Deploy 2: Dual-write and backfill**
```ruby
# Model
class Product < ApplicationRecord
  before_save :sync_price_columns

  def price
    price_cents ? price_cents / 100.0 : read_attribute(:price)
  end

  def price=(value)
    self.price_cents = (value.to_f * 100).round
    write_attribute(:price, value)  # Dual-write
  end

  private

  def sync_price_columns
    if price_cents
      write_attribute(:price, price_cents / 100.0)
    end
  end
end

# Migration
class BackfillPriceCents < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    Product.where(price_cents: nil).in_batches do |batch|
      batch.update_all('price_cents = (price * 100)::integer')
    end
  end
end
```

**Deploy 3: Switch to new column**
```ruby
# Update model to only use price_cents
class Product < ApplicationRecord
  def price
    price_cents / 100.0 if price_cents
  end

  def price=(value)
    self.price_cents = (value.to_f * 100).round
  end
end
```

**Deploy 4: Remove old column**
```ruby
class RemovePriceFromProducts < ActiveRecord::Migration[8.1]
  def change
    remove_column :products, :price, :decimal, precision: 10, scale: 2
  end
end
```

## Data Migrations

### Batch Processing

Always use batching for large datasets:

```ruby
class BackfillUserStatus < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    User.in_batches(of: 1000) do |relation|
      relation.update_all(status: 'active')

      # Throttle to prevent database overload
      sleep 0.01
    end
  end

  def down
    User.in_batches(of: 1000) do |relation|
      relation.update_all(status: nil)
      sleep 0.01
    end
  end
end
```

### Idempotent Data Migrations

Make migrations safe to run multiple times:

```ruby
class PopulateProjectSlugs < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    # Only update rows that need it
    Project.where(slug: nil).find_each do |project|
      project.update_column(:slug, project.name.parameterize)
    end
  end
end
```

### Complex Data Migrations

```ruby
class MigrateUserRoles < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    # Use raw SQL for performance
    execute <<-SQL
      UPDATE users
      SET role = CASE
        WHEN admin = true THEN 'admin'
        WHEN moderator = true THEN 'moderator'
        ELSE 'member'
      END
      WHERE role IS NULL;
    SQL
  end

  def down
    execute <<-SQL
      UPDATE users
      SET admin = (role = 'admin'),
          moderator = (role = 'moderator')
      WHERE role IS NOT NULL;
    SQL
  end
end
```

### Organization-Scoped Data Migrations

For multi-tenant AFAL apps:

```ruby
class BackfillProjectSettings < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    Organization.find_each do |org|
      org.projects.where(settings: nil).in_batches do |batch|
        batch.update_all(settings: org.default_project_settings)
      end
      sleep 0.01
    end
  end
end
```

## Foreign Keys

### Adding Foreign Keys Safely

**Deploy 1: Add column and unvalidated FK**
```ruby
class AddOrganizationIdToProjects < ActiveRecord::Migration[8.1]
  def change
    add_reference :projects, :organization, index: false, foreign_key: false

    add_index :projects, :organization_id, algorithm: :concurrently
    add_foreign_key :projects, :organizations, validate: false
  end
end
```

Note: Need to split index creation:
```ruby
class AddOrganizationIdToProjects < ActiveRecord::Migration[8.1]
  def change
    add_reference :projects, :organization, index: false, foreign_key: false
  end
end

class AddIndexToProjectsOrganizationId < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_index :projects, :organization_id, algorithm: :concurrently
  end
end

class AddForeignKeyToProjectsOrganizationId < ActiveRecord::Migration[8.1]
  def change
    add_foreign_key :projects, :organizations, validate: false
  end
end
```

**Deploy 2: Validate FK**
```ruby
class ValidateOrganizationFkOnProjects < ActiveRecord::Migration[8.1]
  def change
    validate_foreign_key :projects, :organizations
  end
end
```

Validation can take time but doesn't require exclusive lock.

## PostgreSQL-Specific Patterns

### Check Constraints

Similar to foreign keys, add without validation:

```ruby
class AddCheckConstraintToOrders < ActiveRecord::Migration[8.1]
  def up
    execute <<-SQL
      ALTER TABLE orders
      ADD CONSTRAINT check_positive_amount
      CHECK (amount >= 0) NOT VALID;
    SQL
  end

  def down
    execute <<-SQL
      ALTER TABLE orders
      DROP CONSTRAINT check_positive_amount;
    SQL
  end
end

class ValidateOrderAmountConstraint < ActiveRecord::Migration[8.1]
  def up
    execute <<-SQL
      ALTER TABLE orders
      VALIDATE CONSTRAINT check_positive_amount;
    SQL
  end
end
```

### Enum Types

Avoid native PostgreSQL enums (difficult to modify). Use string columns:

```ruby
# Good - flexible
class AddStatusToOrders < ActiveRecord::Migration[8.1]
  def change
    add_column :orders, :status, :string, null: false, default: 'pending'
    add_index :orders, :status
  end
end

# Model
class Order < ApplicationRecord
  enum status: {
    pending: 'pending',
    processing: 'processing',
    shipped: 'shipped',
    delivered: 'delivered'
  }
end
```

If you must use PostgreSQL enums:

```ruby
class CreateStatusEnum < ActiveRecord::Migration[8.1]
  def up
    execute <<-SQL
      CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped');
    SQL
  end

  def down
    execute "DROP TYPE order_status;"
  end
end

# Adding values requires special syntax
class AddDeliveredToOrderStatus < ActiveRecord::Migration[8.1]
  def up
    execute <<-SQL
      ALTER TYPE order_status ADD VALUE 'delivered';
    SQL
  end
end
```

### Advisory Locks

For migrations that should only run once:

```ruby
class OneTimeDataMigration < ActiveRecord::Migration[8.1]
  LOCK_ID = 123456789

  def up
    connection.execute("SELECT pg_advisory_lock(#{LOCK_ID})")

    begin
      # Migration work here
      User.where(migrated: false).find_each do |user|
        # ...
      end
    ensure
      connection.execute("SELECT pg_advisory_unlock(#{LOCK_ID})")
    end
  end
end
```

## Multi-Database Migrations (Solid Queue)

AFAL apps use separate database for Solid Queue. Migrations route automatically:

```ruby
# This migration runs on primary database
class AddFieldToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :field, :string
  end
end

# Solid Queue migrations live in separate path
# db/queue_migrate/
class CustomizeSolidQueue < ActiveRecord::Migration[8.1]
  def change
    # Runs on queue database
    add_column :solid_queue_jobs, :custom_metadata, :jsonb
  end
end
```

Run specific database migrations:
```bash
rails db:migrate                    # Primary
rails db:migrate:queue              # Queue database
rails db:migrate:all                # Both
```
