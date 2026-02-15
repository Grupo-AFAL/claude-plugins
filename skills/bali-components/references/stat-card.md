# StatCard

KPI/metric card component with icon, title, value, and optional footer. Uses Card component internally with icon badge.

## Parameters

- `title:` (String, required) - Card title (e.g., 'Total Revenue')
- `value:` (String/Numeric, required) - Main metric value (e.g., '$125,000' or 1234)
- `icon_name:` (String, required) - Icon name for the badge
- `color:` (Symbol, default: `:primary`) - Color theme (`:primary`, `:secondary`, `:accent`, `:success`, `:warning`, `:error`, `:info`)

## Slots

- `footer` (renders_one) - Footer content below the value (e.g., trend indicator, time period)

## Usage

### Basic stat card

```erb
<%= render Bali::StatCard::Component.new(
  title: 'Total Users',
  value: '1,234',
  icon_name: 'users',
  color: :primary
) %>
```

### Stat card with footer

```erb
<%= render Bali::StatCard::Component.new(
  title: 'Revenue',
  value: '$125,000',
  icon_name: 'dollar-sign',
  color: :success
) do |card| %>
  <% card.with_footer do %>
    <span class="text-success text-sm">
      <%= render Bali::Icon::Component.new('trending-up', size: :small) %>
      +12.5% from last month
    </span>
  <% end %>
<% end %>
```

### Grid of stat cards

```erb
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <%= render Bali::StatCard::Component.new(
    title: 'Total Projects',
    value: '48',
    icon_name: 'folder',
    color: :primary
  ) %>

  <%= render Bali::StatCard::Component.new(
    title: 'Active Users',
    value: '2,456',
    icon_name: 'users',
    color: :success
  ) %>

  <%= render Bali::StatCard::Component.new(
    title: 'Pending Tasks',
    value: '23',
    icon_name: 'alert-circle',
    color: :warning
  ) %>

  <%= render Bali::StatCard::Component.new(
    title: 'Errors',
    value: '2',
    icon_name: 'x-circle',
    color: :error
  ) %>
</div>
```

### Stat card with trend and time period

```erb
<%= render Bali::StatCard::Component.new(
  title: 'Conversion Rate',
  value: '3.24%',
  icon_name: 'trending-up',
  color: :info
) do |card| %>
  <% card.with_footer do %>
    <div class="flex items-center justify-between text-xs">
      <span class="text-success">+0.4%</span>
      <span class="text-base-content/60">Last 30 days</span>
    </div>
  <% end %>
<% end %>
```

## Color Themes

Each color applies a background and text color to the icon badge:

- `:primary` - Primary theme color
- `:secondary` - Secondary theme color
- `:accent` - Accent theme color
- `:success` - Green (typically for positive metrics)
- `:warning` - Yellow/orange (typically for warnings)
- `:error` - Red (typically for errors/negative metrics)
- `:info` - Blue (typically for informational metrics)

## Notes

- Uses `Bali::Card::Component` internally with `style: :bordered`
- Icon is displayed in a rounded badge with 10% opacity background and full color text
- Icon badge uses `p-3` padding and `rounded-full` shape
- Card layout uses flexbox with icon on left, content on right
- Title is displayed in small text with reduced opacity
- Value is displayed in large bold text (text-3xl font-bold)
- Footer slot is useful for trends, comparisons, or time periods
