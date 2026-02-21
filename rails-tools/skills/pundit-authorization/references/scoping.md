# Organization Scoping Patterns

## OwnedByOrganization Concern

The foundation for multi-tenant data isolation in AFAL applications:

```ruby
# app/models/concerns/owned_by_organization.rb
module OwnedByOrganization
  extend ActiveSupport::Concern

  included do
    belongs_to :organization
    validates :organization, presence: true

    # Default scope when in request context (via Current)
    default_scope { where(organization: Current.organization) if Current.organization.present? }
  end

  class_methods do
    # Use to bypass organization scoping when needed
    def unscoped_by_organization
      unscoped
    end

    # Explicit organization scope
    def for_organization(organization)
      unscoped.where(organization: organization)
    end
  end
end
```

Usage in models:

```ruby
class Post < ApplicationRecord
  include OwnedByOrganization

  belongs_to :author, class_name: "User"
  has_many :comments, dependent: :destroy
end
```

## ApplicationPolicy Scope

Default organization scoping in all policies:

```ruby
# app/policies/application_policy.rb
class ApplicationPolicy
  class Scope
    def initialize(user, scope)
      raise Pundit::NotAuthorizedError, "must be logged in" unless user
      @user = user
      @scope = scope
    end

    def resolve
      # Automatically scope to user's organization
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

## Basic Scope Pattern

Simple organization filtering:

```ruby
class PostPolicy < ApplicationPolicy
  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.where(organization: user.organization)
    end
  end
end
```

## Role-Based Scoping

Different data visibility based on user role:

```ruby
class InvoicePolicy < ApplicationPolicy
  class Scope < ApplicationPolicy::Scope
    def resolve
      base_scope = scope.where(organization: user.organization)

      case
      when user.admin?
        # Admins see all invoices
        base_scope
      when user.manager?
        # Managers see all except drafts from other users
        base_scope.where("status != ? OR user_id = ?", "draft", user.id)
      when user.accountant?
        # Accountants see finalized invoices only
        base_scope.where(status: :finalized)
      else
        # Regular users see their own invoices
        base_scope.where(user: user)
      end
    end
  end
end
```

## Owner-Based Scoping

Filter to user's own records:

```ruby
class TimesheetPolicy < ApplicationPolicy
  class Scope < ApplicationPolicy::Scope
    def resolve
      if user.admin? || user.manager?
        # Admins/managers see all timesheets in org
        scope.where(organization: user.organization)
      else
        # Regular users see only their own
        scope.where(organization: user.organization, user: user)
      end
    end
  end
end
```

## Team-Based Scoping

Filter to user's team membership:

```ruby
class ProjectPolicy < ApplicationPolicy
  class Scope < ApplicationPolicy::Scope
    def resolve
      base_scope = scope.where(organization: user.organization)

      if user.admin?
        base_scope
      else
        # Users see projects they're members of
        base_scope
          .joins(:project_members)
          .where(project_members: { user: user })
          .distinct
      end
    end
  end
end
```

## Custom Scope Methods

Add named scopes for specific filtering:

```ruby
class TaskPolicy < ApplicationPolicy
  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.where(organization: user.organization)
    end

    def assigned_to_me
      resolve.where(assigned_to: user)
    end

    def created_by_me
      resolve.where(created_by: user)
    end

    def my_team
      resolve
        .joins(project: :project_members)
        .where(project_members: { user: user })
        .distinct
    end

    def urgent
      resolve.where(priority: :urgent)
    end
  end
end

# In controller
def index
  task_scope = policy_scope(Task)

  @tasks = case params[:filter]
  when "assigned"
    task_scope.assigned_to_me
  when "created"
    task_scope.created_by_me
  when "team"
    task_scope.my_team
  when "urgent"
    task_scope.urgent
  else
    task_scope
  end.order(created_at: :desc)
end
```

## Nested Resource Scoping

Scope through associations:

```ruby
class CommentPolicy < ApplicationPolicy
  class Scope < ApplicationPolicy::Scope
    def resolve
      # Comments inherit organization from posts
      scope
        .joins(:post)
        .where(posts: { organization: user.organization })
    end
  end
end
```

## Join-Based Scoping

Scope through complex associations:

```ruby
class TaskPolicy < ApplicationPolicy
  class Scope < ApplicationPolicy::Scope
    def resolve
      # Tasks belong to projects, which belong to organizations
      scope
        .joins(:project)
        .where(projects: { organization: user.organization })
    end
  end
