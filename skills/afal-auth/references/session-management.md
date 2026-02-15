# Session Management

Database-backed session management following the 37signals pattern used in AFAL Rails applications.

## Session Model

Sessions are stored in the database for audit trail and explicit lifecycle management:

```ruby
class Session < ApplicationRecord
  belongs_to :user
end
```

Migration:

```ruby
class CreateSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :user_agent
      t.string :ip_address
      t.timestamps
    end
  end
end
```

Each login creates a new Session record. This provides:
- Audit trail of all sign-ins
- User agent and IP tracking
- Ability to list/revoke active sessions
- No reliance on cookie-stored session data

## Cookie-Based Session Tracking

Sessions are tracked via `cookies.signed[:session_id]`, NOT Rails' `session[:user_id]`:

```ruby
# Setting the cookie (in SessionsController#create)
cookies.signed[:session_id] = {
  value: session.id,
  httponly: true,
  secure: Rails.env.production?
}

# Clearing the cookie (in SessionsController#destroy)
cookies.delete(:session_id)
```

Why `cookies.signed` instead of `session`:
- The Session model provides server-side state
- `cookies.signed` is tamper-proof (signed with app secret)
- The session record can be destroyed server-side to force logout
- No dependency on Rails session store configuration

## Authentication Concern

The Authentication concern implements the opt-out pattern (all actions require auth by default):

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
- **Opt-out model**: All controllers require auth by default. Use `allow_unauthenticated_access` to opt out.
- **`resume_session`** sets both `Current.session` and `Current.user` from the database
- **`current_user`** reads from `Current.user` -- no database query after `resume_session`
- **No `authenticate_user!`** -- this is not Devise. The method is `require_authentication`.

## Current Attributes

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

When `Current.user` is set, `Current.account` is automatically set too. This enables:
- Multi-tenancy scoping via `Current.account`
- Model defaults: `belongs_to :creator, default: -> { Current.user }`
- Model defaults: `belongs_to :account, default: -> { Current.account }`

## ApplicationController Setup

```ruby
class ApplicationController < ActionController::Base
  include Authentication
end
```

That's it. The Authentication concern handles everything. No separate `SetCurrent` concern needed -- `resume_session` sets Current attributes directly.

## Opting Out of Authentication

Use `allow_unauthenticated_access` in controllers that should be publicly accessible:

```ruby
class HomeController < ApplicationController
  allow_unauthenticated_access only: [:index, :show]
end

class SessionsController < ApplicationController
  allow_unauthenticated_access only: [:new, :create, :failure]
end
```

## Multi-Tenancy

Users belong to organizations. The IdP provides organization data in the auth response. `Current.account` is set automatically when `Current.user` is assigned.

Models use defaults for automatic association:

```ruby
class Card < ApplicationRecord
  belongs_to :creator, class_name: "User", default: -> { Current.user }
  belongs_to :account, default: -> { Current.account }
end
```

This eliminates manual assignment in controllers -- records automatically get the current user and account.

## Session Cleanup

Periodically clean up old sessions:

```ruby
# app/jobs/session_cleanup_job.rb
class SessionCleanupJob < ApplicationJob
  queue_as :default

  def perform
    Session.where("updated_at < ?", 30.days.ago).delete_all
  end
end
```

Schedule via Solid Queue recurring jobs:

```yaml
# config/recurring.yml
cleanup_expired_sessions:
  class: SessionCleanupJob
  schedule: every day at 04:00
```

## Listing Active Sessions

Allow users to see and revoke their sessions:

```ruby
# app/controllers/sessions_controller.rb
def index
  @sessions = Current.user.sessions.order(created_at: :desc)
end

def destroy
  session = Current.user.sessions.find(params[:id])
  session.destroy
  redirect_to sessions_path, notice: "Session revoked"
end
```

## Security Best Practices

### HTTPS Enforcement

```ruby
# config/environments/production.rb
config.force_ssl = true
```

### Cookie Security

Always set `httponly: true` and `secure: true` in production:

```ruby
cookies.signed[:session_id] = {
  value: session.id,
  httponly: true,        # Prevent JavaScript access
  secure: Rails.env.production?  # HTTPS only in production
}
```

### Secret Key Management

Never commit `config/master.key`. Use encrypted credentials:

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

Access in code:

```ruby
Rails.application.credentials.dig(:idp, :client_id)
```

## Common Mistakes

| Mistake | Why It Fails | Solution |
|---------|-------------|----------|
| `session[:user_id]` | No audit trail, no revocation | Use Session model + `cookies.signed[:session_id]` |
| `authenticate_user!` | Devise pattern, not AFAL | Use `require_authentication` (automatic via concern) |
| `skip_before_action :authenticate_user!` | Wrong method name | Use `allow_unauthenticated_access` |
| Separate `SetCurrent` concern | Unnecessary complexity | `resume_session` in Authentication sets Current directly |
| `@current_user ||= User.find(...)` | Queries DB repeatedly | Use `Current.user` (set once in `resume_session`) |
| Cookie store for sessions | No server-side revocation | Use database-backed Session model |
