# Testing Authentication with Minitest

Patterns for testing authentication in AFAL Rails apps using Minitest and fixtures.

## Test Helper Setup

Add authentication helpers to `test_helper.rb`:

```ruby
# test/test_helper.rb
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  fixtures :all

  # Sign in a user for controller/integration tests
  def sign_in(user)
    session[:user_id] = user.id
  end

  # Sign out current user
  def sign_out
    session.delete(:user_id)
  end
end

class ActionDispatch::IntegrationTest
  # Integration tests need explicit session access
  def sign_in(user)
    post auth_callback_path, params: {}, session: { user_id: user.id }
  end
end
```

## OmniAuth Test Mode

Configure OmniAuth for testing:

```ruby
# config/initializers/omniauth.rb
if Rails.env.test?
  OmniAuth.config.test_mode = true

  # Default mock auth hash
  OmniAuth.config.mock_auth[:afal] = OmniAuth::AuthHash.new({
    provider: 'afal',
    uid: '12345',
    info: {
      email: 'test@example.com',
      name: 'Test User',
      first_name: 'Test',
      last_name: 'User',
      organization_id: 'org_123',
      organization_name: 'Test Org'
    },
    credentials: {
      token: 'mock_token',
      refresh_token: 'mock_refresh_token',
      expires_at: 1.hour.from_now.to_i
    }
  })
end
```

## Fixtures for Users

```yaml
# test/fixtures/users.yml
alice:
  email: alice@example.com
  name: Alice Anderson
  first_name: Alice
  last_name: Anderson
  provider: afal
  uid: uid_alice_001
  organization: acme

bob:
  email: bob@example.com
  name: Bob Builder
  first_name: Bob
  last_name: Builder
  provider: afal
  uid: uid_bob_002
  organization: builders_inc

admin:
  email: admin@example.com
  name: Admin User
  first_name: Admin
  last_name: User
  provider: afal
  uid: uid_admin_003
  organization: acme
  role: admin
```

```yaml
# test/fixtures/organizations.yml
acme:
  external_id: org_acme_001
  name: ACME Corporation

builders_inc:
  external_id: org_builders_002
  name: Builders Inc
```

## Testing Controller Authentication

### Testing Protected Actions

```ruby
# test/controllers/dashboard_controller_test.rb
require "test_helper"

class DashboardControllerTest < ActionDispatch::IntegrationTest
  test "redirects unauthenticated user" do
    get dashboard_path
    assert_redirected_to root_path
    assert_equal "Please sign in to continue", flash[:alert]
  end

  test "shows dashboard to authenticated user" do
    sign_in users(:alice)
    get dashboard_path
    assert_response :success
  end

  test "loads current user data" do
    sign_in users(:alice)
    get dashboard_path
    assert_equal users(:alice), assigns(:current_user)
  end
end
```

### Testing Public Actions

```ruby
# test/controllers/home_controller_test.rb
require "test_helper"

class HomeControllerTest < ActionDispatch::IntegrationTest
  test "shows home page without authentication" do
    get root_path
    assert_response :success
  end

  test "shows sign in link when not authenticated" do
    get root_path
    assert_select "a[href=?]", "/auth/afal", text: "Sign In"
  end

  test "shows user name when authenticated" do
    sign_in users(:alice)
    get root_path
    assert_select "span", text: /Alice Anderson/
  end
end
```

## Testing Sessions Controller

### Testing OAuth Callback

```ruby
# test/controllers/sessions_controller_test.rb
require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    OmniAuth.config.test_mode = true
  end

  test "creates session from omniauth callback" do
    OmniAuth.config.mock_auth[:afal] = OmniAuth::AuthHash.new({
      provider: 'afal',
      uid: 'new_user_123',
      info: {
        email: 'newuser@example.com',
        name: 'New User',
        first_name: 'New',
        last_name: 'User',
        organization_id: 'org_acme_001'
      }
    })

    assert_difference 'User.count', 1 do
      get auth_callback_path
    end

    assert_redirected_to root_path
    assert session[:user_id].present?
    assert_equal 'Welcome back, New User!', flash[:notice]
  end

  test "finds existing user on callback" do
    existing_user = users(:alice)

    OmniAuth.config.mock_auth[:afal] = OmniAuth::AuthHash.new({
      provider: existing_user.provider,
      uid: existing_user.uid,
      info: {
        email: existing_user.email,
        name: 'Alice Updated Name',
        organization_id: organizations(:acme).external_id
      }
    })

    assert_no_difference 'User.count' do
      get auth_callback_path
    end

    assert_redirected_to root_path
    assert_equal existing_user.id, session[:user_id]
  end

  test "handles authentication failure" do
    OmniAuth.config.mock_auth[:afal] = :invalid_credentials

    get auth_callback_path

    assert_redirected_to root_path
    assert_match /Authentication failed/, flash[:alert]
    assert_nil session[:user_id]
  end

  test "destroys session on sign out" do
    sign_in users(:alice)

    delete sign_out_path

    assert_redirected_to root_path
    assert_nil session[:user_id]
    assert_equal 'You have been signed out.', flash[:notice]
  end
end
```

