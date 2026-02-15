# Bali::Columns::Component

Grid layout component for responsive column-based layouts.

## Parameters

- `gap:` (Symbol) - Gap size between columns. Options: `:none`, `:px`, `:xs`, `:sm`, `:md` (default), `:lg`, `:xl`, `:'2xl'`
- `wrap:` (Boolean) - Allow columns to wrap to multiple lines. Default: `false`
- `center:` (Boolean) - Center columns horizontally. Default: `false`
- `middle:` (Boolean) - Center columns vertically. Default: `false`
- `mobile:` (Boolean) - Keep columns on mobile instead of stacking. Default: `false`
- Standard HTML attributes accepted via `**options`

## Slots

### `columns` (renders_many)
Individual column items. Uses `Bali::Columns::Column::Component`.

## Gap Sizes

| Size | CSS Class | Value |
|------|-----------|-------|
| `:none` | `gap-none` | 0 |
| `:px` | `gap-px` | 1px |
| `:xs` | `gap-xs` | 0.25rem |
| `:sm` | `gap-sm` | 0.5rem |
| `:md` | `gap-md` | 0.75rem (default) |
| `:lg` | `gap-lg` | 1rem |
| `:xl` | `gap-xl` | 1.5rem |
| `:'2xl'` | `gap-2xl` | 2rem |

## Usage

### Basic Two-Column Layout

```erb
<%= render Bali::Columns::Component.new do |columns| %>
  <% columns.with_column do %>
    <div>Left column content</div>
  <% end %>

  <% columns.with_column do %>
    <div>Right column content</div>
  <% end %>
<% end %>
```

### Custom Gap

```erb
<%= render Bali::Columns::Component.new(gap: :xl) do |columns| %>
  <% columns.with_column do %>
    <div>Column 1</div>
  <% end %>

  <% columns.with_column do %>
    <div>Column 2</div>
  <% end %>
<% end %>
```

### Centered Columns

```erb
<%= render Bali::Columns::Component.new(center: true, middle: true) do |columns| %>
  <% columns.with_column do %>
    <div>Centered content</div>
  <% end %>

  <% columns.with_column do %>
    <div>Also centered</div>
  <% end %>
<% end %>
```

### Wrapping Columns

```erb
<%= render Bali::Columns::Component.new(wrap: true, gap: :lg) do |columns| %>
  <% 6.times do %>
    <% columns.with_column do %>
      <div>Column item</div>
    <% end %>
  <% end %>
<% end %>
```

### Mobile Persistence

```erb
<%= render Bali::Columns::Component.new(mobile: true) do |columns| %>
  <% columns.with_column do %>
    <div>Stays columnar on mobile</div>
  <% end %>

  <% columns.with_column do %>
    <div>Not stacked</div>
  <% end %>
<% end %>
```

## Notes

- By default, columns stack vertically on mobile unless `mobile: true` is set
- The `wrap` parameter enables multi-line layouts when columns exceed container width
- `center` and `middle` control horizontal and vertical alignment respectively
