# Testing Authentication with Minitest

Patterns for testing authentication in AFAL Rails apps using Minitest and fixtures.

## Test Helper Setup

Add authentication helpers to `test_helper.rb`:

```ruby
# test/test_helper.rb
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

OmniAuth.config.test_mode = true

class ActiveSupport::TestCase
  fixtures :all
end

class ActionDispatch::IntegrationTest
  def sign_in(user)
    session = user.sessions.create!(
      user_agent: "Test",
      ip_address: "127.0.0.1"
    )
    cookies.signed[:session_id] = session.id
  end

  def sign_out
    cookies.delete(:session_id)
  end
end
```

Key details:
- `sign_in` creates a real database Session record (matching production behavior)
- Sets `cookies.signed[:session_id]` (NOT `session[:user_id]`)
- `OmniAuth.config.test_mode = true` enables mock auth hashes

## Fixtures

### Users

```yaml
# test/fixtures/users.yml
alice:
  email: alice@example.com
  name: Alice Anderson
  idp_id: idp_alice_001
  employee_id: EMP001
  roles:
    - admin
    - manager
  organization: acme

bob:
  email: bob@example.com
  name: Bob Builder
  idp_id: idp_bob_002
  employee_id: EMP002
  roles:
    - member
  organization: acme

carol:
  email: carol@example.com
  name: Carol Chen
  idp_id: idp_carol_003
  employee_id: EMP003
  roles:
    - member
  organization: builders_inc
```

Key details:
- Use `idp_id` (NOT `provider`/`uid` composite)
- `roles` is a PostgreSQL array
- Users from different organizations for testing multi-tenancy

### Organizations

```yaml
# test/fixtures/organizations.yml
acme:
  name: ACME Corporation

builders_inc:
  name: Builders Inc
```

### Sessions

```yaml
# test/fixtures/sessions.yml
alice_session:
  user: alice
  user_agent: "Mozilla/5.0 Test"
  ip_address: "127.0.0.1"
```

## OmniAuth Mock Configuration

Configure mock auth hashes for callback tests:

```ruby
# In test setup or test_helper.rb
OmniAuth.config.mock_auth[:afal_idp] = OmniAuth::AuthHash.new({
  provider: 'afal_idp',
  uid: 'new_user_123',
  info: {
    email: 'newuser@example.com',
    name: 'New User',
    employee_id: 'EMP999'
  },
  extra: {
    roles: ['member'],
    organization: { id: 1, name: 'ACME' }
  }
})
```

**IMPORTANT**: The provider key is `:afal_idp` (NOT `:afal`).

## Testing Protected Actions

```ruby
# test/controllers/dashboard_controller_test.rb
class DashboardControllerTest < ActionDispatch::IntegrationTest
  test "redirects unauthenticated user to sign in" do
    get dashboard_path
    assert_redirected_to new_session_path
  end

  test "shows dashboard to authenticated user" do
    sign_in users(:alice)
    get dashboard_path
    assert_response :success
  end
end
```

## Testing Public Actions

```ruby
class HomeControllerTest < ActionDispatch::IntegrationTest
  test "shows home page without authentication" do
    get root_path
    assert_response :success
  end

  test "shows sign in link when not authenticated" do
    get root_path
    assert_select "a[href=?]", new_session_path
  end

  test "shows user name when authenticated" do
    sign_in users(:alice)
    get root_path
    assert_select "span", text: /Alice Anderson/
  end
end
```

## Testing Sessions Controller

### OAuth Callback

```ruby
class SessionsControllerTest < ActionDispatch::IntegrationTest
  test "creates user and session from omniauth callback" do
    OmniAuth.config.mock_auth[:afal_idp] = OmniAuth::AuthHash.new({
      provider: 'afal_idp',
      uid: 'new_user_456',
      info: {
        email: 'new@example.com',
        name: 'New User',
        employee_id: 'EMP456'
      },
      extra: {
        roles: ['member'],
        organization: { id: 1, name: 'ACME' }
      }
    })

    assert_difference ['User.count', 'Session.count'], 1 do
      get '/auth/afal_idp/callback'
    end

    assert_redirected_to root_path
    assert cookies[:session_id].present?
  end

  test "finds existing user on callback without creating new one" do
    existing_user = users(:alice)

    OmniAuth.config.mock_auth[:afal_idp] = OmniAuth::AuthHash.new({
      provider: 'afal_idp',
      uid: existing_user.idp_id,
      info: {
        email: existing_user.email,
        name: existing_user.name,
        employee_id: existing_user.employee_id
      },
      extra: {
        roles: ['admin', 'manager'],
        organization: { id: 1, name: 'ACME' }
      }
    })

    assert_no_difference 'User.count' do
      assert_difference 'Session.count', 1 do
        get '/auth/afal_idp/callback'
      end
    end

    assert_redirected_to root_path
  end

  test "handles authentication failure" do
    OmniAuth.config.mock_auth[:afal_idp] = :invalid_credentials

    get '/auth/failure?message=invalid_credentials'

    assert_redirected_to root_path
    assert_match /Authentication failed/, flash[:alert]
  end

  test "destroys session on sign out" do
    sign_in users(:alice)
    session_count = users(:alice).sessions.count

    delete session_path

    assert_redirected_to root_path
    assert_equal session_count - 1, users(:alice).sessions.count
  end
end
```

