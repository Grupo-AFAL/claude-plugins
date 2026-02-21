---
name: afal-auth
description: This skill should be used when the user asks to add authentication, set up login, configure OmniAuth, add sign in, protect routes, require login, manage sessions, implement current user, add auth, or work with AFAL IdP authentication.
---

# AFAL Authentication Patterns

OmniAuth-based authentication with AFAL IdP for Rails applications. Session-based with database-backed Session model following the 37signals pattern.

## CRITICAL Constraints

**ONLY use OmniAuth with AFAL IdP.** NEVER suggest:
- Devise
- Local passwords or email/password authentication
- JWT tokens for session management
- Auth0, Okta, or other third-party auth providers

All authentication goes through AFAL's centralized identity provider (`id.afal.mx`) via OmniAuth.

## Authentication Flow

1. User clicks "Sign In" link (navigates to `/auth/afal_idp`)
2. OmniAuth middleware redirects to AFAL IdP
3. User authenticates at IdP
4. IdP redirects back to `/auth/afal_idp/callback`
5. Rails finds or creates user from IdP data
6. Session record created (tracks user_agent, ip_address)
7. `cookies.signed[:session_id]` set
8. User redirected to application

## Core Components

### OmniAuth Strategy

Custom strategy in `lib/omniauth/strategies/afal_idp.rb`:

```ruby
module OmniAuth
  module Strategies
    class AfalIdp < OmniAuth::Strategies::OAuth2
      option :name, 'afal_idp'

      option :client_options, {
        site: Rails.application.credentials.dig(:idp, :url),
        authorize_url: '/oauth/authorize',
        token_url: '/oauth/token'
      }

      uid { raw_info['id'].to_s }

      info do
        {
          email: raw_info['email'],
          name: raw_info['name'],
          employee_id: raw_info['employee_id']
        }
      end

      extra do
        {
          raw_info: raw_info,
          roles: raw_info['roles'] || [],
          organization: raw_info['organization']
        }
      end

      def raw_info
        @raw_info ||= access_token.get('/oauth/userinfo').parsed
      end
    end
  end
end
```

### OmniAuth Configuration

```ruby
# config/initializers/omniauth.rb
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :afal_idp,
    Rails.application.credentials.dig(:idp, :client_id),
    Rails.application.credentials.dig(:idp, :client_secret),
    scope: 'read write'
end
```

**IMPORTANT**: Use `Rails.application.credentials`, NOT environment variables.

### User Model

```ruby
class User < ApplicationRecord
  has_many :sessions, dependent: :destroy

  validates :email, presence: true, uniqueness: true
  validates :idp_id, presence: true, uniqueness: true

  def self.find_or_create_from_omniauth(auth)
    find_or_create_by!(idp_id: auth.uid) do |user|
      user.email = auth.info.email
      user.name = auth.info.name
      user.employee_id = auth.info.employee_id
      user.roles = auth.extra.roles
      user.organization = auth.extra.organization
    end
  end

  def has_role?(role_name)
    roles.include?(role_name)
  end

  def admin?
    has_role?('admin')
  end
end
```

Key details:
- Single `idp_id` field (NOT composite `provider`/`uid` -- there is only one IdP)
- `find_or_create_by!` with block -- attributes only set on **create**, not updated every login
- `roles` is a collection (PostgreSQL array or JSON), not a single string
- `employee_id` tracked from IdP response

### Session Model

Database-backed sessions for audit trail:

```ruby
class Session < ApplicationRecord
  belongs_to :user
end
```

Migration:

```ruby
create_table :sessions do |t|
  t.references :user, null: false, foreign_key: true
  t.string :user_agent
  t.string :ip_address
  t.timestamps
end
```

### Sessions Controller

