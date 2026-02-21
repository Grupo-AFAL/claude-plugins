# Concern Development Patterns

Practical patterns and best practices for developing concerns in AFAL Rails applications.

## File Structure and Naming

### Location

All concerns live in `app/models/concerns/`:

```
app/
  models/
    concerns/
      owned_by_organization.rb
      auditable.rb
      evidenceable.rb
      custom_concern.rb
```

### Naming Conventions

**File name**: Snake case, descriptive of behavior
- `owned_by_organization.rb` (what it does)
- `evidenceable.rb` (capability it provides)
- `auditable.rb` (behavior it enables)

**Module name**: CamelCase, matches file name
- `OwnedByOrganization`
- `Evidenceable`
- `Auditable`

**Prefer adjectives or descriptive phrases**:
- Good: `Evidenceable`, `Auditable`, `OwnedByOrganization`
- Bad: `Evidence`, `Audit`, `Organization` (nouns are confusing)

## ActiveSupport::Concern Anatomy

### Basic Structure

```ruby
module MyConcern
  extend ActiveSupport::Concern

  # Code in this block runs when concern is included
  included do
    # Add validations, callbacks, associations
  end

  # Class methods added to the model class
  class_methods do
    # Scopes, finders, factory methods
  end

  # Instance methods added to model instances
  def instance_method
    # implementation
  end

  # Private instance methods
  private

  def private_helper
    # implementation
  end
end
```

### The included Block

Use `included` for code that should run when the concern is included:

```ruby
included do
  # Associations
  belongs_to :organization
  has_many :items

  # Validations
  validates :name, presence: true
  validates :status, inclusion: { in: %w[active inactive] }

  # Callbacks
  before_save :normalize_data
  after_create :send_notification

  # Scopes (alternative to class_methods)
  scope :active, -> { where(active: true) }
end
```

### Class Methods

Define class-level methods (scopes, finders, factories):

```ruby
class_methods do
  def active
    where(active: true)
  end

  def find_or_create_for_organization(organization)
    find_or_create_by(organization: organization)
  end

  def recent(days = 30)
    where('created_at > ?', days.days.ago)
  end
end
```

### Instance Methods

Regular methods become instance methods:

```ruby
def activate!
  update!(active: true)
  notify_activation
end

def formatted_name
  "#{name} (#{organization.name})"
end

private

def notify_activation
  # Send notification
end
```

## Adding Validations via Concerns

Validations in `included` block:

```ruby
module Validatable
  extend ActiveSupport::Concern

  included do
    validates :name, presence: true, length: { minimum: 3 }
    validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, if: :email_required?

    validate :custom_validation
  end

  private

  def email_required?
    # Custom logic
    true
  end

  def custom_validation
    errors.add(:base, "Custom error") if some_condition
  end
end
```

## Adding Scopes via Concerns

Two approaches for adding scopes:

**Approach 1: Inside included block (preferred)**

```ruby
included do
  scope :active, -> { where(active: true) }
  scope :for_user, ->(user) { where(user: user) }
  scope :recent, -> { where('created_at > ?', 30.days.ago) }
end
```

**Approach 2: As class methods**

```ruby
class_methods do
  def active
    where(active: true)
  end

  def for_user(user)
    where(user: user)
  end
end
```

Both work identically. Use `scope` in `included` for consistency with Rails conventions.

## Adding Associations via Concerns

Always add associations in `included` block:

```ruby
module Evidenceable
  extend ActiveSupport::Concern

  included do
    has_many :evidences, as: :evidenceable, dependent: :destroy
    has_many :evidence_files, through: :evidences, source: :file_attachment
  end
end
```

**Polymorphic associations** work well in concerns:

```ruby
module Commentable
  extend ActiveSupport::Concern

  included do
    has_many :comments, as: :commentable, dependent: :destroy
  end

  def add_comment(text:, user:)
    comments.create!(text: text, user: user)
  end
end
```

## Adding Callbacks via Concerns

Callbacks in `included` block:

```ruby
module Timestampable
  extend ActiveSupport::Concern

  included do
    before_save :update_timestamp
    after_create :notify_creation
    before_destroy :cleanup_related_data
  end

  private

  def update_timestamp
    self.processed_at = Time.current if some_condition
  end

  def notify_creation
    # Send notification
  end

  def cleanup_related_data
    # Clean up before destroy
  end
end
```

**Callback execution order**:
1. Concerns (in order included)
2. Model callbacks
3. Superclass callbacks

## State as Separate Records Pattern

Instead of boolean flags or status enums, use separate state records.

### Anti-Pattern: Boolean Flags

```ruby
# Don't do this
class Task < ApplicationRecord
  attribute :is_completed, :boolean
  attribute :is_approved, :boolean
  attribute :is_archived, :boolean
end

# Problems:
# - No audit trail (when did it complete?)
# - No attribution (who completed it?)
# - No additional context (why archived?)
```

### Pattern: State Records

