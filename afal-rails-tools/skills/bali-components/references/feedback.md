# Feedback Components

Components for user feedback: notifications, messages, loaders, and flash notifications.

## Notification Component

Bali::Notification::Component - Temporary alert that auto-dismisses. Used for flash messages and toasts.

### Parameters

```ruby
Bali::Notification::Component.new(
  type: :success,                # :success, :info, :warning, :error, :danger, :primary
  delay: 3000,                   # Auto-dismiss delay in milliseconds
  fixed: true,                   # Fixed positioning (top-right corner)
  dismiss: true,                 # Show dismiss button
  style: :soft,                  # :soft, :outline, :dash (optional)
  **options                      # Additional HTML attributes
)
```

**Types**: `:success`, `:info`, `:warning`, `:error`, `:danger` (→ error), `:primary` (→ info)

**Styles**: `:soft`, `:outline`, `:dash` (new styling variants)

### Examples

```erb
<%# Success notification %>
<%= render Bali::Notification::Component.new(type: :success) do %>
  User created successfully!
<% end %>

<%# Error with custom delay %>
<%= render Bali::Notification::Component.new(type: :error, delay: 5000) do %>
  Something went wrong. Please try again.
<% end %>

<%# Soft style %>
<%= render Bali::Notification::Component.new(type: :warning, style: :soft) do %>
  This action cannot be undone.
<% end %>

<%# Non-dismissible %>
<%= render Bali::Notification::Component.new(type: :info, dismiss: false) do %>
  Processing... please wait.
<% end %>

<%# Not fixed (inline) %>
<%= render Bali::Notification::Component.new(type: :success, fixed: false) do %>
  Changes saved.
<% end %>
```

---

## Message Component

Bali::Message::Component - Persistent inline message box (does NOT auto-dismiss).

### Parameters

```ruby
Bali::Message::Component.new(
  title: 'Important',            # Message title (optional)
  size: :regular,                # :small, :regular, :medium, :large
  color: :primary,               # :primary, :secondary, :success, :danger, :warning, :info, :link
  style: :soft,                  # :soft, :outline, :dash (optional)
  **options                      # Additional HTML attributes
)
```

**Colors**: `:primary`, `:secondary`, `:success`, `:danger`, `:warning`, `:info`, `:link`

**Sizes**: `:small`, `:regular`, `:medium`, `:large`

**Styles**: `:soft`, `:outline`, `:dash` (new styling variants)

### Slots

```ruby
message.with_header do
  # Custom header content
end
```

### Examples

```erb
<%# Basic message %>
<%= render Bali::Message::Component.new(title: 'Notice', color: :info) do %>
  This is an informational message.
<% end %>

<%# With custom header slot %>
<%= render Bali::Message::Component.new(color: :warning) do |msg| %>
  <% msg.with_header do %>
    <i class="fas fa-exclamation-triangle"></i> Warning
  <% end %>
  Please review before proceeding.
<% end %>

<%# Outline style %>
<%= render Bali::Message::Component.new(
  title: 'Success',
  color: :success,
  style: :outline
) do %>
  Your changes have been saved.
<% end %>

<%# Large error message %>
<%= render Bali::Message::Component.new(
  title: 'Error',
  color: :danger,
  size: :large
) do %>
  <ul>
    <li>Field cannot be blank</li>
    <li>Must be at least 8 characters</li>
  </ul>
<% end %>
```

---

## Loader Component

Bali::Loader::Component - Loading spinner with optional text.

### Parameters

```ruby
Bali::Loader::Component.new(
  text: 'Loading...',            # Text below spinner (optional)
  type: :spinner,                # :spinner, :dots, :ring, :ball, :bars, :infinity
  size: :lg,                     # :xs, :sm, :md, :lg, :xl
  color: :primary,               # DaisyUI semantic colors
  hide_text: false,              # Hide text (for backwards compatibility)
  **options                      # Additional HTML attributes
)
```

**Types**: `:spinner`, `:dots`, `:ring`, `:ball`, `:bars`, `:infinity`

**Sizes**: `:xs`, `:sm`, `:md`, `:lg`, `:xl`

**Colors**: `:primary`, `:secondary`, `:accent`, `:neutral`, `:info`, `:success`, `:warning`, `:error`

### Examples

```erb
<%# Default spinner %>
<%= render Bali::Loader::Component.new %>

<%# Custom text and color %>
<%= render Bali::Loader::Component.new(
  text: 'Saving changes...',
  color: :primary
) %>

<%# Different animation type %>
<%= render Bali::Loader::Component.new(
  type: :dots,
  text: 'Processing',
  size: :md
) %>

<%# No text %>
<%= render Bali::Loader::Component.new(hide_text: true, size: :xl) %>

<%# Small inline loader %>
<%= render Bali::Loader::Component.new(
  type: :spinner,
  size: :sm,
  color: :accent,
  hide_text: true
) %>
```

---

## Flash Notifications Component

Bali::FlashNotifications::Component - Renders Rails flash messages as notifications.

### Parameters

```ruby
Bali::FlashNotifications::Component.new(
  notice: flash[:notice],        # Success message
  alert: flash[:alert]           # Error message
)
```

### Examples

```erb
<%# In application layout %>
<%= render Bali::FlashNotifications::Component.new(
  notice: flash[:notice],
  alert: flash[:alert]
) %>

<%# Auto-maps to notification types %>
<%# notice → type: :success %>
<%# alert → type: :error %>
```

### Controller Usage

```ruby
class UsersController < ApplicationController
  def create
    if @user.save
      flash[:notice] = 'User created successfully'
      redirect_to @user
    else
      flash.now[:alert] = 'Failed to create user'
      render :new
    end
  end
end
```

---

## Notification vs Message

| Use Case | Component |
|----------|-----------|
| Temporary feedback (auto-dismiss) | `Notification` |
| Persistent inline message | `Message` |
| Flash messages from controller | `FlashNotifications` |
| Loading state | `Loader` |
