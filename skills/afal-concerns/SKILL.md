---
name: afal-concerns
description: This skill should be used when the user asks to add a concern, create a concern, add organization scoping, make a model auditable, add evidence support, extract shared behavior to a concern, implement model concerns, use OwnedByOrganization, use Auditable, use Evidenceable, or work with Rails concerns in AFAL applications.
---

# AFAL Model Concerns

Provide guidance on using and creating ActiveSupport::Concerns for shared model behavior in AFAL Rails applications.

## Philosophy

AFAL Rails applications follow the DHH/Rails Way: **business logic lives in models and concerns**, not service objects or interactors. Concerns are the primary mechanism for sharing behavior across models.

Use concerns to:
- Share common behavior across multiple models (OwnedByOrganization, Auditable)
- Organize model code into logical units (reduce model file size)
- Provide domain-specific behavior (Evidenceable for compliance evidence)

Do NOT use concerns to:
- Hide poor domain modeling (extract domain objects instead)
- Create god objects (keep concerns focused)
- Replace simple inheritance (use STI where appropriate)

## When to Extract to a Concern

Extract behavior to a concern when:
- Multiple models need the same behavior (organization scoping, audit trails)
- A pattern emerges across 2+ models
- The behavior is cohesive and focused

Keep inline when:
- Behavior is model-specific
- Only one model uses it
- It's simpler to understand inline

## Core AFAL Concerns

| Concern | Purpose | When to Use |
|---------|---------|-------------|
| OwnedByOrganization | Multi-tenant organization scoping | Any model that belongs to an organization |
| Auditable | Track who created/updated records | Models needing audit trails for compliance |
| Evidenceable | Attach evidence/documents to records | Compliance entities requiring supporting documents |

See `references/core-concerns.md` for detailed implementation guides.

## Concern Anatomy

Standard AFAL concern structure:

```ruby
# app/models/concerns/example_concern.rb
module ExampleConcern
  extend ActiveSupport::Concern

  included do
    # Runs when concern is included in a model
    # Add validations, callbacks, associations here
    validates :some_field, presence: true
    belongs_to :related_model

    before_save :do_something
  end

  class_methods do
    # Class methods available on the model
    def custom_scope
      where(active: true)
    end
  end

  # Instance methods available on model instances
  def custom_method
    # implementation
  end

  private

  def do_something
    # callback implementation
  end
end
```

**Blocks:**
- `included` - Code runs when concern is included, use for validations/callbacks/associations
- `class_methods` - Define class methods (scopes, finders)
- Regular methods - Instance methods available on the model

## Concern Composition

Include multiple concerns to compose behavior:

```ruby
class Inspection < ApplicationRecord
  include OwnedByOrganization
  include Auditable
  include Evidenceable

  # Model-specific code here
end
```

Concerns are applied in order. Be mindful of:
- Callback execution order (concerns run before model callbacks)
- Method name collisions (later concerns override earlier ones)
- Association name conflicts (use unique names)

## State as Separate Records Pattern

AFAL applications prefer **state as separate records** over boolean flags or status enums:

**Instead of this:**
```ruby
class Task < ApplicationRecord
  # Don't do this
  attribute :is_completed, :boolean
  attribute :status, :string  # 'draft', 'active', 'archived'
end
```

**Do this:**
```ruby
class Task < ApplicationRecord
  has_one :completion, dependent: :destroy
  has_one :archival, dependent: :destroy

  def completed?
    completion.present?
  end

  def complete!(user:)
    create_completion!(completed_by: user)
  end
end

class Completion < ApplicationRecord
  belongs_to :task
  belongs_to :completed_by, class_name: 'User'
end
```

**Benefits:**
- Automatic audit trail (when completed, who completed it)
- Timestamps for state changes
- Can attach additional data to state (reason, notes)
- Can be evidenceable or auditable themselves

See `references/patterns.md` for detailed pattern examples.

## Common Mistakes

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| Putting too much in a concern | Becomes a god object, hard to understand | Keep concerns focused on one behavior |
| Circular dependencies | Model A includes concern that references Model B which includes concern that references Model A | Use composition, extract shared logic |
| Using concerns as service objects | Concerns are for model behavior, not workflows | Use plain Ruby classes for complex workflows |
| Generic concern names | `Activatable`, `Manageable` don't communicate intent | `OwnedByOrganization`, `Evidenceable` are clear |
| Not testing concerns in isolation | Bugs hide until concern is used | Test concerns with shared examples |

## Creating a New Concern

**Checklist:**
1. Identify the shared behavior (what's common across models?)
2. Name it clearly (what does this concern DO?)
3. Create `app/models/concerns/concern_name.rb`
4. Use `ActiveSupport::Concern` structure
5. Add required associations in `included` block
6. Add validations if needed
7. Document database requirements (columns, indexes)
8. Create test coverage (shared examples)
9. Include in target models
10. Verify with integration tests

## References

Detailed implementation guides in `references/`:
- `core-concerns.md` - Full documentation of OwnedByOrganization, Auditable, Evidenceable
- `patterns.md` - Concern development patterns, testing, composition, state as records

## Integration with AFAL Stack

**Pundit Integration:**
- OwnedByOrganization works with Pundit policy scopes
- Auditable provides audit trail for authorization decisions
- Use `Current.organization` and `Current.user` for automatic assignment

**Testing:**
- Use Minitest shared modules for concern tests
- Test concerns in isolation with minimal test models
- Use fixtures for concern-related associations

**Database:**
- All concerns requiring columns should document migrations
- Always add indexes for foreign keys (organization_id, created_by_id)
- Use `add_reference` in migrations for automatic index creation
