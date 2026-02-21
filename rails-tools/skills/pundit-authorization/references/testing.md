# Testing Pundit with Minitest

## Policy Test Structure

Basic policy test setup:

```ruby
# test/policies/post_policy_test.rb
require "test_helper"

class PostPolicyTest < ActiveSupport::TestCase
  def setup
    @organization = organizations(:acme)
    @other_organization = organizations(:other)

    @admin = users(:admin)
    @manager = users(:manager)
    @user = users(:regular_user)
    @other_org_user = users(:other_org_user)

    @post = posts(:published)
    @draft_post = posts(:draft)
  end

  # Test index action
  test "index? allows all users in organization" do
    assert PostPolicy.new(@admin, Post).index?
    assert PostPolicy.new(@manager, Post).index?
    assert PostPolicy.new(@user, Post).index?
  end

  # Test show action
  test "show? allows users in same organization" do
    assert PostPolicy.new(@user, @post).show?
  end

  # Test create action
  test "create? allows admins and managers" do
    assert PostPolicy.new(@admin, Post.new).create?
    assert PostPolicy.new(@manager, Post.new).create?
    refute PostPolicy.new(@user, Post.new).create?
  end

  # Test update action
  test "update? allows admin and post author" do
    assert PostPolicy.new(@admin, @post).update?
    assert PostPolicy.new(@post.author, @post).update?
    refute PostPolicy.new(@user, @post).update?
  end

  # Test destroy action
  test "destroy? allows only admin" do
    assert PostPolicy.new(@admin, @post).destroy?
    refute PostPolicy.new(@manager, @post).destroy?
    refute PostPolicy.new(@post.author, @post).destroy?
  end
end
```

## Testing Scopes

Test policy scopes with fixtures:

```ruby
# test/policies/post_policy_test.rb
class PostPolicyTest < ActiveSupport::TestCase
  # ... setup ...

  test "scope returns posts from user's organization" do
    scope = PostPolicy::Scope.new(@user, Post).resolve

    assert_includes scope, @post
    refute_includes scope, posts(:other_org_post)

    # All posts should be from user's organization
    assert scope.all? { |post| post.organization_id == @user.organization_id }
  end

  test "admin scope includes all organization posts" do
    scope = PostPolicy::Scope.new(@admin, Post).resolve

    org_posts = Post.where(organization: @admin.organization)
    assert_equal org_posts.count, scope.count
  end

  test "scope excludes posts from other organizations" do
    scope = PostPolicy::Scope.new(@user, Post).resolve

    other_org_count = Post.where(organization: @other_organization).count
    assert other_org_count > 0, "Test data should include other org posts"

    refute scope.exists?(organization: @other_organization)
  end
end
```

## Testing Role-Based Authorization

Test different user roles:

```ruby
# test/policies/invoice_policy_test.rb
class InvoicePolicyTest < ActiveSupport::TestCase
  def setup
    @admin = users(:admin)
    @manager = users(:manager)
    @viewer = users(:viewer)
    @invoice = invoices(:pending)
  end

  test "create? allows admins and managers only" do
    assert InvoicePolicy.new(@admin, Invoice.new).create?
    assert InvoicePolicy.new(@manager, Invoice.new).create?
    refute InvoicePolicy.new(@viewer, Invoice.new).create?
  end

  test "finalize? allows admins and managers" do
    assert InvoicePolicy.new(@admin, @invoice).finalize?
    assert InvoicePolicy.new(@manager, @invoice).finalize?
    refute InvoicePolicy.new(@viewer, @invoice).finalize?
  end

  test "update? allows admins on non-finalized invoices" do
    assert InvoicePolicy.new(@admin, @invoice).update?
    refute InvoicePolicy.new(@admin, invoices(:finalized)).update?
  end

  test "scope filters by role" do
    admin_scope = InvoicePolicy::Scope.new(@admin, Invoice).resolve
    viewer_scope = InvoicePolicy::Scope.new(@viewer, Invoice).resolve

    # Admins see all invoices
    assert admin_scope.exists?(status: :draft)

    # Viewers see only finalized
    refute viewer_scope.exists?(status: :draft)
    assert viewer_scope.all? { |inv| inv.finalized? }
  end
end
```

## Testing Owner-Based Authorization

Test ownership checks:

