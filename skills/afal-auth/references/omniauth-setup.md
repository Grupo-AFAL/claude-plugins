# OmniAuth Setup for AFAL IdP

Complete configuration for OmniAuth authentication with AFAL's centralized identity provider.

## Required Gems

```ruby
gem 'omniauth'
gem 'omniauth-oauth2'
gem 'omniauth-rails_csrf_protection'
```

The `omniauth-rails_csrf_protection` gem is critical -- it requires POST requests to initiate auth flows, preventing CSRF attacks.

## Custom Strategy

Create the AFAL IdP strategy in `lib/omniauth/strategies/afal_idp.rb`:

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

Key details:
- Provider name is `afal_idp` (NOT `afal`)
- `uid` reads `raw_info['id']` (NOT `sub`)
- `info` includes `employee_id` from IdP
- `extra` includes `roles` (array) and `organization` (hash)
- Client options use `Rails.application.credentials`, NOT ENV vars

## OmniAuth Initializer

```ruby
# config/initializers/omniauth.rb
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :afal_idp,
    Rails.application.credentials.dig(:idp, :client_id),
    Rails.application.credentials.dig(:idp, :client_secret),
    scope: 'read write'
end
```

**IMPORTANT**: Always use `Rails.application.credentials.dig(:idp, ...)`. Never use ENV vars for IdP credentials.

Store credentials via:

```bash
rails credentials:edit
```

```yaml
# config/credentials.yml.enc
idp:
  url: https://id.afal.mx
  client_id: your_client_id
  client_secret: your_client_secret
```

## User Model

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

Critical patterns:
- **Single `idp_id` field** -- there is only one IdP, so composite `provider`/`uid` is unnecessary
- **`find_or_create_by!` with block** -- attributes in the block are only set on **create**, not updated every login. This prevents overwriting local changes to user data.
- **`roles` is a collection** -- PostgreSQL array column or JSON, not a single string
- **`employee_id`** tracked from IdP response

## User Migration

```ruby
class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :name
      t.string :idp_id, null: false
      t.string :employee_id
      t.string :roles, array: true, default: []
      t.references :organization, foreign_key: true

      t.timestamps
    end

    add_index :users, :email, unique: true
    add_index :users, :idp_id, unique: true
  end
end
```

## Sessions Controller

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

Key patterns:
- Uses `allow_unauthenticated_access` (opt-out), NOT `skip_before_action :authenticate_user!`
- Creates a database-backed `Session` record (NOT `session[:user_id]`)
- Sets `cookies.signed[:session_id]` (NOT Rails session hash)
- `new` redirects to `/auth/afal_idp` (the OmniAuth middleware handles the rest)

## Routes

```ruby
# config/routes.rb
get '/auth/:provider/callback', to: 'sessions#create'
get '/auth/failure', to: 'sessions#failure'
resource :session, only: [:new, :destroy]
```

The `/auth/afal_idp` route is handled automatically by OmniAuth middleware -- no explicit route needed.

## Error Handling

Handle common failure scenarios in the `failure` action:

```ruby
def failure
  error_message = case params[:message]
  when 'timeout'
    "The authentication service is currently unavailable. Please try again later."
  when 'invalid_credentials'
    "Invalid credentials. Please check with your administrator."
  when 'csrf_detected'
    "Security error. Please try signing in again."
  else
    "Authentication failed: #{params[:message]}"
  end

  redirect_to root_path, alert: error_message
end
```

## IdP Data Mapping

| IdP Field | User Attribute | Notes |
|-----------|----------------|-------|
| id | idp_id | Unique identifier at IdP |
| email | email | Primary email |
| name | name | Full name |
| employee_id | employee_id | AFAL employee number |
| roles | roles | Array of role strings |
| organization | organization | Organization hash (id, name) |

## Sign In Link

```erb
<% if authenticated? %>
  <span>Signed in as <%= current_user.name %></span>
  <%= button_to "Sign Out", session_path, method: :delete %>
<% else %>
  <%= link_to "Sign In", new_session_path %>
<% end %>
```

## Common Mistakes

| Mistake | Why It Fails | Solution |
|---------|-------------|----------|
| Provider name `:afal` | Wrong provider name | Use `'afal_idp'` |
| ENV vars for credentials | Not AFAL standard | Use `Rails.application.credentials.dig(:idp, ...)` |
| `provider`/`uid` composite key | Unnecessary complexity | Single `idp_id` field |
| Updating user on every login | Overwrites local changes | Use `find_or_create_by!` with block |
| `raw_info['sub']` for uid | Wrong IdP claim | Use `raw_info['id']` |
| Storing roles as string | Can't query properly | Use PostgreSQL array column |