```ruby
# Do this
class Task < ApplicationRecord
  has_one :completion, dependent: :destroy
  has_one :approval, dependent: :destroy
  has_one :archival, dependent: :destroy

  def completed?
    completion.present?
  end

  def complete!(user:, notes: nil)
    create_completion!(completed_by: user, notes: notes)
  end

  def uncomplete!
    completion&.destroy
  end
end

class Completion < ApplicationRecord
  belongs_to :task
  belongs_to :completed_by, class_name: 'User'

  validates :task, presence: true
  validates :completed_by, presence: true
end
```

### Benefits

1. **Automatic timestamps**: `completed_at` is just `completion.created_at`
2. **Attribution**: Who performed the action via `completed_by`
3. **Additional data**: Notes, reasons, etc. on state record
4. **Audit trail**: State changes are records in the database
5. **Reversible**: Destroy state record to reverse action

### Migration

```ruby
class CreateCompletions < ActiveRecord::Migration[8.1]
  def change
    create_table :completions do |t|
      t.references :task, null: false, foreign_key: true, index: { unique: true }
      t.references :completed_by, null: false, foreign_key: { to_table: :users }
      t.text :notes
      t.timestamps
    end
  end
end
```

Note `unique: true` on task_id index ensures one completion per task.

### Concern for State Pattern

Extract to concern for reusability:

```ruby
module Completable
  extend ActiveSupport::Concern

  included do
    has_one :completion, as: :completable, dependent: :destroy
  end

  def completed?
    completion.present?
  end

  def complete!(user:, notes: nil)
    create_completion!(completed_by: user, notes: notes)
  end

  def uncomplete!
    completion&.destroy
  end

  def completed_at
    completion&.created_at
  end

  def completed_by
    completion&.completed_by
  end
end

# Polymorphic Completion model
class Completion < ApplicationRecord
  belongs_to :completable, polymorphic: true
  belongs_to :completed_by, class_name: 'User'
end
```

Now any model can be completable:

```ruby
class Task < ApplicationRecord
  include Completable
end

class Inspection < ApplicationRecord
  include Completable
end
```

## Testing Concerns in Isolation

### Shared Test Module

```ruby
# test/models/concerns/auditable_test.rb
require 'test_helper'

class AuditableTest < ActiveSupport::TestCase
  # Create a minimal test model
  class TestModel < ApplicationRecord
    self.table_name = 'tasks'  # Use existing table
    include Auditable
  end

  setup do
    @user = users(:admin)
    Current.user = @user
    @model = TestModel.new(name: "Test")
  end

  test "sets created_by on create" do
    @model.save!
    assert_equal @user, @model.created_by
  end

  test "sets updated_by on update" do
    @model.save!

    other_user = users(:regular)
    Current.user = other_user

    @model.update!(name: "Updated")
    assert_equal other_user, @model.updated_by
  end

  test "created_by does not change on update" do
    @model.save!
    original_creator = @model.created_by

    Current.user = users(:regular)
    @model.update!(name: "Updated")

    assert_equal original_creator, @model.created_by
  end
end
```

### Shared Examples Pattern

For testing concerns across multiple models:

```ruby
# test/support/concerns/auditable_examples.rb
module AuditableExamples
  extend ActiveSupport::Concern

  included do
    test "records who created the record" do
      assert_equal @user, @record.created_by
    end

    test "records who updated the record" do
      @record.update!(name: "Updated")
      assert_equal @user, @record.updated_by
    end
  end
end

# test/models/inspection_test.rb
class InspectionTest < ActiveSupport::TestCase
  include AuditableExamples

  setup do
    @user = users(:admin)
    Current.user = @user
    @record = Inspection.create!(name: "Test")
  end

  # Inspection-specific tests...
end
```

## Creating a New Concern Checklist

1. **Identify shared behavior**: What's common across 2+ models?
2. **Name clearly**: What does this concern DO? Use adjectives.
3. **Create file**: `app/models/concerns/concern_name.rb`
4. **Use ActiveSupport::Concern**: Structure with `included`, `class_methods`
5. **Add associations**: In `included` block
6. **Add validations**: In `included` block if applicable
7. **Document database requirements**: What columns/tables are needed?
8. **Write tests**: Test in isolation with minimal test model
9. **Create migration**: For any required columns
10. **Include in target models**: Add `include ConcernName`
11. **Integration test**: Verify behavior in actual models
12. **Document**: Add to AFAL concerns documentation

## Concern Composition

### Multiple Concerns on One Model

```ruby
class Inspection < ApplicationRecord
  include OwnedByOrganization
  include Auditable
  include Evidenceable
  include Completable

  # Gains:
  # - belongs_to :organization (OwnedByOrganization)
  # - created_by, updated_by (Auditable)
  # - evidences association (Evidenceable)
  # - completion association (Completable)
end
```

### Execution Order

Concerns are applied in order:

1. First concern's `included` block runs
2. Second concern's `included` block runs
3. Model's own code runs

**Callbacks execute in order**:

