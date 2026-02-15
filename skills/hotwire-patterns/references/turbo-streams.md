# Turbo Streams Reference

Detailed patterns for using Turbo Streams in AFAL Rails applications.

## Stream Actions

Turbo Streams support eight actions for DOM manipulation:

- `append` - Add content to end of container
- `prepend` - Add content to beginning of container
- `replace` - Replace entire element (including wrapper)
- `update` - Replace content inside element (keeps wrapper)
- `remove` - Remove element from DOM
- `before` - Insert content before element
- `after` - Insert content after element
- `morph` - Intelligently update element (morphdom algorithm, Rails 8+)
- `refresh` - Reload page sections (Rails 8+)

## Controller Responses with Turbo Streams

Respond to requests with `turbo_stream` format:

```ruby
class MessagesController < ApplicationController
  def create
    @message = Message.create(message_params)

    respond_to do |format|
      if @message.persisted?
        format.turbo_stream
        format.html { redirect_to messages_path }
      else
        format.turbo_stream { render turbo_stream: turbo_stream.replace("message_form", partial: "form") }
        format.html { render :new, status: :unprocessable_entity }
      end
    end
  end
end
```

## Stream Templates

Create `.turbo_stream.erb` view for automatic stream response:

```erb
<!-- app/views/messages/create.turbo_stream.erb -->
<%= turbo_stream.append "messages", @message %>
<%= turbo_stream.update "message_form", "" %>
<%= turbo_stream.replace "flash", partial: "shared/flash", locals: { notice: "Message created" } %>
```

Rails automatically renders this when format is `turbo_stream`.

## Inline Stream Responses

For simple cases, render streams directly in controller:

```ruby
def destroy
  @message = Message.find(params[:id])
  @message.destroy

  respond_to do |format|
    format.turbo_stream { render turbo_stream: turbo_stream.remove(@message) }
    format.html { redirect_to messages_path }
  end
end
```

## Multiple Target Updates

Update multiple parts of the page in single response.

**ANTI-PATTERN:** Inline multi-stream arrays in controllers are hard to read and maintain. Avoid:

```ruby
# BAD - inline stream arrays in controller
def update
  @message = Message.find(params[:id])

  if @message.update(message_params)
    render turbo_stream: [
      turbo_stream.replace(@message),
      turbo_stream.update("notification", partial: "shared/notification",
                          locals: { text: "Saved" }),
      turbo_stream.update("sidebar_stats", partial: "stats")
    ]
  else
    render turbo_stream: turbo_stream.replace("message_form", partial: "form",
                                               locals: { message: @message })
  end
end
```

**PREFERRED:** Use `.turbo_stream.erb` template files for clarity:

```ruby
# GOOD - delegate to template
def update
  @message = Message.find(params[:id])

  if @message.update(message_params)
    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to @message }
    end
  else
    render :edit, status: :unprocessable_entity
  end
end
```

```erb
<!-- app/views/messages/update.turbo_stream.erb -->
<%= turbo_stream.replace(@message) %>
<%= turbo_stream.update("notification", partial: "shared/notification",
                        locals: { text: "Saved" }) %>
<%= turbo_stream.update("sidebar_stats", partial: "stats") %>
```

Template files keep controller logic clean and make multi-stream responses easier to maintain.

## Broadcasting with Turbo Streams

Broadcast updates to multiple connected clients using ActionCable (Solid Cable in AFAL apps).

### Setup in View

Subscribe to stream updates:

```erb
<!-- app/views/messages/index.html.erb -->
<%= turbo_stream_from "messages" %>

<div id="messages">
  <%= render @messages %>
</div>
```

### Broadcasting from Controller

```ruby
class MessagesController < ApplicationController
  def create
    @message = Message.create(message_params)

    respond_to do |format|
      format.turbo_stream {
        render turbo_stream: turbo_stream.append("messages", @message)
      }
      format.html { redirect_to messages_path }
    end

    # Broadcast to all connected clients
    Turbo::StreamsChannel.broadcast_append_to(
      "messages",
      target: "messages",
      partial: "messages/message",
      locals: { message: @message }
    )
  end
end
```

Available broadcast methods:
- `broadcast_append_to`
- `broadcast_prepend_to`
- `broadcast_replace_to`
- `broadcast_update_to`
- `broadcast_remove_to`
- `broadcast_before_to`
- `broadcast_after_to`

### Broadcasting from Models

Use callbacks to broadcast changes automatically:

```ruby
class Message < ApplicationRecord
  after_create_commit { broadcast_append_to_messages }
  after_update_commit { broadcast_replace_to_messages }
  after_destroy_commit { broadcast_remove_to_messages }

  private

  def broadcast_append_to_messages
    broadcast_append_to "messages", target: "messages"
  end

  def broadcast_replace_to_messages
    broadcast_replace_to "messages"
  end

  def broadcast_remove_to_messages
    broadcast_remove_to "messages"
  end
end
```

Simplified with `broadcasts_to`:

```ruby
class Message < ApplicationRecord
  belongs_to :conversation

  broadcasts_to :conversation
end
```

Now create/update/destroy automatically broadcast to `"conversation:#{conversation_id}"` stream.

View subscribes:

```erb
<%= turbo_stream_from @conversation %>
```

### Scoped Broadcasts

Broadcast to specific user or scope:

```ruby
class Message < ApplicationRecord
  belongs_to :user

  after_create_commit -> { broadcast_append_to [user, "messages"], target: "messages" }
end
```

View subscribes:

```erb
<%= turbo_stream_from [current_user, "messages"] %>
```

## Custom Stream Actions

Define custom actions for reusable behaviors (Rails 8+):

```ruby
# app/helpers/turbo_streams_helper.rb
module TurboStreamsHelper
  def turbo_stream
    super.tap do |turbo_stream|
      turbo_stream.singleton_class.include(CustomActions)
    end
  end

  module CustomActions
    def flash(type, message)
      append "flashes", partial: "shared/flash", locals: { type: type, message: message }
    end
  end
end
```

Usage:

```erb
<%= turbo_stream.flash(:success, "Message created") %>
```

## Flash Messages with Streams

Pattern for displaying flash messages without reload:

```erb
<!-- app/views/layouts/application.html.erb -->
<div id="flash">
  <%= render "shared/flash" if flash.any? %>
</div>
```

```erb
<!-- app/views/shared/_flash.html.erb -->
<% flash.each do |type, message| %>
  <%= render Bali::AlertComponent.new(type: type) do %>
    <%= message %>
  <% end %>
<% end %>
```

Stream response:

```erb
<%= turbo_stream.update "flash", partial: "shared/flash" %>
```

For auto-dismiss, add Stimulus controller:

```erb
<div id="flash" data-controller="flash" data-flash-dismiss-after-value="3000">
  <%= render "shared/flash" if flash.any? %>
</div>
```

```javascript
// app/javascript/controllers/flash_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { dismissAfter: Number }

  connect() {
    if (this.hasDismissAfterValue && this.element.hasChildNodes()) {
      setTimeout(() => {
        this.element.innerHTML = ""
      }, this.dismissAfterValue)
    }
  }
}
```

## Morph Action (Rails 8+)

Intelligently updates DOM while preserving form state, scroll position, and focus:

```ruby
def update
  @message = Message.find(params[:id])
  @message.update(message_params)

  render turbo_stream: turbo_stream.morph(@message)
end
```

Use morph for live updates that should preserve user input state.

### Morph on Replace

Turbo 8 supports morphing on `turbo_stream.replace` with the `method: :morph` keyword:

```ruby
# Morph preserves focus, scroll position, form state
render turbo_stream: turbo_stream.replace(
  dom_id(@card, :container),
  partial: "cards/container",
  method: :morph,
  locals: { card: @card.reload }
)
```

This is preferred over the standalone `morph` action when you need fine-grained control over which element to replace while preserving state.

### Page-Level Morph Refresh

Enable page-level morphing with meta tags in your layout:

```erb
<%# In layout head - enables page-level morphing %>
<meta name="turbo-refresh-method" content="morph">
<meta name="turbo-refresh-scroll" content="preserve">
```

Broadcast real-time page refresh to connected clients:

```ruby
# Triggers page refresh for all subscribers
Turbo::StreamsChannel.broadcast_refresh_to("dashboard")
```

Views subscribe:

```erb
<%= turbo_stream_from "dashboard" %>
```

When refresh is broadcast, subscribed clients reload the page using morph, preserving scroll position and form state.

## Refresh Action (Rails 8+)

Reload specific page sections without full page reload:

```erb
<%= turbo_stream.refresh "sidebar" %>
```

## Error Handling with Streams

Handle validation errors:

```ruby
def create
  @message = Message.new(message_params)

  if @message.save
    render turbo_stream: [
      turbo_stream.append("messages", @message),
      turbo_stream.update("message_form", partial: "form", locals: { message: Message.new }),
      turbo_stream.update("flash", partial: "shared/flash")
    ]
  else
    render turbo_stream: turbo_stream.replace("message_form", partial: "form",
                                               locals: { message: @message }),
           status: :unprocessable_entity
  end
end
```

