---
name: pundit-authorization
description: This skill should be used when the user asks to add authorization, create a policy, implement Pundit, scope resources by organization, add multi-tenant authorization, restrict access to resources, implement role-based access control, or authorize controller actions in Rails applications.
---

# Pundit Authorization - AFAL Rails Patterns

## Overview

Pundit provides simple, object-oriented authorization for Rails applications. In AFAL applications, combine Pundit with the `OwnedByOrganization` concern for multi-tenant resource scoping.

## Core Concepts

### Policy Structure

Each model has a corresponding policy class in `app/policies/`:

```ruby
class PostPolicy < ApplicationPolicy
  def index?
    true  # Anyone in the org can list posts
  end

  def show?
    true  # Anyone in the org can view posts
  end

  def create?
    user.admin? || user.manager?
  end

  def update?
    user.admin? || record.author == user
  end

  def destroy?
    user.admin? || record.author == user
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      # Only show posts from user's organization
      scope.where(organization: user.organization)
    end
  end
end
```

### ApplicationPolicy Base

All policies inherit from `ApplicationPolicy`, which provides organization scoping by default:

```ruby
class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  # Default: allow read, restrict write
  def index? = true
  def show? = true
  def create? = user.has_role?('admin') || user.has_role?('manager')
  def new? = create?
  def update? = user.has_role?('admin') || user.has_role?('manager')
  def edit? = update?
  def destroy? = user.has_role?('admin')

  class Scope
    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve
      # Admins see all, others see only their organization
      if user.has_role?('admin')
        scope.all
      else
        scope.where(organization: user.organization)
      end
    end

    private

    attr_reader :user, :scope
  end
end
```

### Controller Integration

Include Pundit in `ApplicationController` and enforce authorization:

```ruby
class ApplicationController < ActionController::Base
  include Pundit::Authorization

  after_action :verify_authorized, except: :index
  after_action :verify_policy_scoped, only: :index

  rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized

  private

  def user_not_authorized
    flash[:alert] = "You are not authorized to perform this action."
    redirect_back(fallback_location: root_path)
  end
end
```

In controller actions:

```ruby
class PostsController < ApplicationController
  def index
    @posts = policy_scope(Post).order(created_at: :desc)
  end

  def show
    @post = Post.find(params[:id])
    authorize @post
  end

  def create
    # Organization set automatically via model default:
    # belongs_to :account, default: -> { Current.account }
    @post = Post.new(post_params)
    authorize @post

    if @post.save
      redirect_to @post
    else
      render :new, status: :unprocessable_entity
    end
  end

  def update
    @post = Post.find(params[:id])
    authorize @post

    if @post.update(post_params)
      redirect_to @post
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @post = Post.find(params[:id])
    authorize @post
    @post.destroy

    redirect_to posts_path
  end
end
```

## Organization Scoping Pattern

**CRITICAL**: All resources in AFAL applications belong to an organization. Users can only access resources from their own organization.

### OwnedByOrganization Concern

Models include `OwnedByOrganization` to enforce multi-tenant scoping:

```ruby
class Post < ApplicationRecord
  include OwnedByOrganization

  belongs_to :author, class_name: "User"
end
```

This concern provides:
- Validation that `organization_id` is present
- Default scope filtering to current organization (in request context)
- Helper methods for organization management

### Policy Scoping

Always use `policy_scope` in index actions to ensure users only see their organization's records:

```ruby
def index
  @posts = policy_scope(Post)
    .includes(:author)
    .order(created_at: :desc)
end
```

The `Scope#resolve` method in the policy handles organization filtering:

```ruby
class PostPolicy < ApplicationPolicy
  class Scope < ApplicationPolicy::Scope
    def resolve
      scope.where(organization: user.organization)
    end
  end
end
```

## Common Patterns

### Role-Based Authorization

Check user roles in policy methods. Note that `ApplicationPolicy` base uses `user.has_role?('admin')` for consistency, but child policies can use convenience methods like `user.admin?` if available:

```ruby
def create?
  user.admin? || user.manager?
end

def destroy?
  user.admin? # Only admins can delete
end
```

### Owner-Based Authorization

Allow resource owners to perform actions:

```ruby
def update?
  user.admin? || record.author == user
end
```

### Combined Conditions

```ruby
def publish?
  (user.admin? || record.author == user) && record.draft?
end
```

### Headless Policies

For actions not tied to a specific record:

```ruby
class DashboardPolicy < ApplicationPolicy
  def show?
    user.admin? || user.manager?
  end
end

# In controller
authorize :dashboard, :show?
```

## View Integration

Conditionally show UI elements based on policy:

```ruby
<% if policy(@post).update? %>
  <%= link_to "Edit", edit_post_path(@post) %>
<% end %>

<% if policy(@post).destroy? %>
  <%= button_to "Delete", post_path(@post), method: :delete %>
<% end %>

<% if policy(Post).create? %>
  <%= link_to "New Post", new_post_path %>
<% end %>
```

## Common Mistakes

| Mistake | Consequence | Solution |
|---------|-------------|----------|
| Forgetting `authorize` call | Authorization not enforced | Use `verify_authorized` after_action |
| Forgetting `policy_scope` | Users see other orgs' data | Use `verify_policy_scoped` after_action |
| Wrong scope in policy | Data leakage across orgs | Always scope to `user.organization` |
| Testing without fixtures | Incomplete test coverage | Use fixtures to set up multi-tenant scenarios |
| Not using Current defaults on model | Manual assignment is fragile | Use `belongs_to :account, default: -> { Current.account }` on model |
| Authorizing before finding record | Wrong authorization context | Find record first, then authorize |

## Generator Pattern

Create new policy:

```bash
rails generate pundit:policy Post
```

This creates `app/policies/post_policy.rb` inheriting from `ApplicationPolicy`.

## References

For detailed examples and patterns:

- **policies.md** - Policy templates, STI patterns, custom methods, nested resources
- **scoping.md** - Organization scoping implementation, cross-org access, view scoping
- **testing.md** - Minitest patterns, fixture setup, authorization assertions

## Quick Checklist

When adding authorization to a resource:

1. Create policy class inheriting from `ApplicationPolicy`
2. Define CRUD methods (index?, show?, create?, update?, destroy?)
3. Define `Scope#resolve` to filter by organization
4. Add `authorize @record` in controller actions
5. Use `policy_scope(Model)` in index actions
6. Set `organization_id` when creating records
7. Write policy tests covering all actions and roles
8. Write controller tests asserting authorization
9. Update views to conditionally show actions based on policy

## Key Principles

- **Fail secure**: Default deny in `ApplicationPolicy`
- **Organization scoping**: Every resource belongs to one organization
- **Explicit authorization**: Every controller action must authorize
- **Test coverage**: Test both authorized and unauthorized scenarios
- **Separation of concerns**: Business logic in policies, not controllers
