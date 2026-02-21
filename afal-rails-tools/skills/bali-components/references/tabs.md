# Tabs Component

Bali::Tabs::Component - Tabbed interface with content panels. Integrates with Turbo Frames for dynamic content loading.

## Parameters

```ruby
Bali::Tabs::Component.new(
  style: :border,                # :default, :border, :box, :lift
  size: :md,                     # :xs, :sm, :md, :lg, :xl
  **options                      # Additional HTML attributes
)
```

## Styles

- `:default` - No border
- `:border` - Bordered tabs (default)
- `:box` - Boxed tabs
- `:lift` - Lifted tabs

## Sizes

`:xs`, `:sm`, `:md`, `:lg`, `:xl`

## Slots

### Tabs Slot

Renders many tabs using `Tab::Component`:
```ruby
tabs.with_tab(
  title: 'Overview',             # Tab label
  active: true,                  # Active tab (only one should be true)
  icon: 'home',                  # Icon name (optional)
  src: path,                     # Turbo Frame source URL (for dynamic content)
  reload: false,                 # Reload content on tab click
  href: path,                    # Full page navigation (mutually exclusive with src)
  **options                      # Additional HTML attributes
)
```

## Tab Parameters

- **title**: Tab label text (required)
- **active**: Boolean - marks tab as active/selected
- **icon**: Icon name to show before title
- **src**: Turbo Frame URL for dynamic content loading
- **reload**: Whether to reload content when tab is clicked
- **href**: Full page navigation URL (use for page-based tabs instead of Turbo Frame)

**Note**: `src` and `href` are mutually exclusive. Use `src` for Turbo Frame content, `href` for full page navigation.

## Examples

```erb
<%# Basic tabs %>
<%= render Bali::Tabs::Component.new do |tabs| %>
  <% tabs.with_tab(title: 'Profile', active: true) do %>
    <div class="p-4">Profile content...</div>
  <% end %>
  <% tabs.with_tab(title: 'Settings') do %>
    <div class="p-4">Settings content...</div>
  <% end %>
<% end %>

<%# With icons %>
<%= render Bali::Tabs::Component.new(style: :box) do |tabs| %>
  <% tabs.with_tab(title: 'Dashboard', icon: 'chart-line', active: true) do %>
    Dashboard content
  <% end %>
  <% tabs.with_tab(title: 'Reports', icon: 'file-alt') do %>
    Reports content
  <% end %>
<% end %>

<%# Turbo Frame integration (dynamic loading) %>
<%= render Bali::Tabs::Component.new do |tabs| %>
  <% tabs.with_tab(
    title: 'Overview',
    active: true,
    src: user_overview_path(@user)
  ) %>
  <% tabs.with_tab(
    title: 'Activity',
    src: user_activity_path(@user)
  ) %>
  <% tabs.with_tab(
    title: 'Settings',
    src: user_settings_path(@user),
    reload: true  # Reload content each time tab is clicked
  ) %>
<% end %>

<%# Page-based tabs (full navigation) %>
<%= render Bali::Tabs::Component.new(style: :lift) do |tabs| %>
  <% tabs.with_tab(
    title: 'Users',
    href: users_path,
    active: controller_name == 'users'
  ) %>
  <% tabs.with_tab(
    title: 'Teams',
    href: teams_path,
    active: controller_name == 'teams'
  ) %>
<% end %>

<%# Different sizes %>
<%= render Bali::Tabs::Component.new(size: :lg) do |tabs| %>
  <% tabs.with_tab(title: 'Tab 1', active: true) do %>
    Large tab content
  <% end %>
<% end %>
```

## Stimulus Controller

Component automatically includes `data-controller="tabs"` for tab interaction behavior.

## Content Visibility

- Active tab's content is visible
- Inactive tabs have `class="hidden"` applied
- Only one tab should have `active: true` at a time