## Optimistic UI with Streams

Show immediate feedback, then update with server response:

```javascript
// app/javascript/controllers/optimistic_message_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["form", "input"]

  async submit(event) {
    event.preventDefault()

    const formData = new FormData(this.formTarget)
    const body = formData.get("message[body]")

    // Optimistic append
    const tempId = `temp-${Date.now()}`
    const messagesDiv = document.getElementById("messages")
    messagesDiv.insertAdjacentHTML("beforeend", `
      <div id="${tempId}" class="opacity-50">
        <p>${body}</p>
      </div>
    `)

    this.inputTarget.value = ""

    // Submit to server
    const response = await fetch(this.formTarget.action, {
      method: "POST",
      body: formData,
      headers: { "Accept": "text/vnd.turbo-stream.html" }
    })

    // Remove optimistic version, server response adds real version
    document.getElementById(tempId)?.remove()
  }
}
```

## Testing Turbo Streams

Minitest system test:

```ruby
test "creating a message broadcasts to stream" do
  visit messages_path

  # Open in second browser session
  using_session :second_user do
    visit messages_path
  end

  fill_in "Body", with: "Test message"
  click_on "Create"

  # Verify broadcast received in second session
  using_session :second_user do
    assert_text "Test message"
  end
end
```

Controller test:

```ruby
test "create responds with turbo stream" do
  post messages_path, params: { message: { body: "Test" } }, as: :turbo_stream

  assert_response :success
  assert_match(/turbo-stream/, @response.body)
  assert_match(/action="append"/, @response.body)
end
```

## Performance Considerations

### Broadcast Selectively

Avoid broadcasting to all users when only subset should receive:

```ruby
# BAD - broadcasts to everyone
class Message < ApplicationRecord
  after_create_commit { broadcast_append_to "messages" }
end
```

```ruby
# GOOD - broadcasts only to conversation participants
class Message < ApplicationRecord
  belongs_to :conversation
  after_create_commit { broadcast_append_to conversation }
end
```

### Cache Partials

Cache expensive partials used in broadcasts:

```ruby
Turbo::StreamsChannel.broadcast_append_to(
  "messages",
  target: "messages",
  partial: "messages/message",
  locals: { message: @message, cached: true }
)
```

```erb
<!-- app/views/messages/_message.html.erb -->
<% cache message do %>
  <div id="<%= dom_id(message) %>">
    <%= message.body %>
  </div>
<% end %>
```

### Debounce Broadcasts

For rapidly changing data, debounce broadcasts:

```ruby
class Metric < ApplicationRecord
  after_update_commit :broadcast_update_later

  private

  def broadcast_update_later
    BroadcastMetricUpdateJob.set(wait: 1.second).perform_later(id)
  end
end

class BroadcastMetricUpdateJob < ApplicationJob
  def perform(metric_id)
    metric = Metric.find(metric_id)
    metric.broadcast_replace_to "metrics"
  end
end
```

## Common Patterns

### Inline Editing with Streams

```ruby
def edit
  @message = Message.find(params[:id])
  render turbo_stream: turbo_stream.replace(@message, partial: "form", locals: { message: @message })
end

def update
  @message = Message.find(params[:id])

  if @message.update(message_params)
    render turbo_stream: turbo_stream.replace(@message)
  else
    render turbo_stream: turbo_stream.replace("message_form", partial: "form",
                                               locals: { message: @message }),
           status: :unprocessable_entity
  end
end
```

### Pagination with Streams

```ruby
def index
  @messages = Message.page(params[:page])

  respond_to do |format|
    format.html
    format.turbo_stream
  end
end
```

```erb
<!-- index.turbo_stream.erb -->
<%= turbo_stream.append "messages", @messages %>
<%= turbo_stream.replace "pagination", partial: "pagination" %>
```

### Live Search with Streams

```ruby
def search
  @messages = Message.where("body LIKE ?", "%#{params[:q]}%")

  render turbo_stream: turbo_stream.update("search_results", partial: "messages",
                                            locals: { messages: @messages })
end
```

```erb
<%= form_with url: search_messages_path, method: :get,
              data: { controller: "auto-submit", turbo_frame: "search_results" } do |f| %>
  <%= f.search_field :q, data: { action: "input->auto-submit#submit" } %>
<% end %>

<turbo-frame id="search_results">
  <%= render @messages %>
</turbo-frame>
```