```ruby
# If both concerns define before_save:
include ConcernA  # before_save :concern_a_callback
include ConcernB  # before_save :concern_b_callback

# On save:
# 1. concern_a_callback runs
# 2. concern_b_callback runs
# 3. model's before_save runs
```

### Method Override

Later code overrides earlier code:

```ruby
module ConcernA
  def name
    "From Concern A"
  end
end

module ConcernB
  def name
    "From Concern B"
  end
end

class Model
  include ConcernA
  include ConcernB  # Overrides ConcernA's name method

  def name
    super + " and Model"  # Can call super to chain
  end
end

Model.new.name  # => "From Concern B and Model"
```

## Avoiding Common Pitfalls

### Pitfall 1: Method Name Collisions

**Problem**: Two concerns define the same method

```ruby
module Activatable
  def activate!
    update!(active: true)
  end
end

module Publishable
  def activate!  # Collision!
    update!(published: true)
  end
end
```

**Solution**: Use specific names

```ruby
module Activatable
  def mark_active!
    update!(active: true)
  end
end

module Publishable
  def publish!
    update!(published: true)
  end
end
```

### Pitfall 2: Callback Order Issues

**Problem**: Callbacks run in unexpected order

```ruby
module ConcernA
  included do
    before_save :set_defaults
  end
end

class Model
  include ConcernA

  before_save :validate_data  # Runs AFTER set_defaults
end
```

**Solution**: Use explicit ordering or prepend

```ruby
included do
  before_save :set_defaults, prepend: true  # Run first
end
```

### Pitfall 3: Too Much in One Concern

**Problem**: Concern becomes a god object

```ruby
module Inspectionable
  # 500 lines of code
  # Handles scheduling, completion, evidence, notifications, reporting...
  # Hard to understand, test, reuse
end
```

**Solution**: Split into focused concerns

```ruby
include Schedulable      # Scheduling logic
include Completable      # Completion logic
include Evidenceable     # Evidence logic
include Notifiable       # Notification logic
```

### Pitfall 4: Concern vs Module Confusion

**Problem**: Using plain module instead of concern

```ruby
# Don't do this
module MyModule
  def self.included(base)
    base.belongs_to :organization
  end
end
```

**Solution**: Use ActiveSupport::Concern

```ruby
module MyModule
  extend ActiveSupport::Concern

  included do
    belongs_to :organization
  end
end
```

### Pitfall 5: Circular Dependencies

**Problem**: Concerns reference each other

```ruby
module ConcernA
  included do
    has_many :bs
  end
end

module ConcernB
  included do
    belongs_to :a  # Assumes A exists
  end
end
```

**Solution**: Extract shared logic, use composition

```ruby
# If A and B both need organization:
class A
  include OwnedByOrganization
end

class B
  include OwnedByOrganization
end
```

## Performance Considerations

### Eager Loading Associations from Concerns

```ruby
# In controller:
@inspections = Inspection.includes(:organization, :created_by, :updated_by, :evidences)

# Loads all concern associations in one query
```

### Indexing Columns from Concerns

Always add indexes for foreign keys added by concerns:

```ruby
class AddOrganizationToInspections < ActiveRecord::Migration[8.1]
  def change
    # Good: Includes index
    add_reference :inspections, :organization, null: false, foreign_key: true, index: true

    # Also good: Explicit index
    add_column :inspections, :organization_id, :bigint, null: false
    add_foreign_key :inspections, :organizations
    add_index :inspections, :organization_id
  end
end
```

### Counter Caches

If a concern adds a has_many that's frequently counted:

```ruby
module Evidenceable
  included do
    has_many :evidences, as: :evidenceable, dependent: :destroy
  end

  def evidence_count
    evidences.count  # Can be slow
  end
end

# Better: Add counter cache
class Evidence < ApplicationRecord
  belongs_to :evidenceable, polymorphic: true, counter_cache: :evidences_count
end

# Migration:
add_column :inspections, :evidences_count, :integer, default: 0, null: false
```

## Documentation Standards

Document concerns with:

1. **Purpose**: What behavior does this provide?
2. **Database requirements**: Columns, indexes, tables needed
3. **Usage example**: How to include and use it
4. **Integration notes**: How it works with other concerns
5. **Testing approach**: How to test models that include it

```ruby
# app/models/concerns/evidenceable.rb

# Evidenceable
#
# Provides evidence attachment capability to models. Allows attaching
# supporting documents (photos, PDFs, etc.) to compliance records.
#
# Database Requirements:
#   - evidences table with polymorphic evidenceable_id/evidenceable_type
#   - Active Storage configured for file attachments
#
# Usage:
#   class Inspection < ApplicationRecord
#     include Evidenceable
#   end
#
#   inspection.add_evidence(file: params[:file], user: current_user)
#
# Testing:
#   Use fixture_file_upload in tests to simulate file uploads

module Evidenceable
  extend ActiveSupport::Concern

  # implementation...
end
```
