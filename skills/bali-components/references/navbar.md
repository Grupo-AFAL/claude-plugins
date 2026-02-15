# Bali::Navbar::Component

Navigation bar component with sticky positioning, color presets, and responsive layout support.

## Parameters

- `sticky:` (Boolean) - Make navbar sticky at top. Default: `true`
- `transparency:` (Boolean) - Enable transparent mode. Default: `false`
- `fullscreen:` (Boolean) - Full-width navbar without max-width constraint. Default: `false`
- `color:` (Symbol, nil) - Background color preset. Options: `:base` (default), `:primary`, `:secondary`, `:accent`, `:neutral`. Pass `nil` to skip color classes and use custom classes via `class:` option
- `container_class:` (String) - Additional classes for inner container wrapper
- Standard HTML attributes accepted via `**options`

## Slots

### `brand` (renders_one)
Brand content (logo, app name, etc.) typically positioned on the left.

### `burgers` (renders_many)
Mobile menu toggle buttons. Uses `Bali::Navbar::Burger::Component`.

### `menus` (renders_many)
Navigation menu groups. Uses `Bali::Navbar::Menu::Component`.

## Color Presets

| Color | CSS Classes | Description |
|-------|-------------|-------------|
| `:base` | `bg-base-100` | Base background (default) |
| `:primary` | `bg-primary text-primary-content` | Primary theme color |
| `:secondary` | `bg-secondary text-secondary-content` | Secondary theme color |
| `:accent` | `bg-accent text-accent-content` | Accent theme color |
| `:neutral` | `bg-neutral text-neutral-content` | Neutral gray |

## Usage

### Basic Navbar

```erb
<%= render Bali::Navbar::Component.new do |navbar| %>
  <% navbar.with_brand do %>
    <%= link_to "My App", root_path, class: "text-xl font-bold" %>
  <% end %>

  <% navbar.with_menu do %>
    <%= link_to "Home", root_path, class: "btn btn-ghost" %>
    <%= link_to "About", about_path, class: "btn btn-ghost" %>
  <% end %>
<% end %>
```

### Primary Color

```erb
<%= render Bali::Navbar::Component.new(color: :primary) do |navbar| %>
  <% navbar.with_brand do %>
    <span class="text-xl font-bold">My App</span>
  <% end %>
<% end %>
```

### Not Sticky

```erb
<%= render Bali::Navbar::Component.new(sticky: false) do |navbar| %>
  <% navbar.with_brand do %>
    <span>Logo</span>
  <% end %>
<% end %>
```

### Fullscreen Width

```erb
<%= render Bali::Navbar::Component.new(fullscreen: true) do |navbar| %>
  <% navbar.with_brand do %>
    <span>Full Width Navbar</span>
  <% end %>
<% end %>
```

### Transparent Mode

```erb
<%= render Bali::Navbar::Component.new(transparency: true) do |navbar| %>
  <% navbar.with_brand do %>
    <span>Transparent Navbar</span>
  <% end %>
<% end %>
```

### Custom Color Classes

```erb
<%= render Bali::Navbar::Component.new(color: nil, class: 'bg-gradient-to-r from-blue-500 to-purple-600') do |navbar| %>
  <% navbar.with_brand do %>
    <span class="text-white">Custom Gradient</span>
  <% end %>
<% end %>
```

### With Burger Menu

```erb
<%= render Bali::Navbar::Component.new do |navbar| %>
  <% navbar.with_brand do %>
    <span>My App</span>
  <% end %>

  <% navbar.with_burger do %>
    <!-- Mobile menu toggle -->
  <% end %>

  <% navbar.with_menu do %>
    <%= link_to "Home", root_path %>
    <%= link_to "About", about_path %>
  <% end %>
<% end %>
```

### Custom Container Classes

```erb
<%= render Bali::Navbar::Component.new(container_class: 'gap-8') do |navbar| %>
  <% navbar.with_brand do %>
    <span>Spaced Content</span>
  <% end %>
<% end %>
```

## Container Layout

- **Fullscreen mode**: Edge-to-edge with padding (`px-4`), no width constraint
- **Normal mode**: Centered with max-width constraint (`max-w-7xl = 1280px`)

## Stimulus Controller

The component includes a `navbar` Stimulus controller with:
- `data-navbar-allow-transparency-value`: Set to transparency parameter value
- `data-navbar-throttle-interval-value`: Throttle interval (100ms default)

## Notes

- Base classes: `navbar shadow-sm`
- Sticky classes when enabled: `sticky top-0 z-50`
- Container always has: `flex items-center w-full relative px-4`
- Non-fullscreen containers add: `max-w-7xl mx-auto`
- Transparency mode enables scroll-based transparency behavior
