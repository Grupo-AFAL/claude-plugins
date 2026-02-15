---
name: afal-auth
description: This skill should be used when the user asks to add authentication, set up login, configure OmniAuth, add sign in, protect routes, require login, manage sessions, implement current user, add auth, or work with AFAL IdP authentication.
---

# AFAL Authentication Patterns

Apply OmniAuth-based authentication with AFAL IdP for Rails applications. This covers session management, user authentication flow, and route protection.

## CRITICAL Constraint

**ONLY use OmniAuth with AFAL IdP.** NEVER suggest:
- Devise
- Local passwords
- JWT tokens
- Auth0, Okta, or other third-party auth providers
- Email/password authentication

All authentication goes through AFAL's centralized identity provider via OmniAuth.

## Authentication Flow

The standard flow:

1. User clicks "Sign In" link to `/auth/afal`
2. Rails redirects to AFAL IdP
3. User authenticates at IdP
4. IdP redirects back to `/auth/afal/callback`
5. Rails creates or finds user from IdP data
6. Session established with `session[:user_id]`
7. User redirected to application

## Core Components

### OmniAuth Configuration

Configure the AFAL provider in an initializer with credentials from environment variables:

```ruby
# config/initializers/omniauth.rb
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :afal,
    ENV['AFAL_IDP_CLIENT_ID'],
    ENV['AFAL_IDP_CLIENT_SECRET'],
    scope: 'openid profile email organizations'
end
```

Install required gems and configure CSRF protection. See `references/omniauth-setup.md` for complete configuration.

### User Model

Implement `User.from_omniauth` to create or update users from IdP data:

```ruby
class User < ApplicationRecord
  belongs_to :organization

  def self.from_omniauth(auth_hash)
    user = find_or_initialize_by(provider: auth_hash.provider, uid: auth_hash.uid)
    user.assign_attributes(
      email: auth_hash.info.email,
      name: auth_hash.info.name,
      organization_id: auth_hash.info.organization_id
    )
    user.save!
    user
  end
end
```

### Sessions Controller

Handle authentication callbacks and logout:

```ruby
class SessionsController < ApplicationController
  skip_before_action :authenticate_user!, only: [:create]

  def create
    user = User.from_omniauth(request.env['omniauth.auth'])
    session[:user_id] = user.id
    redirect_to root_path
  end

  def destroy
    session.delete(:user_id)
    redirect_to root_path
  end
end
```

### Authentication Concern

Add to ApplicationController for authentication helpers:

```ruby
module Authentication
  extend ActiveSupport::Concern

  included do
    helper_method :current_user, :logged_in?
  end

  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end

  def logged_in?
    current_user.present?
  end

  def authenticate_user!
    redirect_to root_path, alert: "Please sign in" unless logged_in?
  end
end
```

### Route Protection

Protect controllers requiring authentication:

```ruby
class DashboardController < ApplicationController
  before_action :authenticate_user!

  def show
    # current_user available here
  end
end
```

For public controllers with optional authentication, omit the before_action.

## Multi-Tenancy

Users belong to organizations. The IdP provides organization_id in the auth response. Set Current.organization for request context:

```ruby
# app/controllers/concerns/set_current.rb
module SetCurrent
  extend ActiveSupport::Concern

  included do
    before_action :set_current_user
    before_action :set_current_organization
  end

  private

  def set_current_user
    Current.user = current_user
  end

  def set_current_organization
    Current.organization = current_user&.organization
  end
end
```

See `references/session-management.md` for organization switching and impersonation patterns.

## Routes

```ruby
# config/routes.rb
get '/auth/:provider/callback', to: 'sessions#create'
get '/auth/failure', to: 'sessions#failure'
delete '/sign_out', to: 'sessions#destroy'
```

The `/auth/afal` route is handled automatically by OmniAuth middleware.

## Testing

Use a sign_in helper in tests:

```ruby
# test/test_helper.rb
def sign_in(user)
  session[:user_id] = user.id
end
```

For integration and system tests:

```ruby
class DashboardTest < ActionDispatch::IntegrationTest
  test "authenticated user sees dashboard" do
    sign_in users(:alice)
    get dashboard_path
    assert_response :success
  end

  test "unauthenticated user redirected" do
    get dashboard_path
    assert_redirected_to root_path
  end
end
```

Configure OmniAuth test mode to avoid external requests. See `references/testing.md` for complete test patterns.

## Common Mistakes

| Mistake | Why It Fails | Solution |
|---------|-------------|----------|
| Using Devise | Not AFAL standard | Use OmniAuth with AFAL IdP |
| Local password authentication | Bypasses IdP | All auth through IdP only |
| JWT tokens | Session-based stack | Use Rails sessions |
| Forgetting session cleanup on logout | Stale sessions | Delete session[:user_id] in destroy |
| Skipping CSRF protection | Security vulnerability | Include omniauth-rails_csrf_protection |
| Hardcoding IdP credentials | Fails across environments | Use ENV variables |
| Not handling auth failures | Poor UX on errors | Add failure route and error messages |

## Reference Files

Detailed implementation patterns in:
- `references/omniauth-setup.md` - Complete OmniAuth configuration and user creation
- `references/session-management.md` - Session storage, timeouts, organization switching, impersonation
- `references/testing.md` - Minitest fixtures and test helpers for authentication

## Relationship to Authorization

Authentication (who you are) is separate from authorization (what you can do). After authentication:
- Use Pundit for authorization policies
- Reference the `pundit-authorization` skill for policy patterns
- Current.user and Current.organization are available to policies

## Security Checklist

Before completing authentication implementation, verify:
- [ ] CSRF protection enabled (omniauth-rails_csrf_protection gem)
- [ ] IdP credentials in ENV, not hardcoded
- [ ] Session secret_key_base configured (Rails handles this)
- [ ] HTTPS enforced in production
- [ ] Auth failure route handles errors gracefully
- [ ] Session cleared on logout
- [ ] No local password fallback exists
