# Policy Patterns

## ApplicationPolicy Base Class

The foundation for all policies, providing organization scoping by default:

```ruby
# app/policies/application_policy.rb
class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    raise Pundit::NotAuthorizedError, "must be logged in" unless user
    @user = user
    @record = record
  end

  # Default deny all actions
  def index?
    false
  end

  def show?
    false
  end

  def create?
    false
  end

  def new?
    create?
  end

  def update?
    false
  end

  def edit?
    update?
  end

  def destroy?
    false
  end

  class Scope
    def initialize(user, scope)
      raise Pundit::NotAuthorizedError, "must be logged in" unless user
      @user = user
      @scope = scope
    end

    def resolve
      # Default organization scoping for models with organization_id
      if scope.respond_to?(:where) && scope.column_names.include?("organization_id")
        scope.where(organization: user.organization)
      else
        scope
      end
    end

    private

    attr_reader :user, :scope
  end
end
```

## CRUD Policy Template

Standard policy for a resource with full CRUD operations:

```ruby
# app/policies/post_policy.rb
class PostPolicy < ApplicationPolicy
  # Anyone in the organization can list posts
  def index?
    true
  end

  # Anyone in the organization can view posts
  def show?
    true
  end

  # Only admins and managers can create posts
  def create?
    user.admin? || user.manager?
  end

  # Admins and the post author can update
  def update?
    user.admin? || record.author == user
  end

  # Admins and the post author can delete
  def destroy?
    user.admin? || record.author == user
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      # Filter to user's organization
      scope.where(organization: user.organization)
    end
  end
end
```

## Role-Based Policy

Policy with distinct permissions per role:

```ruby
# app/policies/invoice_policy.rb
class InvoicePolicy < ApplicationPolicy
  def index?
    # All roles can view invoices
    true
  end

  def show?
    true
  end

  def create?
    # Only admins and managers can create invoices
    user.admin? || user.manager?
  end

  def update?
    # Only admins can update invoices, and only if not finalized
    user.admin? && !record.finalized?
  end

  def destroy?
    # Only admins can delete, and only drafts
    user.admin? && record.draft?
  end

  def finalize?
    # Only admins and managers can finalize
    (user.admin? || user.manager?) && record.draft?
  end

  def send_to_customer?
    user.admin? || user.manager?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      case
      when user.admin?, user.manager?
        # Admins and managers see all org invoices
        scope.where(organization: user.organization)
      when user.viewer?
        # Viewers only see finalized invoices
        scope.where(organization: user.organization, status: :finalized)
      else
        scope.none
      end
    end
  end
end
```

## Owner-Based Policy

Allow owners to manage their own resources:

```ruby
# app/policies/timesheet_policy.rb
class TimesheetPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    # Admins, managers, or the timesheet owner
    user.admin? || user.manager? || record.user == user
  end

  def create?
    true  # Anyone can create their own timesheet
  end

  def update?
    # Only the owner can update, unless admin
    user.admin? || (record.user == user && !record.submitted?)
  end

  def destroy?
    # Only the owner can delete drafts
    record.user == user && record.draft?
  end

  def submit?
    record.user == user && record.draft?
  end

  def approve?
    user.manager? || user.admin?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      case
      when user.admin?, user.manager?
        # Admins/managers see all org timesheets
        scope.where(organization: user.organization)
      else
        # Regular users see only their own
        scope.where(organization: user.organization, user: user)
      end
    end
  end
end
```

## Nested Resource Policy

Policy for resources nested under a parent:

```ruby
# app/policies/comment_policy.rb
class CommentPolicy < ApplicationPolicy
  def index?
    # Can view comments if can view the parent post
    PostPolicy.new(user, record.post).show?
  end

  def show?
    PostPolicy.new(user, record.post).show?
  end

  def create?
    # Can comment if can view the post
    PostPolicy.new(user, record.post).show?
  end

  def update?
    # Only the comment author or admins
    user.admin? || record.author == user
  end

  def destroy?
    # Admins, post author, or comment author
    user.admin? || record.post.author == user || record.author == user
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      # Comments belong to posts, which belong to organizations
      scope.joins(:post).where(posts: { organization: user.organization })
    end
  end
end
```