```ruby
# test/policies/timesheet_policy_test.rb
class TimesheetPolicyTest < ActiveSupport::TestCase
  def setup
    @user = users(:regular_user)
    @other_user = users(:another_user)
    @manager = users(:manager)

    @my_timesheet = timesheets(:user_timesheet)  # Belongs to @user
    @other_timesheet = timesheets(:other_timesheet)  # Belongs to @other_user
  end

  test "show? allows owner, manager, and admin" do
    assert TimesheetPolicy.new(@user, @my_timesheet).show?
    assert TimesheetPolicy.new(@manager, @my_timesheet).show?
    refute TimesheetPolicy.new(@other_user, @my_timesheet).show?
  end

  test "update? allows owner on non-submitted timesheets" do
    assert TimesheetPolicy.new(@user, @my_timesheet).update?
    refute TimesheetPolicy.new(@user, timesheets(:submitted_timesheet)).update?
    refute TimesheetPolicy.new(@other_user, @my_timesheet).update?
  end

  test "approve? allows only managers" do
    assert TimesheetPolicy.new(@manager, @my_timesheet).approve?
    refute TimesheetPolicy.new(@user, @my_timesheet).approve?
  end

  test "scope returns own timesheets for regular users" do
    scope = TimesheetPolicy::Scope.new(@user, Timesheet).resolve

    assert_includes scope, @my_timesheet
    refute_includes scope, @other_timesheet
  end

  test "scope returns all organization timesheets for managers" do
    scope = TimesheetPolicy::Scope.new(@manager, Timesheet).resolve

    assert_includes scope, @my_timesheet
    assert_includes scope, @other_timesheet
  end
end
```

## Fixture Setup for Multi-Tenant Testing

Create fixtures for different organizations:

```yaml
# test/fixtures/organizations.yml
acme:
  name: ACME Corp
  slug: acme

other:
  name: Other Inc
  slug: other

# test/fixtures/users.yml
admin:
  email: admin@acme.com
  organization: acme
  role: admin

manager:
  email: manager@acme.com
  organization: acme
  role: manager

regular_user:
  email: user@acme.com
  organization: acme
  role: user

other_org_user:
  email: user@other.com
  organization: other
  role: user

# test/fixtures/posts.yml
published:
  title: Published Post
  organization: acme
  author: regular_user
  status: published

draft:
  title: Draft Post
  organization: acme
  author: manager
  status: draft

other_org_post:
  title: Other Org Post
  organization: other
  author: other_org_user
  status: published
```

## Controller Test Authorization

Test authorization in controller tests:

```ruby
# test/controllers/posts_controller_test.rb
class PostsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = users(:admin)
    @user = users(:regular_user)
    @manager = users(:manager)
    @other_org_user = users(:other_org_user)

    @post = posts(:published)
    @other_org_post = posts(:other_org_post)
  end

  # Test index scoping
  test "index shows only organization posts" do
    sign_in @user
    get posts_path

    assert_response :success
    assert_select "article.post", count: Post.where(organization: @user.organization).count
  end

  # Test show authorization
  test "show allows access to organization post" do
    sign_in @user
    get post_path(@post)

    assert_response :success
  end

  test "show denies access to other organization post" do
    sign_in @user

    assert_raises(ActiveRecord::RecordNotFound) do
      get post_path(@other_org_post)
    end
  end

  # Test create authorization
  test "create allows admin and manager" do
    sign_in @manager

    assert_difference("Post.count") do
      post posts_path, params: { post: { title: "New Post", content: "Content" } }
    end

    assert_redirected_to post_path(Post.last)
  end

  test "create denies regular user" do
    sign_in @user

    assert_no_difference("Post.count") do
      post posts_path, params: { post: { title: "New Post", content: "Content" } }
    end

    assert_redirected_to root_path
    assert_equal "You are not authorized to perform this action.", flash[:alert]
  end

  # Test update authorization
  test "update allows admin" do
    sign_in @admin

    patch post_path(@post), params: { post: { title: "Updated Title" } }

    assert_redirected_to post_path(@post)
    @post.reload
    assert_equal "Updated Title", @post.title
  end

  test "update allows author" do
    sign_in @post.author

    patch post_path(@post), params: { post: { title: "Author Update" } }

    assert_redirected_to post_path(@post)
  end

  test "update denies non-author regular user" do
    sign_in @user

    patch post_path(@post), params: { post: { title: "Unauthorized Update" } }

    assert_redirected_to root_path
    assert_equal "You are not authorized to perform this action.", flash[:alert]
  end

  # Test destroy authorization
  test "destroy allows admin only" do
    sign_in @admin

    assert_difference("Post.count", -1) do
      delete post_path(@post)
    end

    assert_redirected_to posts_path
  end

  test "destroy denies manager" do
    sign_in @manager

    assert_no_difference("Post.count") do
      delete post_path(@post)
    end

    assert_redirected_to root_path
  end

  test "destroy denies author" do
    sign_in @post.author

    assert_no_difference("Post.count") do
      delete post_path(@post)
    end

    assert_redirected_to root_path
  end
end
```

