# Bali::SideMenu::Component

Collapsible sidebar navigation component with mobile support, menu switching, and nested item groups.

## Parameters

- `current_path:` (String) **Required** - The current request path for active state detection
- `fixed:` (Boolean) - Fixed to viewport (true) or inline flow (false). Default: `true`
- `collapsible:` (Boolean) - Whether the sidebar can collapse to icon-only mode. Default: `false`
- `collapsable:` (Boolean) - **Deprecated**, use `collapsible:` instead
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

### `bottom_groups` (renders_many)
Groups of items pinned to the bottom of the sidebar. Accepts:
- `name:` (String) **Required** - Group header label
- `icon:` (String) - Optional icon for the group header

## Item Parameters

Items rendered inside lists accept:
- `href:` (String) - Link destination
- `name:` (String) - Label text
- `icon:` (String) - Icon name
- `authorized:` (Boolean) - Whether to render the item. Default: `true`
- `disabled:` (Boolean) - Render as disabled. Default: `false`
- `target:` (String) - Link target attribute (e.g., `"_blank"`)
- `active:` (Boolean) - Force active state
- `match:` (Symbol) - Active matching strategy: `:exact`, `:partial`, `:starts_with`, `:crud`
- `badge:` (String) - Badge text displayed next to the item label
- `badge_color:` (String) - DaisyUI color for the badge (e.g., `"primary"`, `"error"`)

## MenuSwitch Component

`Bali::SideMenu::MenuSwitch::Component` renders a switcher entry in the sidebar header:

```ruby
MenuSwitch::Component.new(
  title:,      # String, required - main label
  href:,       # String, required - link destination
  icon:,       # String, required - icon name
  subtitle:,   # String, optional
  active:,     # Boolean, default: false
  authorized:  # Boolean, default: true
)
```

## Usage

### Basic Side Menu

```erb
<%= render Bali::SideMenu::Component.new(current_path: request.path) do |menu| %>
  <% menu.with_list(title: "Navigation") do %>
    <%= render Bali::SideMenu::Item::Component.new(
      current_path: request.path, href: dashboard_path, name: "Dashboard", icon: "home"
    ) %>
    <%= render Bali::SideMenu::Item::Component.new(
      current_path: request.path, href: users_path, name: "Users", icon: "users"
    ) %>
  <% end %>
<% end %>
```

### Collapsible Menu

```erb
<%= render Bali::SideMenu::Component.new(
  current_path: request.path,
  collapsible: true,
  brand: "My App"
) do |menu| %>
  <% menu.with_list(title: "Main") do %>
    <%= render Bali::SideMenu::Item::Component.new(
      current_path: request.path, href: root_path, name: "Home", icon: "home"
    ) %>
  <% end %>
<% end %>
```

### Items with Badge and Match

```erb
<%= render Bali::SideMenu::Item::Component.new(
  current_path: request.path,
  href: inbox_path,
  name: "Inbox",
  icon: "inbox",
  badge: "5",
  badge_color: "error",
  match: :starts_with
) %>
```

### Bottom Groups

```erb
<%= render Bali::SideMenu::Component.new(current_path: request.path) do |menu| %>
  <% menu.with_list(title: "Main") do %>
    <%= render Bali::SideMenu::Item::Component.new(
      current_path: request.path, href: dashboard_path, name: "Dashboard"
    ) %>
  <% end %>

  <% menu.with_bottom_group(name: "Account", icon: "user") do %>
    <%= render Bali::SideMenu::Item::Component.new(
      current_path: request.path, href: profile_path, name: "Profile"
    ) %>
    <%= render Bali::SideMenu::Item::Component.new(
      current_path: request.path, href: settings_path, name: "Settings"
    ) %>
  <% end %>
<% end %>
```

### Multiple Menus with Menu Switches

```erb
<%= render Bali::SideMenu::Component.new(current_path: request.path) do |menu| %>
  <% menu.with_menu_switch(
    title: "Admin",
    href: admin_root_path,
    icon: "shield",
    active: admin_context?,
    authorized: current_user.admin?
  ) %>

  <% menu.with_menu_switch(
    title: "App",
    href: root_path,
    icon: "home",
    active: !admin_context?,
    authorized: true
  ) %>

  <% menu.with_list(title: "Navigation") do %>
    <%= render Bali::SideMenu::Item::Component.new(
      current_path: request.path, href: dashboard_path, name: "Dashboard"
    ) %>
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

- `current_path` is required for active link detection; pass `request.path` from the controller
- `collapsible:` replaces the deprecated `collapsable:` param (both accepted for now)
- `match: :crud` marks the item active for index/show/new/edit routes of the same resource
- `bottom_groups` render below all lists, fixed to the sidebar bottom — useful for account/settings
- Menu switches link to different URLs (full navigation), not toggling visibility inline