## Headless Policy

Policy for actions not tied to a specific model instance:

```ruby
# app/policies/dashboard_policy.rb
class DashboardPolicy < ApplicationPolicy
  def show?
    # All authenticated users can view dashboard
    true
  end

  def admin?
    user.admin?
  end

  def manager?
    user.admin? || user.manager?
  end
end

# In controller
def show
  authorize :dashboard, :show?
  # ...
end
```

## STI Model Policy

Policy for Single Table Inheritance models:

```ruby
# app/policies/document_policy.rb
class DocumentPolicy < ApplicationPolicy
  def show?
    true
  end

  def create?
    user.admin? || user.manager?
  end

  def update?
    user.admin? || record.owner == user
  end

  def destroy?
    user.admin?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.where(organization: user.organization)
    end
  end
end

# Subclass policies inherit from parent
# app/policies/contract_policy.rb
class ContractPolicy < DocumentPolicy
  def sign?
    (user.admin? || record.owner == user) && record.unsigned?
  end
end

# app/policies/report_policy.rb
class ReportPolicy < DocumentPolicy
  def publish?
    user.admin? || record.author == user
  end
end
```

## Policy with Custom Methods

Add custom authorization methods beyond CRUD:

```ruby
# app/policies/project_policy.rb
class ProjectPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    true
  end

  def create?
    user.admin? || user.manager?
  end

  def update?
    user.admin? || record.project_manager == user
  end

  def destroy?
    user.admin?
  end

  # Custom methods
  def archive?
    (user.admin? || record.project_manager == user) && record.active?
  end

  def assign_members?
    user.admin? || record.project_manager == user
  end

  def view_budget?
    user.admin? || user.manager? || record.project_manager == user
  end

  def export_data?
    user.admin? || record.project_manager == user
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      case
      when user.admin?
        scope.where(organization: user.organization)
      when user.manager?
        scope.where(organization: user.organization)
      else
        # Regular users see projects they're assigned to
        scope.where(organization: user.organization)
          .joins(:project_members)
          .where(project_members: { user: user })
      end
    end
  end
end
```

## Conditional Scoping

Different scopes based on context:

```ruby
# app/policies/task_policy.rb
class TaskPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    true
  end

  def create?
    true
  end

  def update?
    user.admin? || record.assigned_to == user || record.created_by == user
  end

  def destroy?
    user.admin? || record.created_by == user
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.where(organization: user.organization)
    end

    # Custom scope methods
    def assigned_to_me
      resolve.where(assigned_to: user)
    end

    def created_by_me
      resolve.where(created_by: user)
    end

    def unassigned
      resolve.where(assigned_to: nil)
    end
  end
end

# In controller
def index
  @scope = policy_scope(Task)

  @tasks = case params[:filter]
  when "assigned"
    @scope.assigned_to_me
  when "created"
    @scope.created_by_me
  when "unassigned"
    @scope.unassigned
  else
    @scope
  end
end
```

## Policy Helpers

Extract common authorization logic:

```ruby
# app/policies/application_policy.rb
class ApplicationPolicy
  # ... existing code ...

  private

  def admin_or_owner?
    user.admin? || record.try(:owner) == user
  end

  def admin_or_manager?
    user.admin? || user.manager?
  end

  def in_same_organization?
    record.organization_id == user.organization_id
  end
end

# Use in specific policies
class PostPolicy < ApplicationPolicy
  def update?
    admin_or_owner?
  end

  def destroy?
    admin_or_owner?
  end
end
```

## Policy Namespacing

For namespaced models:

```ruby
# app/policies/admin/setting_policy.rb
module Admin
  class SettingPolicy < ApplicationPolicy
    def index?
      user.admin?
    end

    def show?
      user.admin?
    end

    def create?
      user.admin?
    end

    def update?
      user.admin?
    end

    def destroy?
      user.admin?
    end

    class Scope < ApplicationPolicy::Scope
      def resolve
        if user.admin?
          scope.where(organization: user.organization)
        else
          scope.none
        end
      end
    end
  end
end
```