## Testing Unauthorized Access

Test error handling for unauthorized actions:

```ruby
class PostsControllerTest < ActionDispatch::IntegrationTest
  test "unauthorized user sees error message" do
    sign_in users(:regular_user)

    post posts_path, params: { post: { title: "Test" } }

    assert_response :redirect
    assert_equal "You are not authorized to perform this action.", flash[:alert]
  end

  test "unauthenticated user is redirected to login" do
    get posts_path

    assert_redirected_to login_path
  end

  test "accessing other organization record raises not found" do
    sign_in users(:regular_user)

    assert_raises(ActiveRecord::RecordNotFound) do
      get post_path(posts(:other_org_post))
    end
  end
end
```

## Helper Methods for Policy Tests

Create test helpers for common patterns:

```ruby
# test/test_helper.rb
class ActiveSupport::TestCase
  # Test if policy method returns true
  def assert_permit(user, record, action)
    policy = policy_for(record).new(user, record)
    assert policy.public_send("#{action}?"),
      "Expected #{user.role} to be permitted to #{action} #{record.class}"
  end

  # Test if policy method returns false
  def refute_permit(user, record, action)
    policy = policy_for(record).new(user, record)
    refute policy.public_send("#{action}?"),
      "Expected #{user.role} to be denied to #{action} #{record.class}"
  end

  # Get policy class for record
  def policy_for(record)
    if record.is_a?(Class)
      "#{record.name}Policy".constantize
    else
      "#{record.class.name}Policy".constantize
    end
  end

  # Test scope includes record
  def assert_in_scope(user, record)
    scope = policy_scope_for(user, record.class)
    assert_includes scope, record,
      "Expected #{record.class} to be in scope for #{user.role}"
  end

  # Test scope excludes record
  def refute_in_scope(user, record)
    scope = policy_scope_for(user, record.class)
    refute_includes scope, record,
      "Expected #{record.class} to be excluded from scope for #{user.role}"
  end

  # Get policy scope
  def policy_scope_for(user, klass)
    "#{klass.name}Policy::Scope".constantize.new(user, klass).resolve
  end
end

# Usage in tests
test "authorization with helpers" do
  assert_permit(@admin, @post, :update)
  refute_permit(@user, @post, :destroy)
  assert_in_scope(@user, @post)
  refute_in_scope(@user, @other_org_post)
end
```

## Testing Custom Policy Methods

Test custom authorization methods:

```ruby
# test/policies/project_policy_test.rb
class ProjectPolicyTest < ActiveSupport::TestCase
  test "archive? allows admin and project manager" do
    project = projects(:active_project)

    assert ProjectPolicy.new(users(:admin), project).archive?
    assert ProjectPolicy.new(project.project_manager, project).archive?
    refute ProjectPolicy.new(users(:regular_user), project).archive?
  end

  test "archive? denies for already archived projects" do
    archived_project = projects(:archived_project)

    refute ProjectPolicy.new(users(:admin), archived_project).archive?
  end

  test "view_budget? allows admin, manager, and project manager" do
    project = projects(:active_project)

    assert ProjectPolicy.new(users(:admin), project).view_budget?
    assert ProjectPolicy.new(users(:manager), project).view_budget?
    assert ProjectPolicy.new(project.project_manager, project).view_budget?
    refute ProjectPolicy.new(users(:regular_user), project).view_budget?
  end
end
```

## Performance Testing Scopes

Test scope performance with larger datasets:

```ruby
# test/policies/post_policy_test.rb
test "scope performs efficiently with many records" do
  # Create additional test data
  100.times do |i|
    Post.create!(
      title: "Test Post #{i}",
      organization: @organization,
      author: @user
    )
  end

  # Test that scope doesn't have N+1 queries
  assert_queries(1) do
    PostPolicy::Scope.new(@user, Post).resolve.to_a
  end
end
```