## Testing User Model

```ruby
class UserTest < ActiveSupport::TestCase
  test "creates user from omniauth hash" do
    auth = OmniAuth::AuthHash.new({
      uid: 'brand_new_user',
      info: {
        email: 'brand_new@example.com',
        name: 'Brand New User',
        employee_id: 'EMP_NEW'
      },
      extra: {
        roles: ['member'],
        organization: { id: organizations(:acme).id, name: 'ACME' }
      }
    })

    assert_difference 'User.count', 1 do
      user = User.find_or_create_from_omniauth(auth)
      assert user.persisted?
      assert_equal 'brand_new@example.com', user.email
      assert_equal 'brand_new_user', user.idp_id
      assert_equal ['member'], user.roles
    end
  end

  test "finds existing user without updating attributes" do
    alice = users(:alice)
    original_name = alice.name

    auth = OmniAuth::AuthHash.new({
      uid: alice.idp_id,
      info: {
        email: 'different@example.com',
        name: 'Different Name',
        employee_id: 'DIFF'
      },
      extra: { roles: ['different_role'] }
    })

    assert_no_difference 'User.count' do
      user = User.find_or_create_from_omniauth(auth)
      assert_equal alice.id, user.id
      assert_equal original_name, user.name  # NOT updated
    end
  end

  test "has_role? checks roles array" do
    alice = users(:alice)
    assert alice.has_role?('admin')
    assert alice.has_role?('manager')
    refute alice.has_role?('viewer')
  end

  test "admin? is shorthand for admin role" do
    assert users(:alice).admin?
    refute users(:bob).admin?
  end
end
```

## Testing Current Attributes

```ruby
class CurrentTest < ActiveSupport::TestCase
  test "sets user and account" do
    user = users(:alice)
    Current.user = user

    assert_equal user, Current.user
    assert_equal user.account, Current.account
  end

  test "resets between requests" do
    Current.user = users(:alice)
    Current.reset

    assert_nil Current.user
    assert_nil Current.account
  end
end
```

## Testing Organization Scoping

```ruby
class OrganizationScopingTest < ActionDispatch::IntegrationTest
  test "user sees only their organization data" do
    sign_in users(:alice)  # ACME org

    get projects_path
    assert_response :success

    # Should not include other org's data
    assert_select "h2", text: /Builders/, count: 0
  end

  test "user cannot access other organization resources" do
    sign_in users(:alice)  # ACME org
    other_org_project = projects(:builders_project)

    get project_path(other_org_project)
    assert_response :not_found  # Scoped query returns 404, not 403
  end
end
```

## Mock Auth Hash Helper

For convenience, create a reusable helper:

```ruby
# test/support/auth_helper.rb
module AuthHelper
  def mock_omniauth(user)
    OmniAuth.config.mock_auth[:afal_idp] = OmniAuth::AuthHash.new({
      provider: 'afal_idp',
      uid: user.idp_id,
      info: {
        email: user.email,
        name: user.name,
        employee_id: user.employee_id
      },
      extra: {
        roles: user.roles,
        organization: {
          id: user.organization_id,
          name: user.organization&.name
        }
      }
    })
  end
end

# Include in test_helper.rb
class ActionDispatch::IntegrationTest
  include AuthHelper
end
```

Usage:

```ruby
test "login flow with existing user" do
  mock_omniauth(users(:alice))
  get '/auth/afal_idp/callback'
  assert_redirected_to root_path
end
```

## Common Testing Mistakes

| Mistake | Why It Fails | Solution |
|---------|-------------|----------|
| `session[:user_id] = user.id` | Not how auth works | Use `sign_in(user)` helper |
| `mock_auth[:afal]` | Wrong provider key | Use `mock_auth[:afal_idp]` |
| `provider: 'afal'` in mock | Wrong provider name | Use `provider: 'afal_idp'` |
| Not creating Session record | Auth concern looks up Session | `sign_in` creates real Session |
| Testing user attribute updates on login | `find_or_create_by!` block only runs on create | Verify attributes are NOT updated |
| `assigns(:current_user)` | Deprecated in Rails 5+ | Check response content instead |
