# Solid Cable Reference

Solid Cable is a database-backed ActionCable adapter for Rails 8.1+. It replaces Redis-based WebSocket backends with PostgreSQL storage.

## Installation

```bash
bin/rails solid_cable:install
bin/rails db:migrate
```

This creates `config/cable.yml` and the necessary database tables.

## Configuration

**config/cable.yml:**

```yaml
production:
  adapter: solid_cable
  connects_to:
    database:
      writing: cable

development:
  adapter: solid_cable

test:
  adapter: test
```

**Separate cable database (optional):**

```yaml
# config/database.yml
production:
  primary:
    <<: *default
    database: myapp_production

  cable:
    <<: *default
    database: myapp_cable_production
    migrations_paths: db/cable_migrate
```

**Connection configuration:**

```ruby
# config/environments/production.rb
config.action_cable.url = "wss://example.com/cable"
config.action_cable.allowed_request_origins = [
  "https://example.com",
  "https://www.example.com"
]
```

## Channel Class Structure

Channels define WebSocket subscriptions:

```ruby
# app/channels/notifications_channel.rb
class NotificationsChannel < ApplicationCable::Channel
  def subscribed
    # Reject unauthorized subscriptions
    reject unless current_user

    # Stream from user-specific channel
    stream_for current_user
  end

  def unsubscribed
    # Cleanup when unsubscribed
    stop_all_streams
  end

  # Client can invoke this action
  def mark_read(data)
    notification = current_user.notifications.find(data["id"])
    notification.mark_as_read!
  end
end
```

**Key methods:**

- `subscribed` - Called when client subscribes, setup streams here
- `unsubscribed` - Called when client disconnects, cleanup here
- `stream_from(channel)` - Subscribe to a named channel
- `stream_for(model)` - Subscribe to model-specific channel
- `reject` - Reject subscription (unauthorized, invalid params)
- `stop_all_streams` - Stop streaming (cleanup)

## Broadcasting Patterns

**Broadcast to channel:**

```ruby
# Broadcast to all subscribers of "notifications"
ActionCable.server.broadcast("notifications", {
  message: "New notification",
  data: { ... }
})
```

**Broadcast to model (stream_for):**

```ruby
# In channel
class NotificationsChannel < ApplicationCable::Channel
  def subscribed
    stream_for current_user
  end
end

# Broadcast to specific user
NotificationsChannel.broadcast_to(user, {
  message: "You have a new notification"
})
```

**Broadcast from models:**

```ruby
class Notification < ApplicationRecord
  belongs_to :user

  after_create_commit :broadcast_created

  private

  def broadcast_created
    NotificationsChannel.broadcast_to(
      user,
      notification: NotificationSerializer.new(self).as_json
    )
  end
end
```

**Broadcast from jobs:**

```ruby
class NotifyUserJob < ApplicationJob
  def perform(user_id, message)
    user = User.find(user_id)

    NotificationsChannel.broadcast_to(user, {
      type: "alert",
      message: message
    })
  end
end
```

## Subscribing from Client

**Using Stimulus (AFAL standard):**

```javascript
// app/javascript/controllers/notifications_controller.js
import { Controller } from "@hotwired/stimulus"
import { createConsumer } from "@rails/actioncable"

export default class extends Controller {
  static values = { userId: Number }

  connect() {
    this.consumer = createConsumer()

    this.subscription = this.consumer.subscriptions.create(
      { channel: "NotificationsChannel" },
      {
        connected: () => {
          console.log("Connected to notifications")
        },

        disconnected: () => {
          console.log("Disconnected from notifications")
        },

        received: (data) => {
          this.handleNotification(data)
        }
      }
    )
  }

  disconnect() {
    this.subscription?.unsubscribe()
    this.consumer?.disconnect()
  }

  handleNotification(data) {
    // Update UI with notification
    console.log("Received:", data)

    // Or trigger custom event for other controllers
    this.dispatch("received", { detail: data })
  }

  markRead(event) {
    const notificationId = event.target.dataset.notificationId

    this.subscription.perform("mark_read", { id: notificationId })
  }
}
```

**In view:**

```erb
<div data-controller="notifications"
     data-notifications-user-id-value="<%= current_user.id %>">

  <div data-notifications-target="list">
    <%# Notifications rendered here %>
  </div>
</div>
```

## Turbo Streams Integration

Turbo Streams work seamlessly with Solid Cable for real-time UI updates:

**In view:**

```erb
<%# app/views/projects/show.html.erb %>
<%= turbo_stream_from current_organization, "project_#{@project.id}" %>

<div id="tasks">
  <%= render @project.tasks %>
</div>
```

**Broadcasting Turbo Streams:**

