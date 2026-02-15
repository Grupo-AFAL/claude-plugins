# Heatmap

Heatmap visualization for displaying data intensity across two dimensions.

## Parameters

- `data:` (required) - Hash in format `{ x_label => { y_label => value } }`
- `color:` - Base color as hex string or DaisyUI preset symbol (`:primary`, `:secondary`, `:accent`, `:success`, `:info`, `:warning`, `:error`) (default: `:primary`)
- `cell_size:` - Size of each cell in pixels (default: 28)
- `responsive:` - Stretch to fill container width (default: true)

## Slots

- `x_axis_title` - Title for X axis
- `y_axis_title` - Title for Y axis
- `legend_title` - Legend title
- `hovercard_title` - Title in hover card

## Usage

```erb
<%# Basic heatmap %>
<%= render Bali::Heatmap::Component.new(
  data: {
    "Mon" => { 0 => 5, 1 => 10, 2 => 8 },
    "Tue" => { 0 => 12, 1 => 15, 2 => 7 },
    "Wed" => { 0 => 3, 1 => 18, 2 => 20 }
  }
) %>

<%# With axis titles %>
<%= render Bali::Heatmap::Component.new(data: @activity_data) do |c| %>
  <% c.with_x_axis_title("Days") %>
  <% c.with_y_axis_title("Hours") %>
  <% c.with_legend_title("Activity Level") %>
<% end %>

<%# Custom color %>
<%= render Bali::Heatmap::Component.new(
  data: @heatmap_data,
  color: :success
) %>

<%# Custom hex color %>
<%= render Bali::Heatmap::Component.new(
  data: @data,
  color: "#ff5733"
) %>

<%# Custom cell size %>
<%= render Bali::Heatmap::Component.new(
  data: @data,
  cell_size: 40,
  responsive: false
) %>
```

## Notes

- Color automatically creates a gradient from light to intense based on values
- Higher values get darker/more intense colors
- Cell colors are calculated based on value relative to max value in dataset
- Responsive mode stretches to fill container width
- Preset colors: `:primary`, `:secondary`, `:accent`, `:success`, `:info`, `:warning`, `:error`
