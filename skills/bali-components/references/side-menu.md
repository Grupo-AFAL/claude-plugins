# Bali::SideMenu::Component

Collapsible sidebar navigation component with mobile support, menu switching, and nested item groups.

## Parameters

- `current_path:` (String) **Required** - The current request path for active state detection
- `fixed:` (Boolean) - Fixed to viewport (true) or inline flow (false). Default: `true`
- `collapsable:` (Boolean) - Whether the sidebar can collapse to icon-only mode. Default: `false`
- `group_behavior:` (Symbol) - How nested items behave. Options: `:expandable` (default), `:dropdown`
- `brand:` (String) - Optional brand name shown in the header (e.g., "ACME")
- `mobile_trigger_id:` (String) - Mobile trigger checkbox ID. Default: `'side-menu-mobile-trigger'`
- Standard HTML attributes accepted via `**options`

## Slots

### `menu_switches` (renders_many)
Menu switcher components for multi-menu navigation. Uses `Bali::SideMenu::MenuSwitch::Component`.

### `lists` (renders_many)
Navigation list groups. Accepts:
- `title:` (String) - Optional section title
- Block content with navigation items

## Group Behaviors

- `:expandable` - Click to expand/collapse using DaisyUI collapse (default)
- `:dropdown` - Show submenu in dropdown on hover

## Usage

### Basic Side Menu

```erb
<%= render Bali::SideMenu::Component.new(current_path: request.path) do |menu| %>
  <% menu.with_list(title: "Navigation") do %>
    <%= link_to "Dashboard", dashboard_path, class: "menu-item" %>
    <%= link_to "Users", users_path, class: "menu-item" %>
    <%= link_to "Settings", settings_path, class: "menu-item" %>
  <% end %>
<% end %>
```

### With Brand

```erb
<%= render Bali::SideMenu::Component.new(
  current_path: request.path,
  brand: "My App"
) do |menu| %>
  <% menu.with_list do %>
    <%= link_to "Home", root_path, class: "menu-item" %>
  <% end %>
<% end %>
```

### Collapsible Menu

```erb
<%= render Bali::SideMenu::Component.new(
  current_path: request.path,
  collapsable: true
) do |menu| %>
  <% menu.with_list(title: "Main") do %>
    <%= link_to "Dashboard", dashboard_path, class: "menu-item" %>
  <% end %>
<% end %>
```

### Inline (Not Fixed)

```erb
<%= render Bali::SideMenu::Component.new(
  current_path: request.path,
  fixed: false
) do |menu| %>
  <% menu.with_list do %>
    <%= link_to "Item 1", path1, class: "menu-item" %>
  <% end %>
<% end %>
```

### Dropdown Group Behavior

```erb
<%= render Bali::SideMenu::Component.new(
  current_path: request.path,
  group_behavior: :dropdown
) do |menu| %>
  <% menu.with_list(title: "Settings") do %>
    <%= link_to "Profile", profile_path, class: "menu-item" %>
    <%= link_to "Security", security_path, class: "menu-item" %>
  <% end %>
<% end %>
```

### Multiple Menus with Menu Switches

```erb
<%= render Bali::SideMenu::Component.new(current_path: request.path) do |menu| %>
  <% menu.with_menu_switch(name: "Admin", active: admin?, authorized: can_admin?) do %>
    <% menu.with_list(title: "Admin") do %>
      <%= link_to "Users", admin_users_path, class: "menu-item" %>
    <% end %>
  <% end %>

  <% menu.with_menu_switch(name: "User", active: !admin?, authorized: true) do %>
    <% menu.with_list(title: "User") do %>
      <%= link_to "Profile", profile_path, class: "menu-item" %>
    <% end %>
  <% end %>
<% end %>
```

## Mobile Trigger

For mobile responsiveness, add a checkbox trigger in your layout:

```erb
<input
  type="checkbox"
  id="side-menu-mobile-trigger"
  class="drawer-toggle"
  aria-label="<%= t('bali.side_menu.toggle_mobile') %>"
/>
```

## I18n Keys

- `bali.side_menu.toggle_mobile` - Mobile trigger aria-label (default: "Toggle sidebar")
- `bali.side_menu.toggle_collapse` - Collapse checkbox aria-label (default: "Toggle sidebar collapse")
- `bali.side_menu.collapse` - Collapse button title (default: "Collapse sidebar")
- `bali.side_menu.expand` - Expand button title (default: "Expand sidebar")

## Notes

- The `current_path` parameter is required for active link detection
- Fixed mode (default) positions the sidebar fixed to the viewport
- Collapsible mode allows toggling between full and icon-only sidebar
- Menu switches enable multi-menu layouts with authorization support
- Mobile trigger ID defaults to `'side-menu-mobile-trigger'` but can be customized
