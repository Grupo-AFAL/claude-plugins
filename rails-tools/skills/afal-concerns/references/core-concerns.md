# Core AFAL Concerns

Detailed documentation of the standard concerns used across AFAL Rails applications.

## OwnedByOrganization

Multi-tenant organization scoping for models that belong to a single organization.

### Purpose

Ensures records are scoped to an organization in multi-tenant AFAL applications. Provides automatic assignment and query scoping to prevent cross-organization data leaks.

### Implementation

```ruby
# app/models/concerns/owned_by_organization.rb
module OwnedByOrganization
  extend ActiveSupport::Concern

  included do
    belongs_to :organization, optional: false
    validates :organization, presence: true

    # Automatically assign organization from Current.organization
    before_validation :set_organization, on: :create
  end

  class_methods do
    # Scope to current organization
    def for_organization(organization)
      where(organization: organization)
    end
  end

  private

  def set_organization
    self.organization ||= Current.organization if Current.respond_to?(:organization)
  end
end
```

### Database Requirements

Add organization_id to the model:

```ruby
class AddOrganizationToInspections < ActiveRecord::Migration[8.1]
  def change
    add_reference :inspections, :organization, null: false, foreign_key: true, index: true
  end
end
```

### Pundit Integration

OwnedByOrganization works with Pundit policy scopes:

```ruby
class InspectionPolicy < ApplicationPolicy
  class Scope < Scope
    def resolve
      # Automatically scoped to user's organization
      scope.for_organization(user.organization)
    end
  end
end
```

### Usage in Models

```ruby
class Inspection < ApplicationRecord
  include OwnedByOrganization

  # Organization is automatically assigned on create
  # Organization validation is enforced
end

# In controller:
Current.organization = current_user.organization
inspection = Inspection.create(name: "Safety Check")
inspection.organization # => current_user.organization
```

### Key Behaviors

- **Automatic assignment**: Organization set from `Current.organization` on create
- **Validation**: Organization presence validated
- **Association**: `belongs_to :organization` required
- **Scoping helper**: `.for_organization(org)` class method

### Common Patterns

**Global scoping** (use with caution):

```ruby
# If you need ALL queries scoped by default
included do
  default_scope { for_organization(Current.organization) if Current.organization }
end
```

**Warning**: Default scopes can cause issues. Prefer explicit scoping in Pundit policies.

## Auditable

Track who created and updated records for compliance and audit trails.

### Purpose

Automatically record which user created and last updated a record. Essential for compliance applications where audit trails are required.

### Implementation

```ruby
# app/models/concerns/auditable.rb
module Auditable
  extend ActiveSupport::Concern

  included do
    belongs_to :created_by, class_name: 'User', optional: true
    belongs_to :updated_by, class_name: 'User', optional: true

    before_validation :set_created_by, on: :create
    before_save :set_updated_by
  end

  private

  def set_created_by
    self.created_by ||= Current.user if Current.respond_to?(:user)
  end

  def set_updated_by
    self.updated_by = Current.user if Current.respond_to?(:user) && Current.user
  end
end
```

### Database Requirements

Add created_by_id and updated_by_id columns:

```ruby
class AddAuditFieldsToInspections < ActiveRecord::Migration[8.1]
  def change
    add_reference :inspections, :created_by, foreign_key: { to_table: :users }, index: true
    add_reference :inspections, :updated_by, foreign_key: { to_table: :users }, index: true
  end
end
```

### Usage in Models

```ruby
class Inspection < ApplicationRecord
  include Auditable

  # created_by and updated_by are automatically set
end

# In controller:
Current.user = current_user
inspection = Inspection.create(name: "Safety Check")
inspection.created_by # => current_user
inspection.updated_by # => current_user

inspection.update(name: "Updated Safety Check")
inspection.updated_by # => current_user
```

### Key Behaviors

- **Created by**: Set once on create from `Current.user`
- **Updated by**: Set on every save from `Current.user`
- **Optional**: Created/updated by can be nil (system actions)
- **Associations**: Full User objects available via `created_by` and `updated_by`

### Display in Views

```erb
<div class="audit-info">
  <p>Created by <%= inspection.created_by&.name %> on <%= l(inspection.created_at) %></p>
  <p>Last updated by <%= inspection.updated_by&.name %> on <%= l(inspection.updated_at) %></p>
</div>
```

### Testing Considerations

Set `Current.user` in test setup:

```ruby
setup do
  @user = users(:admin)
  Current.user = @user
end

test "records who created the inspection" do
  inspection = Inspection.create(name: "Test")
  assert_equal @user, inspection.created_by
end
```

## Evidenceable

Attach evidence and supporting documents to compliance records.

### Purpose

