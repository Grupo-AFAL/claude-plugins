# Turbo Frames Reference

Detailed patterns for using Turbo Frames in AFAL Rails applications.

## Basic Frame Wrapping

Frames create independent navigation contexts. Navigation inside a frame only affects that frame.

```erb
<!-- app/views/messages/index.html.erb -->
<turbo-frame id="messages">
  <%= render @messages %>
  <%= link_to "New Message", new_message_path %>
</turbo-frame>
```

When clicking "New Message", only the frame content updates.

## Lazy Loading Frames

Load frame content after initial page load with the `src` attribute.

```erb
<!-- Eager loading placeholder -->
<turbo-frame id="comments" src="<%= comments_post_path(@post) %>">
  <p>Loading comments...</p>
</turbo-frame>
```

With `loading="lazy"`, frame loads when scrolled into view:

```erb
<turbo-frame id="analytics" src="<%= analytics_path %>" loading="lazy">
  <p>Loading analytics...</p>
</turbo-frame>
```

Controller action:

```ruby
def comments
  @comments = @post.comments.order(created_at: :desc)

  render turbo_frame: "comments" # renders views/posts/comments.html.erb
end
```

View `views/posts/comments.html.erb`:

```erb
<turbo-frame id="comments">
  <%= render @comments %>
</turbo-frame>
```

## Frame Targeting

Links and forms can target specific frames with `data-turbo-frame`.

```erb
<!-- Click this link outside the frame, but update the frame -->
<%= link_to "Edit Message", edit_message_path(@message),
            data: { turbo_frame: "message_#{@message.id}" } %>

<turbo-frame id="message_<%= @message.id %>">
  <%= render @message %>
</turbo-frame>
```

Special targets:
- `_top` - Replace entire page (break out of frame)
- `_self` - Default, targets current frame
- Any frame ID - Target that specific frame

## Breaking Out of Frames

Use `data-turbo-frame="_top"` to navigate the entire page:

```erb
<turbo-frame id="message_form">
  <%= form_with model: @message do |f| %>
    <%= f.text_field :body %>
    <%= f.submit "Save" %>
    <%= link_to "Cancel", messages_path, data: { turbo_frame: "_top" } %>
  <% end %>
</turbo-frame>
```

Or in controller:

```ruby
def create
  @message = Message.create(message_params)

  if @message.persisted?
    redirect_to messages_path # Full page navigation
  else
    render :new, status: :unprocessable_entity # Stay in frame
  end
end
```

## Inline Editing Pattern

Click to edit, submit to save. Uses frame swap between show and edit states.

List view:

```erb
<!-- app/views/messages/_message.html.erb -->
<turbo-frame id="message_<%= message.id %>">
  <div>
    <p><%= message.body %></p>
    <%= link_to "Edit", edit_message_path(message) %>
  </div>
</turbo-frame>
```

Edit view:

```erb
<!-- app/views/messages/edit.html.erb -->
<turbo-frame id="message_<%= @message.id %>">
  <%= form_with model: @message do |f| %>
    <%= f.text_area :body %>
    <%= f.submit "Save" %>
    <%= link_to "Cancel", @message %>
  <% end %>
</turbo-frame>
```

Controller:

```ruby
def edit
  # renders edit.html.erb wrapped in matching frame
end

def update
  if @message.update(message_params)
    redirect_to @message # GET /messages/1, renders show in frame
  else
    render :edit, status: :unprocessable_entity
  end
end
```

Show view:

```erb
<!-- app/views/messages/show.html.erb -->
<turbo-frame id="message_<%= @message.id %>">
  <%= render @message %>
</turbo-frame>
```

## Modal/Drawer Frames

Use frames to load modal content without full page navigation.

Main page:

```erb
<!-- app/views/messages/index.html.erb -->
<%= link_to "New Message", new_message_path, data: { turbo_frame: "modal" } %>

<turbo-frame id="modal"></turbo-frame>
```

Modal form:

```erb
<!-- app/views/messages/new.html.erb -->
<turbo-frame id="modal">
  <%= render Bali::ModalComponent.new(open: true) do %>
    <h2>New Message</h2>
    <%= form_with model: @message, data: { turbo_frame: "_top" } do |f| %>
      <%= f.text_area :body %>
      <%= f.submit "Create" %>
    <% end %>
  <% end %>
</turbo-frame>
```

