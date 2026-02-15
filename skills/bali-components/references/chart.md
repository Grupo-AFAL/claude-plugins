# Chart

Chart.js wrapper for data visualization (bar, line, pie, doughnut, etc).

## Parameters

- `type:` - Chart type: `:bar`, `:line`, `:pie`, `:doughnut`, `:polarArea`, `:radar`, `:scatter`, `:bubble` (default: `:bar`)
- `data:` - Chart data (see Data Format below)
- `title:` - Chart title (default: nil)
- `legend:` - Show legend (default: false)
- `display_percent:` - Display percentages instead of raw values (default: false)
- `options:` - Additional Chart.js options (default: {})
- `card_style:` - Wrapper style: `:default`, `:bordered`, `:compact`, `:none` (default: `:default`)
- `height:` - Chart height: `:sm` (180px), `:md` (250px), `:lg` (350px), `:xl` (450px) (default: `:md`)
- `use_theme_colors:` - Use DaisyUI theme colors (default: true)

## Data Format

### Simple Hash (single dataset)
```ruby
{ "Mon" => 10, "Tue" => 20, "Wed" => 30 }
```

### Multi-series (multiple datasets)
```ruby
{
  labels: ["Jan", "Feb", "Mar"],
  datasets: [
    { label: "Sales", data: [10, 20, 15] },
    { label: "Costs", data: [5, 10, 8] }
  ]
}
```

## Usage

```erb
<%# Simple bar chart %>
<%= render Bali::Chart::Component.new(
  type: :bar,
  data: { "Mon" => 10, "Tue" => 20, "Wed" => 30 },
  title: "Weekly Sales"
) %>

<%# Line chart with legend %>
<%= render Bali::Chart::Component.new(
  type: :line,
  data: {
    labels: ["Jan", "Feb", "Mar"],
    datasets: [
      { label: "2024", data: [100, 150, 120] },
      { label: "2025", data: [120, 180, 140] }
    ]
  },
  legend: true,
  height: :lg
) %>

<%# Pie chart %>
<%= render Bali::Chart::Component.new(
  type: :pie,
  data: { "Category A" => 30, "Category B" => 45, "Category C" => 25 },
  legend: true,
  card_style: :bordered
) %>

<%# Chart without card wrapper %>
<%= render Bali::Chart::Component.new(
  type: :bar,
  data: @chart_data,
  card_style: :none
) %>

<%# Custom Chart.js options %>
<%= render Bali::Chart::Component.new(
  type: :line,
  data: @data,
  options: {
    scales: {
      y: { beginAtZero: true }
    }
  }
) %>
```

## Notes

- Multi-color types (pie, doughnut, polarArea) automatically get one color per data point
- Other chart types use one color per dataset
- Theme colors automatically adapt to DaisyUI theme when `use_theme_colors: true`
- Responsive by default, maintains aspect ratio unless container height is set
- Custom Chart.js options are deep-merged with defaults
- Labels longer than 16 characters are automatically truncated
