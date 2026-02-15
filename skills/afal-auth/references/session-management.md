# Session Management

Patterns for managing user sessions, organization context, and advanced session scenarios in AFAL Rails applications.

## Session Storage

Rails uses encrypted cookie-based sessions by default. This is appropriate for AFAL apps.

```ruby
# config/initializers/session_store.rb
Rails.application.config.session_store :cookie_store,
  key: '_afal_app_session',
  secure: Rails.env.production?, # HTTPS only in production
  httponly: true,                # Prevent JavaScript access
  same_site: :lax                # CSRF protection
```

The session stores only the `user_id`. User data loads from the database on each request.

## Current Pattern

Use `Current` attributes for request-scoped data:

```ruby
# app/models/current.rb
class Current < ActiveSupport::CurrentAttributes
  attribute :user, :organization
end
```

Set in ApplicationController:

```ruby
# app/controllers/concerns/set_current.rb
module SetCurrent
  extend ActiveSupport::Concern

  included do
    before_action :set_current_attributes
  end

  private

  def set_current_attributes
    Current.user = current_user
    Current.organization = current_user&.organization
  end
end

# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  include Authentication
  include SetCurrent
end
```

Now `Current.user` and `Current.organization` are available throughout the request lifecycle (models, jobs, etc.).

## Session Timeout

Implement timeout using session timestamps:

```ruby
# app/controllers/concerns/authentication.rb
module Authentication
  extend ActiveSupport::Concern

  TIMEOUT_DURATION = 2.hours

  included do
    before_action :check_session_timeout
  end

  private

  def check_session_timeout
    return unless logged_in?

    last_activity = session[:last_activity_at]
    if last_activity && Time.zone.parse(last_activity) < TIMEOUT_DURATION.ago
      session.delete(:user_id)
      session.delete(:last_activity_at)
      redirect_to root_path, alert: "Your session has expired. Please sign in again."
    else
      session[:last_activity_at] = Time.current.to_s
    end
  end

  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end

  def logged_in?
    current_user.present?
  end

  def authenticate_user!
    unless logged_in?
      session[:return_to] = request.fullpath
      redirect_to root_path, alert: "Please sign in to continue"
    end
  end
end
```

## Remember Me

For extended sessions, store a remember token:

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_secure_token :remember_token

  def remember_me
    regenerate_remember_token
  end

  def forget_me
    update(remember_token: nil)
  end
end

# Migration
class AddRememberTokenToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :remember_token, :string
    add_index :users, :remember_token, unique: true
  end
end
```

In SessionsController:

```ruby
def create
  user = User.from_omniauth(request.env['omniauth.auth'])

  if user.persisted?
    session[:user_id] = user.id

    if params[:remember_me] == '1'
      user.remember_me
      cookies.permanent.encrypted[:remember_token] = user.remember_token
    end

    redirect_to root_path
  end
end

def destroy
  current_user&.forget_me
  cookies.delete(:remember_token)
  session.delete(:user_id)
  redirect_to root_path
end
```

Update authentication to check remember token:

```ruby
def current_user
  @current_user ||= find_current_user
end

def find_current_user
  if session[:user_id]
    User.find_by(id: session[:user_id])
  elsif cookies.encrypted[:remember_token]
    User.find_by(remember_token: cookies.encrypted[:remember_token])
  end
end
```

## Multi-Organization Switching

Users may belong to multiple organizations. Allow switching:

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_many :organization_memberships
  has_many :organizations, through: :organization_memberships
  belongs_to :current_organization, class_name: 'Organization', optional: true

  def switch_organization(organization)
    return false unless organizations.include?(organization)
    update(current_organization: organization)
  end
end

# app/models/organization_membership.rb
class OrganizationMembership < ApplicationRecord
  belongs_to :user
  belongs_to :organization

  enum :role, { member: 0, admin: 1 }
end
```

Controller for switching:

```ruby
# app/controllers/organization_switches_controller.rb
class OrganizationSwitchesController < ApplicationController
  before_action :authenticate_user!

  def create
    organization = current_user.organizations.find(params[:organization_id])

    if current_user.switch_organization(organization)
      redirect_to root_path, notice: "Switched to #{organization.name}"
    else
      redirect_to root_path, alert: "Could not switch organizations"
    end
  rescue ActiveRecord::RecordNotFound
    redirect_to root_path, alert: "Organization not found"
  end
end
```

Update SetCurrent:

```ruby
def set_current_attributes
  Current.user = current_user
  Current.organization = current_user&.current_organization || current_user&.organization
end
```

## Impersonation

Admins can act as other users for support:

```ruby
# app/models/user.rb
class User < ApplicationRecord
  def admin?
    # Define admin check based on your requirements
    role == 'admin'
  end
end

# app/controllers/concerns/impersonation.rb
module Impersonation
  extend ActiveSupport::Concern

  included do
    helper_method :impersonating?
  end

  def impersonate(user)
    return unless current_user.admin?

    session[:impersonated_user_id] = user.id
    session[:impersonator_id] = current_user.id
  end

  def stop_impersonating
    session.delete(:impersonated_user_id)
    session.delete(:impersonator_id)
  end

  def impersonating?
    session[:impersonated_user_id].present?
  end

  def current_user
    @current_user ||= begin
      if impersonating?
        User.find_by(id: session[:impersonated_user_id])
      else
        User.find_by(id: session[:user_id])
      end
    end
  end
end

# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  include Authentication
  include Impersonation
  include SetCurrent
end
```

Impersonation controller:

```ruby
# app/controllers/admin/impersonations_controller.rb
class Admin::ImpersonationsController < ApplicationController
  before_action :authenticate_user!
  before_action :require_admin!

  def create
    user = User.find(params[:user_id])
    impersonate(user)
    redirect_to root_path, notice: "Now impersonating #{user.name}"
  end

  def destroy
    stop_impersonating
    redirect_to admin_users_path, notice: "Stopped impersonating"
  end

  private

  def require_admin!
    redirect_to root_path, alert: "Access denied" unless current_user.admin?
  end
end
```

Show impersonation banner:

```erb
<!-- app/views/layouts/_impersonation_banner.html.erb -->
<% if impersonating? %>
  <div class="alert alert-warning">
    Impersonating <%= current_user.name %>
    <%= button_to "Stop Impersonating",
                  admin_impersonation_path,
                  method: :delete %>
  </div>
<% end %>
```

## Session Security Best Practices

### 1. Secure Session Configuration

```ruby
# config/initializers/session_store.rb
Rails.application.config.session_store :cookie_store,
  key: '_afal_app_session',
  secure: Rails.env.production?,
  httponly: true,
  same_site: :lax,
  expire_after: 2.hours
```

### 2. Session Cleanup on Logout

Always clear all session data:

```ruby
def destroy
  current_user&.forget_me if current_user.respond_to?(:forget_me)
  cookies.delete(:remember_token)
  reset_session # Clears entire session, prevents fixation
  redirect_to root_path, notice: "Signed out successfully"
end
```

### 3. Session Fixation Protection

Rails provides automatic protection. After authentication:

```ruby
def create
  user = User.from_omniauth(request.env['omniauth.auth'])

  if user.persisted?
    reset_session # Clear any existing session
    session[:user_id] = user.id
    redirect_to root_path
  end
end
```

### 4. HTTPS Enforcement

```ruby
# config/environments/production.rb
config.force_ssl = true
```

### 5. Secret Key Management

Never commit `config/master.key`. Use encrypted credentials:

```bash
rails credentials:edit
```

```yaml
# config/credentials.yml.enc
afal_idp:
  client_id: xxx
  client_secret: yyy
```

Access in code:

```ruby
Rails.application.credentials.afal_idp[:client_id]
```

## Database Session Store (Alternative)

For apps with strict session requirements, use database storage:

```ruby
# Gemfile
gem 'activerecord-session_store'
```

```bash
rails generate active_record:session_migration
rails db:migrate
```

```ruby
# config/initializers/session_store.rb
Rails.application.config.session_store :active_record_store,
  key: '_afal_app_session',
  expire_after: 2.hours
```

Benefits:
- Server-side storage (more secure)
- Larger session data capacity
- Explicit session expiration via database cleanup

Tradeoffs:
- Database load on every request
- Requires session cleanup job

## Session Cleanup Job

If using database sessions:

```ruby
# app/jobs/session_cleanup_job.rb
class SessionCleanupJob < ApplicationJob
  queue_as :default

  def perform
    ActiveRecord::SessionStore::Session
      .where('updated_at < ?', 2.hours.ago)
      .delete_all
  end
end

# config/initializers/session_cleanup.rb
# Run every hour
Rails.application.config.after_initialize do
  if Rails.env.production?
    SessionCleanupJob.set(wait: 1.hour).perform_later
  end
end
```