Allows models to have evidence documents attached. Used in compliance applications where records need supporting documentation (photos, PDFs, certificates, etc.).

### Implementation

```ruby
# app/models/concerns/evidenceable.rb
module Evidenceable
  extend ActiveSupport::Concern

  included do
    has_many :evidences, as: :evidenceable, dependent: :destroy
    has_many :evidence_files, through: :evidences, source: :file_attachment
  end

  def add_evidence(file:, description: nil, user:)
    evidences.create!(
      file: file,
      description: description,
      uploaded_by: user
    )
  end

  def has_evidence?
    evidences.any?
  end
end
```

### Evidence Model

```ruby
# app/models/evidence.rb
class Evidence < ApplicationRecord
  include Auditable

  belongs_to :evidenceable, polymorphic: true
  belongs_to :uploaded_by, class_name: 'User'

  has_one_attached :file

  validates :file, presence: true
  validates :evidenceable, presence: true
end
```

### Database Requirements

```ruby
class CreateEvidences < ActiveRecord::Migration[8.1]
  def change
    create_table :evidences do |t|
      t.references :evidenceable, polymorphic: true, null: false, index: true
      t.references :uploaded_by, null: false, foreign_key: { to_table: :users }
      t.text :description
      t.timestamps
    end
  end
end
```

Active Storage is required for file attachments (Rails 8.1 default).

### Usage in Models

```ruby
class Inspection < ApplicationRecord
  include Evidenceable

  # Can now attach evidence
end

# In controller or service:
inspection.add_evidence(
  file: params[:file],
  description: "Photo of safety hazard",
  user: current_user
)

# Check for evidence:
if inspection.has_evidence?
  # Show evidence section
end
```

### Display in Views

```erb
<div class="evidence-section">
  <h3>Evidence (<%= inspection.evidences.count %>)</h3>

  <% inspection.evidences.each do |evidence| %>
    <div class="evidence-item">
      <%= link_to evidence.file.filename, rails_blob_path(evidence.file, disposition: "attachment") %>
      <p><%= evidence.description %></p>
      <small>Uploaded by <%= evidence.uploaded_by.name %> on <%= l(evidence.created_at) %></small>
    </div>
  <% end %>
</div>
```

### File Upload Form

```erb
<%= form_with model: @inspection do |f| %>
  <%= f.label :evidence_file, "Attach Evidence" %>
  <%= f.file_field :evidence_file %>
  <%= f.text_area :evidence_description, placeholder: "Describe this evidence..." %>
  <%= f.submit "Upload Evidence" %>
<% end %>
```

### Controller Handling

```ruby
class InspectionsController < ApplicationController
  def update
    if params[:inspection][:evidence_file].present?
      @inspection.add_evidence(
        file: params[:inspection][:evidence_file],
        description: params[:inspection][:evidence_description],
        user: current_user
      )
    end

    # Continue with normal update...
  end
end
```

### Key Behaviors

- **Polymorphic**: Evidence can be attached to any model
- **Multiple files**: Each evidence is one file, but models can have many evidences
- **Audit trail**: Evidence includes who uploaded it and when
- **Description**: Optional text description for each evidence
- **Active Storage**: Uses Rails Active Storage for file handling

### Testing

```ruby
test "can add evidence to inspection" do
  file = fixture_file_upload('test_document.pdf', 'application/pdf')

  assert_difference -> { @inspection.evidences.count }, 1 do
    @inspection.add_evidence(
      file: file,
      description: "Test evidence",
      user: @user
    )
  end

  evidence = @inspection.evidences.last
  assert_equal "Test evidence", evidence.description
  assert_equal @user, evidence.uploaded_by
  assert evidence.file.attached?
end
```

## Combining Concerns

All three concerns work together:

```ruby
class Inspection < ApplicationRecord
  include OwnedByOrganization  # Scoped to organization
  include Auditable            # Track who created/updated
  include Evidenceable         # Attach evidence documents

  # Model-specific code
  validates :name, presence: true

  scope :recent, -> { where('created_at > ?', 30.days.ago) }
end

# Result:
# - Belongs to organization (multi-tenant)
# - Tracks created_by and updated_by
# - Can have evidence attached
# - All automatic, declarative
```

## Migration Example

Complete migration for a new model using all three concerns:

```ruby
class CreateInspections < ActiveRecord::Migration[8.1]
  def change
    create_table :inspections do |t|
      t.string :name, null: false
      t.text :description

      # OwnedByOrganization
      t.references :organization, null: false, foreign_key: true, index: true

      # Auditable
      t.references :created_by, foreign_key: { to_table: :users }, index: true
      t.references :updated_by, foreign_key: { to_table: :users }, index: true

      # Evidenceable uses polymorphic evidences table (already exists)

      t.timestamps
    end
  end
end
```