On successful form submit, `data-turbo-frame="_top"` redirects entire page. On validation error, re-render the frame.

For better UX, close modal on background click using Stimulus:

```erb
<turbo-frame id="modal">
  <%= render Bali::ModalComponent.new(
    open: true,
    data: { controller: "modal-closer", action: "click->modal-closer#close" }
  ) do %>
    <!-- form content -->
  <% end %>
</turbo-frame>
```

```javascript
// app/javascript/controllers/modal_closer_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  close(event) {
    if (event.target === this.element) {
      this.element.innerHTML = "" // Clear frame
    }
  }
}
```

## Tab Content with Frames

Each tab panel is a lazy-loaded frame.

```erb
<%= render Bali::TabsComponent.new do |tabs| %>
  <% tabs.tab "Profile", active: true %>
  <% tabs.tab "Settings" %>
  <% tabs.tab "Activity" %>
<% end %>

<turbo-frame id="profile_tab" src="<%= profile_user_path(@user) %>">
  Loading profile...
</turbo-frame>

<turbo-frame id="settings_tab">
  <!-- Initially empty, loads on tab click -->
</turbo-frame>

<turbo-frame id="activity_tab">
  <!-- Initially empty, loads on tab click -->
</turbo-frame>
```

Tab links target specific frames:

```erb
<%= link_to "Profile", profile_user_path(@user), data: { turbo_frame: "profile_tab" } %>
<%= link_to "Settings", settings_user_path(@user), data: { turbo_frame: "settings_tab" } %>
```

## Nested Frames

Frames can be nested. Inner frame navigation only affects inner frame.

```erb
<turbo-frame id="post_<%= @post.id %>">
  <h2><%= @post.title %></h2>

  <turbo-frame id="comments_<%= @post.id %>" src="<%= comments_post_path(@post) %>">
    Loading comments...
  </turbo-frame>
</turbo-frame>
```

When navigating in the comments frame, the post frame remains unchanged.

## Frame Navigation and URL Updating

By default, navigating within a frame does not update the browser URL. To update URL:

```erb
<turbo-frame id="search_results" data-turbo-action="advance">
  <%= render @results %>
  <%= link_to "Next Page", search_path(page: @next_page) %>
</turbo-frame>
```

`data-turbo-action="advance"` pushes new URL to browser history. Use `"replace"` to replace current URL without adding history entry.

## Error Handling in Frames

When a frame request returns 4xx/5xx, Turbo replaces frame content with response body.

Controller:

```ruby
def update
  if @message.update(message_params)
    redirect_to @message
  else
    render :edit, status: :unprocessable_entity # Renders form with errors in frame
  end
end
```

View shows validation errors:

```erb
<turbo-frame id="message_<%= @message.id %>">
  <%= form_with model: @message do |f| %>
    <% if @message.errors.any? %>
      <div class="alert alert-error">
        <%= @message.errors.full_messages.join(", ") %>
      </div>
    <% end %>
    <%= f.text_area :body %>
    <%= f.submit %>
  <% end %>
</turbo-frame>
```

## Common Pitfalls

### Missing Frame ID on Response

Server must render frame with matching ID:

```ruby
# BAD - renders layout without frame
def show
  @message = Message.find(params[:id])
end
```

```ruby
# GOOD - renders view with matching frame
def show
  @message = Message.find(params[:id])
  # view contains <turbo-frame id="message_#{@message.id}">
end
```

### Frame Not Found

If response does not include matching frame ID, Turbo shows error. Solutions:

1. Ensure server response includes frame with matching ID
2. Use `data-turbo-frame="_top"` to navigate full page
3. Wrap response content in frame

### Unique IDs Required

Frame IDs must be unique on page. For collections:

```erb
<% @messages.each do |message| %>
  <turbo-frame id="message_<%= message.id %>">
    <%= render message %>
  </turbo-frame>
<% end %>
```

### Infinite Lazy Loading

Frame with `src` loads once. To reload, change `src` attribute or use Turbo Streams to replace frame.

## Performance Considerations

- Lazy frames reduce initial page load
- Avoid too many lazy frames (network overhead)
- Use `loading="lazy"` for below-fold content
- Cache frame responses when possible

```ruby
def analytics
  @analytics = Rails.cache.fetch("analytics/#{Current.user.id}", expires_in: 5.minutes) do
    Analytics.compute_for(Current.user)
  end

  render turbo_frame: "analytics"
end
```