end
```

## Cross-Organization Access (Super Admin)

Pattern for system-wide administrators:

```ruby
class OrganizationPolicy < ApplicationPolicy
  class Scope < ApplicationPolicy::Scope
    def resolve
      if user.super_admin?
        # Super admins see all organizations
        scope.all
      else
        # Regular users see only their own organization
        scope.where(id: user.organization_id)
      end
    end
  end
end
```

## Conditional Organization Scoping

Skip organization scoping for specific models:

```ruby
class CategoryPolicy < ApplicationPolicy
  class Scope < ApplicationPolicy::Scope
    def resolve
      # Categories are shared across organizations
      scope.all
    end
  end
end
```

## Controller Usage

Using scopes in controller actions:

```ruby
class PostsController < ApplicationController
  def index
    # Basic scope
    @posts = policy_scope(Post).order(created_at: :desc)
  end

  def index_with_includes
    # Scope with eager loading
    @posts = policy_scope(Post)
      .includes(:author, :comments)
      .order(created_at: :desc)
  end

  def index_with_filter
    # Scope with additional filtering
    @posts = policy_scope(Post)
    @posts = @posts.where(status: params[:status]) if params[:status].present?
    @posts = @posts.where(author: current_user) if params[:mine] == "true"
    @posts = @posts.order(created_at: :desc)
  end

  def search
    # Scope with search
    @posts = policy_scope(Post)
      .where("title ILIKE ?", "%#{params[:q]}%")
      .order(created_at: :desc)
  end
end
```

## View Scoping

Conditionally show elements based on policy scope:

```ruby
<!-- Show create button if user can create posts -->
<% if policy(Post).create? %>
  <%= link_to "New Post", new_post_path, class: "btn btn-primary" %>
<% end %>

<!-- Show edit button if user can update this post -->
<% @posts.each do |post| %>
  <div class="post">
    <h2><%= post.title %></h2>

    <% if policy(post).update? %>
      <%= link_to "Edit", edit_post_path(post) %>
    <% end %>

    <% if policy(post).destroy? %>
      <%= button_to "Delete", post_path(post), method: :delete %>
    <% end %>
  </div>
<% end %>
```

## Scope Verification

Ensure scoping is applied in controllers:

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  include Pundit::Authorization

  # Enforce policy scoping on index actions
  after_action :verify_policy_scoped, only: :index

  # Enforce authorization on other actions
  after_action :verify_authorized, except: :index

  rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized

  private

  def user_not_authorized
    flash[:alert] = "You are not authorized to perform this action."
    redirect_back(fallback_location: root_path)
  end
end
```

## Skipping Verification

For actions that don't need authorization:

```ruby
class PagesController < ApplicationController
  def home
    skip_authorization  # Public page
  end

  def about
    skip_authorization
  end
end
```

## Scope Testing in Console

Test scopes in Rails console:

```ruby
# rails console
user = User.find_by(email: "user@example.com")
policy_scope = PostPolicy::Scope.new(user, Post).resolve

# Check what posts this user can see
policy_scope.count
policy_scope.pluck(:id, :title, :organization_id)

# Verify organization scoping
policy_scope.pluck(:organization_id).uniq
# => [user.organization_id]
```

## Multi-Tenant Current Pattern

Set current organization in ApplicationController:

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  before_action :set_current_organization

  private

  def set_current_organization
    Current.organization = current_user&.organization
  end
end

# app/models/current.rb
class Current < ActiveSupport::CurrentAttributes
  attribute :organization
end
```

This enables `OwnedByOrganization` default scope to work automatically.

## Preventing Cross-Organization Data Leaks

Critical patterns to avoid data leakage:

```ruby
# BAD - Direct find bypasses scoping
def show
  @post = Post.find(params[:id])  # Could access other org's post!
  authorize @post
end

# GOOD - Scope first, then find
def show
  @post = policy_scope(Post).find(params[:id])
  authorize @post
end

# BETTER - Use Current.organization with OwnedByOrganization
def show
  @post = Post.find(params[:id])  # Default scope applies
  authorize @post
end
```

## Scope Performance

Optimize scopes with indexes and eager loading:

```ruby
# Add organization_id indexes
add_index :posts, [:organization_id, :created_at]
add_index :posts, [:organization_id, :author_id]

# Eager load associations
@posts = policy_scope(Post)
  .includes(:author, :organization)
  .order(created_at: :desc)
```