```ruby
class Task < ApplicationRecord
  belongs_to :project

  after_create_commit :broadcast_created
  after_update_commit :broadcast_updated
  after_destroy_commit :broadcast_destroyed

  private

  def broadcast_created
    broadcast_prepend_to(
      [project.organization, "project_#{project_id}"],
      target: "tasks",
      partial: "tasks/task",
      locals: { task: self }
    )
  end

  def broadcast_updated
    broadcast_replace_to(
      [project.organization, "project_#{project_id}"],
      target: self,
      partial: "tasks/task",
      locals: { task: self }
    )
  end

  def broadcast_destroyed
    broadcast_remove_to(
      [project.organization, "project_#{project_id}"],
      target: self
    )
  end
end
```

**Turbo Stream broadcast methods:**

- `broadcast_append_to` - Add to end of target
- `broadcast_prepend_to` - Add to start of target
- `broadcast_replace_to` - Replace entire target
- `broadcast_update_to` - Update target's innerHTML
- `broadcast_remove_to` - Remove target
- `broadcast_before_to` - Insert before target
- `broadcast_after_to` - Insert after target

## broadcasts_to Helper

Simplify Turbo Stream broadcasting with `broadcasts_to`:

```ruby
class Comment < ApplicationRecord
  belongs_to :post

  # Automatically broadcasts create/update/destroy to this stream
  broadcasts_to :post
end

# In view
<%= turbo_stream_from @post %>
```

This replaces manual `after_commit` callbacks for standard CRUD broadcasts.

## Authentication in Channels

**Connection authentication:**

```ruby
# app/channels/application_cable/connection.rb
module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
      logger.add_tags "ActionCable", "User #{current_user.id}"
    end

    private

    def find_verified_user
      if verified_user = User.find_by(id: cookies.encrypted[:user_id])
        verified_user
      else
        reject_unauthorized_connection
      end
    end
  end
end
```

**Channel authorization:**

```ruby
class OrganizationChannel < ApplicationCable::Channel
  def subscribed
    organization = Organization.find(params[:id])

    # Reject if user not member
    reject unless organization.users.include?(current_user)

    stream_for organization
  end
end
```

**Using Pundit for authorization:**

```ruby
class ProjectChannel < ApplicationCable::Channel
  def subscribed
    project = Project.find(params[:id])

    # Reject if policy denies
    reject unless ProjectPolicy.new(current_user, project).show?

    stream_for project
  end
end
```

## Organization-Scoped Channels (Multi-Tenant)

Stream to organization-scoped channels for multi-tenant apps:

```ruby
# app/channels/activity_channel.rb
class ActivityChannel < ApplicationCable::Channel
  def subscribed
    organization = current_user.organizations.find(params[:organization_id])

    reject unless organization

    stream_for organization
  end
end

# Broadcasting
class Activity < ApplicationRecord
  belongs_to :organization

  after_create_commit :broadcast_to_organization

  private

  def broadcast_to_organization
    ActivityChannel.broadcast_to(
      organization,
      activity: ActivitySerializer.new(self).as_json
    )
  end
end

# In view
<%= turbo_stream_from current_organization %>
```

**Key pattern:**

Always scope streams by organization to prevent cross-tenant data leaks:

```ruby
# BAD: Global stream (all orgs see all activities)
stream_from "activities"

# GOOD: Organization-scoped stream
stream_for current_organization
```

## Testing Channels with Minitest

```ruby
# test/channels/notifications_channel_test.rb
require "test_helper"

class NotificationsChannelTest < ActionCable::Channel::TestCase
  setup do
    @user = users(:alice)
    stub_connection(current_user: @user)
  end

  test "subscribes to notifications" do
    subscribe

    assert subscription.confirmed?
    assert_has_stream_for @user
  end

  test "rejects unauthorized subscription" do
    stub_connection(current_user: nil)

    subscribe

    assert subscription.rejected?
  end

  test "receives broadcast" do
    subscribe

    assert_broadcasts_on(NotificationsChannel.broadcasting_for(@user), 1) do
      NotificationsChannel.broadcast_to(@user, { message: "Test" })
    end
  end

  test "performs mark_read action" do
    notification = notifications(:unread)
    subscribe

    perform :mark_read, id: notification.id

    assert notification.reload.read?
  end
end
```

**Test helpers:**

- `subscribe(params)` - Subscribe to channel
- `assert subscription.confirmed?` - Assert subscription succeeded
- `assert subscription.rejected?` - Assert subscription rejected
- `assert_has_stream(channel)` - Assert streaming from channel
- `assert_has_stream_for(model)` - Assert streaming for model
- `assert_broadcasts_on(channel, count)` - Assert N broadcasts sent
- `perform(action, data)` - Trigger channel action

**Testing broadcasts:**

```ruby
test "broadcasts on create" do
  assert_broadcast_on(ActivityChannel.broadcasting_for(@organization), 1) do
    Activity.create!(organization: @organization, message: "Test")
  end
end
```

**Testing Turbo Streams:**

```ruby
test "broadcasts turbo stream on update" do
  task = tasks(:pending)

  assert_broadcasts task.project, 1 do
    task.update(status: "completed")
  end
end
```