## Integration Test Authentication

```ruby
# test/integration/user_flow_test.rb
require "test_helper"

class UserFlowTest < ActionDispatch::IntegrationTest
  test "complete sign in and access protected resource" do
    # Visit home page
    get root_path
    assert_response :success

    # Click sign in (simulated via OmniAuth test mode)
    OmniAuth.config.mock_auth[:afal] = OmniAuth::AuthHash.new({
      provider: 'afal',
      uid: users(:alice).uid,
      info: { email: users(:alice).email, name: users(:alice).name }
    })

    get auth_callback_path
    follow_redirect!
    assert_equal root_path, path

    # Access protected dashboard
    get dashboard_path
    assert_response :success

    # Sign out
    delete sign_out_path
    follow_redirect!

    # Cannot access dashboard after sign out
    get dashboard_path
    assert_redirected_to root_path
  end
end
```

## System Test Authentication

For Capybara/system tests with OmniAuth:

```ruby
# test/system/authentication_test.rb
require "application_system_test_case"

class AuthenticationTest < ApplicationSystemTestCase
  setup do
    OmniAuth.config.test_mode = true
    OmniAuth.config.mock_auth[:afal] = OmniAuth::AuthHash.new({
      provider: 'afal',
      uid: 'system_test_user',
      info: {
        email: 'systemtest@example.com',
        name: 'System Test User',
        organization_id: organizations(:acme).external_id
      }
    })
  end

  test "signing in via AFAL IdP" do
    visit root_path
    click_on "Sign In"

    # After OmniAuth redirect (mocked)
    assert_text "Welcome back, System Test User!"
    assert_text "System Test User" # Header shows user name
  end

  test "accessing protected page requires sign in" do
    visit dashboard_path
    assert_current_path root_path
    assert_text "Please sign in"
  end

  test "signing out" do
    visit root_path
    click_on "Sign In"

    assert_text "System Test User"

    click_on "Sign Out"
    assert_text "You have been signed out"
    assert_no_text "System Test User"
  end
end
```

## Testing Organization Scoping

```ruby
# test/integration/organization_scoping_test.rb
require "test_helper"

class OrganizationScopingTest < ActionDispatch::IntegrationTest
  test "user sees only their organization data" do
    sign_in users(:alice) # ACME org

    get projects_path
    assert_response :success

    # Alice sees ACME projects
    assert_select "h2", text: /ACME Project/

    # Alice does not see Builders Inc projects
    assert_select "h2", text: /Builders Project/, count: 0
  end

  test "switching organizations updates context" do
    alice = users(:alice)
    alice.organizations << organizations(:builders_inc)

    sign_in alice

    # Initially in ACME
    get root_path
    assert_select "span", text: /ACME Corporation/

    # Switch to Builders Inc
    post organization_switch_path(organization_id: organizations(:builders_inc).id)
    follow_redirect!

    assert_select "span", text: /Builders Inc/
  end
end
```

## Testing User Model from_omniauth