```ruby
class SessionsController < ApplicationController
  allow_unauthenticated_access only: [:new, :create, :failure]

  def new
    redirect_to '/auth/afal_idp'
  end

  def create
    auth = request.env['omniauth.auth']
    user = User.find_or_create_from_omniauth(auth)

    session = user.sessions.create!(
      user_agent: request.user_agent,
      ip_address: request.remote_ip
    )

    cookies.signed[:session_id] = {
      value: session.id,
      httponly: true,
      secure: Rails.env.production?
    }

    redirect_to root_path, notice: "Signed in successfully"
  end

  def destroy
    Current.session&.destroy
    cookies.delete(:session_id)
    redirect_to root_path, notice: "Signed out"
  end

  def failure
    redirect_to root_path, alert: "Authentication failed: #{params[:message]}"
  end
end
```

### Authentication Concern

```ruby
# app/controllers/concerns/authentication.rb
module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :require_authentication
    helper_method :authenticated?, :current_user
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private

  def authenticated?
    Current.user.present?
  end

  def current_user
    Current.user
  end

  def require_authentication
    resume_session || request_authentication
  end

  def resume_session
    if (session = Session.find_by(id: cookies.signed[:session_id]))
      Current.session = session
      Current.user = session.user
    end
  end

  def request_authentication
    redirect_to new_session_path
  end
end
```

Key patterns:
- **Opt-out model**: All actions require auth by default
- Use `allow_unauthenticated_access` to opt out specific actions
- `resume_session` sets both `Current.session` and `Current.user`
- `current_user` reads from `Current.user`, not from a database query

### Current Attributes

```ruby
# app/models/current.rb
class Current < ActiveSupport::CurrentAttributes
  attribute :session, :user, :account
  attribute :request_id, :user_agent, :ip_address

  def user=(user)
    super
    self.account = user&.account
  end
end
```

### Routes

```ruby
# config/routes.rb
get '/auth/:provider/callback', to: 'sessions#create'
get '/auth/failure', to: 'sessions#failure'
resource :session, only: [:new, :destroy]
```

The `/auth/afal_idp` route is handled automatically by OmniAuth middleware.

## Multi-Tenancy

Users belong to organizations. The IdP provides organization in the auth response. `Current.account` (or `Current.organization`) is set automatically when `Current.user` is assigned.

Models use defaults for automatic association:

```ruby
class Card < ApplicationRecord
  belongs_to :creator, class_name: "User", default: -> { Current.user }
  belongs_to :account, default: -> { Current.account }
end
```

## Required Gems

```ruby
gem 'omniauth'
gem 'omniauth-oauth2'
gem 'omniauth-rails_csrf_protection'
```

## Common Mistakes

| Mistake | Why It Fails | Solution |
|---------|-------------|----------|
| Using Devise | Not AFAL standard | Use OmniAuth with AFAL IdP |
| Provider name `:afal` | Wrong provider | Use `'afal_idp'` |
| `session[:user_id]` | No audit trail | Use Session model + `cookies.signed[:session_id]` |
| ENV vars for credentials | Not standard | Use `Rails.application.credentials.dig(:idp, ...)` |
| `authenticate_user!` (opt-in) | Wrong pattern | Use `require_authentication` (opt-out) with `allow_unauthenticated_access` |
| Updating user on every login | Overwrites local changes | Use `find_or_create_by!` with block (create-only) |
| `provider`/`uid` composite key | Unnecessary | Single `idp_id` field (only one IdP) |

## Testing

Configure OmniAuth test mode:

```ruby
# test/test_helper.rb
OmniAuth.config.test_mode = true

def sign_in(user)
  session = user.sessions.create!(
    user_agent: "Test",
    ip_address: "127.0.0.1"
  )
  cookies.signed[:session_id] = session.id
end
```

See `references/testing.md` for complete test patterns.

## References

- **omniauth-setup.md** - Complete strategy, initializer, and user creation patterns
- **session-management.md** - Session model, cookies, organization switching
- **testing.md** - Minitest fixtures and test helpers for authentication

## Relationship to Authorization

Authentication (who you are) is separate from authorization (what you can do). After authentication:
- Use Pundit for authorization policies (see `pundit-authorization` skill)
- `Current.user` and `Current.account` are available to policies