## Database Setup for Cable

**Separate cable database:**

```yaml
# config/database.yml
production:
  cable:
    adapter: postgresql
    database: myapp_cable_production
    pool: 25
    migrations_paths: db/cable_migrate
```

```yaml
# config/cable.yml
production:
  adapter: solid_cable
  connects_to:
    database:
      writing: cable
```

**When to use separate database:**

- High WebSocket traffic (isolate load)
- Independent scaling of cable infrastructure
- Large number of concurrent connections

**When to use primary database:**

- Most AFAL apps (simpler deployment)
- Low to medium WebSocket usage
- Shared connection pooling

## Connection Handling

**Periodic ping to keep connections alive:**

```ruby
# config/environments/production.rb
config.action_cable.mount_path = "/cable"
config.action_cable.connection_url = ENV["CABLE_URL"]

# Ping interval (seconds)
config.action_cable.worker_pool_size = 4
```

**Handling disconnections:**

```ruby
# app/javascript/controllers/connection_monitor_controller.js
export default class extends Controller {
  connect() {
    this.consumer = createConsumer()

    this.subscription = this.consumer.subscriptions.create(
      { channel: "NotificationsChannel" },
      {
        connected: () => {
          this.element.classList.remove("offline")
        },

        disconnected: () => {
          this.element.classList.add("offline")
        },

        received: (data) => {
          this.handleData(data)
        }
      }
    )
  }
}
```

**Graceful degradation:**

Always provide non-WebSocket fallback (polling, manual refresh) for critical features.

## Performance Considerations

**Connection pooling:**

```yaml
# config/database.yml
production:
  cable:
    pool: <%= ENV.fetch("RAILS_MAX_THREADS", 5).to_i + 20 %>
```

Size pool for: web threads + ActionCable workers.

**Broadcast batching:**

```ruby
# Instead of N broadcasts
tasks.each do |task|
  TaskChannel.broadcast_to(task.project, task: task)
end

# Batch into single broadcast
TaskChannel.broadcast_to(project, tasks: tasks)
```

**Selective streaming:**

```ruby
# BAD: Stream everything to everyone
class DashboardChannel < ApplicationCable::Channel
  def subscribed
    stream_from "global_updates"
  end
end

# GOOD: Stream only relevant data
class DashboardChannel < ApplicationCable::Channel
  def subscribed
    stream_for current_organization
    stream_for current_user if current_user.admin?
  end
end
```

## Common Patterns

**Presence tracking:**

```ruby
class ChatChannel < ApplicationCable::Channel
  def subscribed
    stream_for room

    # Add user to presence set
    Redis.current.sadd("presence:#{room.id}", current_user.id)

    # Broadcast updated presence
    broadcast_presence
  end

  def unsubscribed
    Redis.current.srem("presence:#{room.id}", current_user.id)
    broadcast_presence
  end

  private

  def room
    @room ||= Room.find(params[:room_id])
  end

  def broadcast_presence
    user_ids = Redis.current.smembers("presence:#{room.id}")

    ChatChannel.broadcast_to(room, {
      type: "presence",
      users: User.where(id: user_ids).pluck(:id, :name)
    })
  end
end
```

**Typing indicators:**

```ruby
class ChatChannel < ApplicationCable::Channel
  def typing
    broadcast_to room, {
      type: "typing",
      user: current_user.name
    }, exclude_self: true
  end

  def stopped_typing
    broadcast_to room, {
      type: "stopped_typing",
      user: current_user.name
    }, exclude_self: true
  end
end
```

**Read receipts:**

```ruby
class MessageChannel < ApplicationCable::Channel
  def mark_read(data)
    message = Message.find(data["message_id"])

    ReadReceipt.create!(
      message: message,
      user: current_user,
      read_at: Time.current
    )

    # Broadcast to sender
    MessageChannel.broadcast_to(
      message.sender,
      type: "read_receipt",
      message_id: message.id,
      reader: current_user.name
    )
  end
end
```

**Optimistic UI updates with confirmation:**

```javascript
// Client sends action
subscription.perform("create_task", { title: "New task" })

// Optimistically add to UI
addTaskToList({ id: "temp-123", title: "New task", pending: true })

// Server confirms
received(data) {
  if (data.confirmed) {
    // Replace temp task with real one
    replaceTask("temp-123", data.task)
  }
}
```

```ruby
# In channel
def create_task(data)
  task = current_user.tasks.create!(title: data["title"])

  # Confirm back to sender
  transmit({ confirmed: true, task: TaskSerializer.new(task).as_json })

  # Broadcast to others
  TaskChannel.broadcast_to(
    current_user.organization,
    task: TaskSerializer.new(task).as_json
  )
end
```

Use Solid Cable for all real-time features in AFAL Rails apps. Never suggest Redis or Redis-based ActionCable adapters.