```ruby
# test/models/user_test.rb
require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "creates user from omniauth hash" do
    auth_hash = OmniAuth::AuthHash.new({
      provider: 'afal',
      uid: 'new_uid_789',
      info: {
        email: 'newmodel@example.com',
        name: 'Model Test User',
        first_name: 'Model',
        last_name: 'Test',
        organization_id: organizations(:acme).external_id
      }
    })

    assert_difference 'User.count', 1 do
      user = User.from_omniauth(auth_hash)
      assert user.persisted?
      assert_equal 'newmodel@example.com', user.email
      assert_equal 'Model Test User', user.name
      assert_equal organizations(:acme), user.organization
    end
  end

  test "updates existing user from omniauth hash" do
    existing_user = users(:alice)

    auth_hash = OmniAuth::AuthHash.new({
      provider: existing_user.provider,
      uid: existing_user.uid,
      info: {
        email: existing_user.email,
        name: 'Updated Name',
        organization_id: organizations(:acme).external_id
      }
    })

    assert_no_difference 'User.count' do
      user = User.from_omniauth(auth_hash)
      assert_equal existing_user.id, user.id
      assert_equal 'Updated Name', user.name
    end
  end

  test "creates organization if not exists" do
    auth_hash = OmniAuth::AuthHash.new({
      provider: 'afal',
      uid: 'new_org_user',
      info: {
        email: 'neworg@example.com',
        name: 'New Org User',
        organization_id: 'org_new_999'
      }
    })

    assert_difference 'Organization.count', 1 do
      user = User.from_omniauth(auth_hash)
      assert user.organization.present?
      assert_equal 'org_new_999', user.organization.external_id
    end
  end

  test "handles missing organization gracefully" do
    auth_hash = OmniAuth::AuthHash.new({
      provider: 'afal',
      uid: 'no_org_user',
      info: {
        email: 'noorg@example.com',
        name: 'No Org User',
        organization_id: nil
      }
    })

    user = User.from_omniauth(auth_hash)
    assert user.persisted?
    assert_nil user.organization
  end
end
```

## Testing Current Attributes

```ruby
# test/models/current_test.rb
require "test_helper"

class CurrentTest < ActiveSupport::TestCase
  test "sets user and organization" do
    user = users(:alice)
    Current.user = user
    Current.organization = user.organization

    assert_equal user, Current.user
    assert_equal organizations(:acme), Current.organization
  end

  test "resets between requests" do
    Current.user = users(:alice)
    assert_equal users(:alice), Current.user

    # Simulate new request
    Current.reset

    assert_nil Current.user
    assert_nil Current.organization
  end
end
```

## Testing Impersonation

```ruby
# test/controllers/admin/impersonations_controller_test.rb
require "test_helper"

class Admin::ImpersonationsControllerTest < ActionDispatch::IntegrationTest
  test "admin can impersonate user" do
    sign_in users(:admin)

    post admin_impersonation_path(user_id: users(:alice).id)

    assert_redirected_to root_path
    assert session[:impersonated_user_id].present?
    assert_equal users(:alice).id, session[:impersonated_user_id]
  end

  test "non-admin cannot impersonate" do
    sign_in users(:alice)

    post admin_impersonation_path(user_id: users(:bob).id)

    assert_redirected_to root_path
    assert_equal "Access denied", flash[:alert]
    assert_nil session[:impersonated_user_id]
  end

  test "admin can stop impersonating" do
    admin = users(:admin)
    sign_in admin
    session[:impersonated_user_id] = users(:alice).id

    delete admin_impersonation_path

    assert_redirected_to admin_users_path
    assert_nil session[:impersonated_user_id]
  end
end
```

## Common Testing Patterns

### Custom Auth Hash Helper

```ruby
# test/support/auth_hash_helper.rb
module AuthHashHelper
  def mock_auth_hash(user)
    OmniAuth::AuthHash.new({
      provider: user.provider,
      uid: user.uid,
      info: {
        email: user.email,
        name: user.name,
        first_name: user.first_name,
        last_name: user.last_name,
        organization_id: user.organization&.external_id
      }
    })
  end
end

# test/test_helper.rb
class ActiveSupport::TestCase
  include AuthHashHelper
end

# Usage in tests
OmniAuth.config.mock_auth[:afal] = mock_auth_hash(users(:alice))
```

### Testing Return Path After Login

```ruby
test "redirects to original path after authentication" do
  get dashboard_path
  assert_redirected_to root_path
  assert_equal dashboard_path, session[:return_to]

  get auth_callback_path
  follow_redirect!

  assert_equal dashboard_path, path
  assert_nil session[:return_to]
end
```

## Performance Testing

For authentication-heavy tests, use fixtures efficiently:

```ruby
# Load minimal fixtures for auth tests
class AuthenticationTest < ActionDispatch::IntegrationTest
  fixtures :users, :organizations

  # Avoid loading all fixtures if not needed
end
```

## CI Environment Setup

Ensure OmniAuth test mode is enabled in CI:

```ruby
# config/environments/test.rb
config.after_initialize do
  OmniAuth.config.test_mode = true
end
```
