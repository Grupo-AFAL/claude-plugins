# OmniAuth Setup for AFAL IdP

Complete configuration for OmniAuth authentication with AFAL's identity provider.

## Gem Installation

Add to Gemfile:

```ruby
gem 'omniauth'
gem 'omniauth-oauth2'
gem 'omniauth-rails_csrf_protection'
```

The `omniauth-rails_csrf_protection` gem is critical for security in Rails applications.

## Provider Configuration

Create the OmniAuth initializer:

```ruby
# config/initializers/omniauth.rb
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :afal,
    ENV.fetch('AFAL_IDP_CLIENT_ID'),
    ENV.fetch('AFAL_IDP_CLIENT_SECRET'),
    client_options: {
      site: ENV.fetch('AFAL_IDP_URL', 'https://idp.afal.com'),
      authorize_url: '/oauth/authorize',
      token_url: '/oauth/token',
      user_info_url: '/oauth/userinfo'
    },
    scope: 'openid profile email organizations',
    redirect_uri: ENV.fetch('AFAL_IDP_REDIRECT_URI', 'http://localhost:3000/auth/afal/callback')
end

OmniAuth.config.allowed_request_methods = [:post, :get]
OmniAuth.config.on_failure = proc { |env|
  SessionsController.action(:failure).call(env)
}
```

## Environment Variables

Set these in `.env` (development) and production environment:

```bash
# .env
AFAL_IDP_CLIENT_ID=your_client_id_here
AFAL_IDP_CLIENT_SECRET=your_client_secret_here
AFAL_IDP_URL=https://idp.afal.com
AFAL_IDP_REDIRECT_URI=http://localhost:3000/auth/afal/callback
```

Production should use the production IdP URL and callback URL.

## AFAL Provider Strategy

Create the custom AFAL strategy if not already available as a gem:

```ruby
# lib/omniauth/strategies/afal.rb
require 'omniauth-oauth2'

module OmniAuth
  module Strategies
    class Afal < OmniAuth::Strategies::OAuth2
      option :name, :afal

      option :client_options, {
        site: ENV.fetch('AFAL_IDP_URL'),
        authorize_url: '/oauth/authorize',
        token_url: '/oauth/token'
      }

      uid { raw_info['sub'] }

      info do
        {
          email: raw_info['email'],
          name: raw_info['name'],
          first_name: raw_info['given_name'],
          last_name: raw_info['family_name'],
          organization_id: raw_info['organization_id'],
          organization_name: raw_info['organization_name']
        }
      end

      extra do
        { raw_info: raw_info }
      end

      def raw_info
        @raw_info ||= access_token.get('/oauth/userinfo').parsed
      end
    end
  end
end

OmniAuth.config.add_camelization 'afal', 'Afal'
```

Ensure `lib/` is autoloaded:

```ruby
# config/application.rb
config.autoload_paths << Rails.root.join('lib')
```

## Sessions Controller

Handle the OmniAuth callback:

```ruby
# app/controllers/sessions_controller.rb
class SessionsController < ApplicationController
  skip_before_action :authenticate_user!, only: [:create, :failure]

  def create
    auth = request.env['omniauth.auth']
    user = User.from_omniauth(auth)

    if user.persisted?
      session[:user_id] = user.id
      redirect_to session.delete(:return_to) || root_path,
                  notice: "Welcome back, #{user.name}!"
    else
      redirect_to root_path,
                  alert: "Authentication failed. Please try again."
    end
  end

  def destroy
    session.delete(:user_id)
    redirect_to root_path, notice: "You have been signed out."
  end

  def failure
    redirect_to root_path,
                alert: "Authentication failed: #{params[:message]}"
  end
end
```

## User Model Implementation

Create or update the User model:

```ruby
# app/models/user.rb
class User < ApplicationRecord
  belongs_to :organization

  validates :email, presence: true, uniqueness: true
  validates :provider, :uid, presence: true

  def self.from_omniauth(auth_hash)
    user = find_or_initialize_by(
      provider: auth_hash.provider,
      uid: auth_hash.uid
    )

    user.assign_attributes(
      email: auth_hash.info.email,
      name: auth_hash.info.name,
      first_name: auth_hash.info.first_name,
      last_name: auth_hash.info.last_name,
      organization_id: find_or_create_organization(auth_hash.info.organization_id)
    )

    user.save!
    user
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error "Failed to create/update user from OmniAuth: #{e.message}"
    nil
  end

  private

  def self.find_or_create_organization(org_id)
    return nil unless org_id
    Organization.find_or_create_by!(external_id: org_id)
  end
end
```

## Migration for Users

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_users.rb
class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :name
      t.string :first_name
      t.string :last_name
      t.string :provider, null: false
      t.string :uid, null: false
      t.references :organization, foreign_key: true

      t.timestamps
    end

    add_index :users, :email, unique: true
    add_index :users, [:provider, :uid], unique: true
  end
end
```

## Handling First-Time Users vs Returning Users

The `from_omniauth` method handles both cases:

**First-time users:**
- `find_or_initialize_by` creates new record
- `assign_attributes` sets profile data
- `save!` persists to database
- Organization created if doesn't exist

**Returning users:**
- `find_or_initialize_by` finds existing record
- `assign_attributes` updates profile data (name changes, etc.)
- `save!` persists updates
- Organization reference updated if changed at IdP

## Organization Assignment

Organizations come from the IdP. Create Organization model:

```ruby
# app/models/organization.rb
class Organization < ApplicationRecord
  has_many :users

  validates :external_id, presence: true, uniqueness: true
end
```

Migration:

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_organizations.rb
class CreateOrganizations < ActiveRecord::Migration[8.1]
  def change
    create_table :organizations do |t|
      t.string :external_id, null: false
      t.string :name

      t.timestamps
    end

    add_index :organizations, :external_id, unique: true
  end
end
```

## Error Handling

Handle common failure scenarios:

**IdP Unavailable:**
```ruby
# In sessions#failure
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

**User Save Failures:**
```ruby
def create
  auth = request.env['omniauth.auth']
  user = User.from_omniauth(auth)

  if user&.persisted?
    session[:user_id] = user.id
    redirect_to root_path, notice: "Welcome!"
  else
    Rails.logger.error "User creation failed for #{auth.info.email}"
    redirect_to root_path,
                alert: "Could not create your account. Please contact support."
  end
end
```

## Profile Data Mapping

The IdP provides standardized claims:

| IdP Claim | User Attribute | Notes |
|-----------|----------------|-------|
| sub | uid | Unique identifier |
| email | email | Primary email |
| name | name | Full name |
| given_name | first_name | First name |
| family_name | last_name | Last name |
| organization_id | organization_id | Foreign key |
| organization_name | - | Not stored, available in session |

Additional custom claims can be requested via the scope parameter.

## Routes Configuration

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # OmniAuth routes
  get '/auth/:provider/callback', to: 'sessions#create'
  post '/auth/:provider/callback', to: 'sessions#create' # POST for CSRF protection
  get '/auth/failure', to: 'sessions#failure'

  # Session management
  delete '/sign_out', to: 'sessions#destroy', as: :sign_out

  # Optional: explicit sign in path
  get '/sign_in', to: redirect('/auth/afal')
end
```

## View Helper for Sign In

```erb
<!-- app/views/layouts/_header.html.erb -->
<% if logged_in? %>
  <span>Signed in as <%= current_user.name %></span>
  <%= button_to "Sign Out", sign_out_path, method: :delete %>
<% else %>
  <%= link_to "Sign In", "/auth/afal" %>
<% end %>
```

## CSRF Protection

The `omniauth-rails_csrf_protection` gem requires POST requests to initiate auth. Update sign-in links to use forms:

```erb
<%= button_to "Sign In", "/auth/afal", method: :post %>
```

Or configure OmniAuth to allow GET (less secure):

```ruby
OmniAuth.config.allowed_request_methods = [:post, :get]
```

Use POST in production environments.
