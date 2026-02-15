# Timeago

Display relative time ("5 minutes ago", "2 hours ago") that updates dynamically.

## Parameters

- `datetime` (required, first positional) - DateTime or Time object to display
- `add_suffix:` - Add "ago" suffix (default: false)
- `refresh_interval:` - Auto-refresh interval in milliseconds (default: nil, no refresh)
- `include_seconds:` - Show seconds precision (default: true)

## Usage

```erb
<%# Basic relative time %>
<%= render Bali::Timeago::Component.new(@post.created_at) %>
<%# Displays: "5 minutes" %>

<%# With "ago" suffix %>
<%= render Bali::Timeago::Component.new(@post.created_at, add_suffix: true) %>
<%# Displays: "5 minutes ago" %>

<%# Auto-refresh every 30 seconds %>
<%= render Bali::Timeago::Component.new(
  @user.last_seen_at,
  add_suffix: true,
  refresh_interval: 30000
) %>

<%# Without seconds precision %>
<%= render Bali::Timeago::Component.new(
  @event.starts_at,
  include_seconds: false
) %>

<%# In a list %>
<ul>
  <% @activities.each do |activity| %>
    <li>
      <%= activity.description %>
      <%= render Bali::Timeago::Component.new(activity.created_at, add_suffix: true) %>
    </li>
  <% end %>
</ul>
```

## Notes

- Uses date-fns library for localized relative time formatting
- Respects `I18n.locale` for translations
- When `refresh_interval` is set, the time updates automatically without page reload
- Renders as a semantic `<time>` element with ISO8601 datetime attribute
- Include seconds shows precision like "30 seconds ago" vs "less than a minute ago"
