# Breadcrumb Component

Bali::Breadcrumb::Component - Breadcrumb navigation showing current page location in hierarchy.

## Parameters

```ruby
Bali::Breadcrumb::Component.new(
  **options                      # Additional HTML attributes
)
```

## Slots

### Items Slot

Renders many items using `Item::Component`:
```ruby
breadcrumb.with_item(
  name: 'Home',                  # Item text (required)
  href: root_path,               # Item link URL (optional)
  icon_name: 'home',             # Icon name (optional)
  active: false,                 # Mark as active/current page
  **options                      # Additional HTML attributes
)
```

## Item Parameters

- **name**: Required - Item text to display
- **href**: Optional - URL for the breadcrumb item. If nil, item is not clickable
- **icon_name**: Optional - Icon to show before text
- **active**: Optional - Marks item as current page (defaults to true when href is nil)

## Auto-Active Behavior

- If `active:` is not specified and `href:` is nil, item is automatically marked as active
- Active items are not clickable and use different styling
- Typically the last item in breadcrumb is active (current page)

## Examples

```erb
<%# Basic breadcrumb %>
<%= render Bali::Breadcrumb::Component.new do |breadcrumb| %>
  <% breadcrumb.with_item(name: 'Home', href: root_path) %>
  <% breadcrumb.with_item(name: 'Users', href: users_path) %>
  <% breadcrumb.with_item(name: @user.name) %>  <%# No href = active %>
<% end %>

<%# With icons %>
<%= render Bali::Breadcrumb::Component.new do |breadcrumb| %>
  <% breadcrumb.with_item(name: 'Home', href: root_path, icon_name: 'home') %>
  <% breadcrumb.with_item(name: 'Settings', href: settings_path, icon_name: 'cog') %>
  <% breadcrumb.with_item(name: 'Profile', icon_name: 'user') %>
<% end %>

<%# Explicit active state %>
<%= render Bali::Breadcrumb::Component.new do |breadcrumb| %>
  <% breadcrumb.with_item(name: 'Dashboard', href: dashboard_path, active: false) %>
  <% breadcrumb.with_item(name: 'Reports', href: reports_path, active: true) %>
<% end %>

<%# Deep hierarchy %>
<%= render Bali::Breadcrumb::Component.new do |breadcrumb| %>
  <% breadcrumb.with_item(name: 'Home', href: root_path) %>
  <% breadcrumb.with_item(name: 'Admin', href: admin_path) %>
  <% breadcrumb.with_item(name: 'Users', href: admin_users_path) %>
  <% breadcrumb.with_item(name: @user.name, href: admin_user_path(@user)) %>
  <% breadcrumb.with_item(name: 'Edit') %>
<% end %>
```

## Accessibility

Component includes `aria-label` with translated breadcrumb label:
```ruby
I18n.t('bali.breadcrumb.aria_label', default: 'Breadcrumb')
```

## Styling

- Uses DaisyUI breadcrumbs component classes
- Text size: `text-sm`
- Active items use `cursor-default` and no underline
- Non-active items show underline on hover
