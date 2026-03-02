# DashboardPage

Admin dashboard layout with stat cards grid, header with actions, and body content area. Provides consistent dashboard structure across the application.

## Parameters

- `title:` (String, required) - Page title
- `subtitle:` (String, optional) - Subtitle text
- `breadcrumbs:` (Array, default: []) - Array of hashes with keys: `name`, `href`, `icon_name`
- `stats_columns:` (Integer, default: 4) - Number of columns for stat cards grid (2, 3, or 4)
- `max_width:` (Symbol, default: `:"2xl"`) - Container max-width: `:lg` (max-w-5xl), `:xl` (max-w-7xl), `:"2xl"` (max-w-screen-2xl), `:full` (max-w-full)

## Slots

- `actions` (renders_many) - Action buttons in header row
- `body` (renders_one) - Main content area below stats grid

## Methods

- `with_stat(label:, value:, icon: nil, change: nil, color: :primary)` - Add a stat card
  - `label:` - Stat label text
  - `value:` - Stat value text (e.g., "1,234")
  - `icon:` (optional) - Lucide icon name
  - `change:` (optional) - Change indicator text (e.g., "+12.5%")
  - `color:` - Icon/accent color: `:primary`, `:secondary`, `:accent`, `:success`, `:warning`, `:error`, `:info`

## Layout

- Breadcrumbs (if provided) -> PageHeader (title + subtitle + actions) -> Stat cards grid -> Body
- Stat grid is responsive: `grid-cols-1` mobile, `sm:grid-cols-2`, up to `lg:grid-cols-4`
- Each stat card is a bordered Card with `p-4` body

## Usage

### Basic dashboard with stats and content

```erb
<%= render Bali::DashboardPage::Component.new(
  title: "Dashboard",
  subtitle: "Welcome back, Ana",
  breadcrumbs: [
    { name: "Home", href: root_path, icon_name: "home" },
    { name: "Dashboard" }
  ],
  stats_columns: 4,
  max_width: :"2xl"
) do |page| %>
  <% page.with_action do %>
    <%= render Bali::Button::Component.new(name: "Export", variant: :ghost, icon_name: "download") %>
  <% end %>

  <% page.with_stat(label: "Total Orders", value: "1,234", icon: "shopping-cart", color: :primary) %>
  <% page.with_stat(label: "Revenue", value: "$45.2K", icon: "dollar-sign", color: :success, change: "+12.5%") %>
  <% page.with_stat(label: "Customers", value: "892", icon: "users", color: :info, change: "+3.2%") %>
  <% page.with_stat(label: "Pending", value: "23", icon: "clock", color: :warning) %>

  <% page.with_body do %>
    <%= render Bali::Columns::Component.new(count: 2, gap: 6) do |cols| %>
      <% cols.with_column do %>
        <%= render Bali::Card::Component.new(title: "Recent Activity", style: :bordered) do %>
          <!-- Activity list -->
        <% end %>
      <% end %>
      <% cols.with_column do %>
        <%= render Bali::Card::Component.new(title: "Top Categories", style: :bordered) do %>
          <!-- Chart or list -->
        <% end %>
      <% end %>
    <% end %>
  <% end %>
<% end %>
```

### Minimal dashboard (no stats)

```erb
<%= render Bali::DashboardPage::Component.new(
  title: "Analytics",
  subtitle: "Last 30 days"
) do |page| %>
  <% page.with_body do %>
    <!-- Charts and data directly in body -->
  <% end %>
<% end %>
```

## Notes

- Stats are optional -- omit `with_stat` calls for a dashboard without the stats grid
- The stat cards grid only renders when stats are present
- Use `change:` to show trend indicators on stat cards
- Body content typically contains Cards with charts, tables, or activity feeds
- Uses `PageHeader` internally for the title/subtitle/actions area
