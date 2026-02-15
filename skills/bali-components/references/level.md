# Bali::Level::Component

Horizontal layout component with flexible left/right/items positioning using flexbox.

## Parameters

- `align:` (Symbol) - Vertical alignment of items. Options: `:start`, `:center` (default), `:end`
- Standard HTML attributes accepted via `**options`

## Slots

### `left` (renders_one)
Content positioned on the left side of the level.

### `right` (renders_one)
Content positioned on the right side of the level.

### `items` (renders_many)
Individual items that can be positioned within the level. Uses `Bali::Level::Item::Component`.

## Usage

```erb
<%= render Bali::Level::Component.new(align: :center) do |level| %>
  <% level.with_left do %>
    <h2>Title</h2>
  <% end %>

  <% level.with_right do %>
    <%= render Bali::Button::Component.new(text: "Action") %>
  <% end %>
<% end %>
```

### With Items

```erb
<%= render Bali::Level::Component.new do |level| %>
  <% level.with_item do %>
    <div>Item 1</div>
  <% end %>

  <% level.with_item do %>
    <div>Item 2</div>
  <% end %>

  <% level.with_item do %>
    <div>Item 3</div>
  <% end %>
<% end %>
```

### Vertical Alignment

```erb
<%= render Bali::Level::Component.new(align: :start) do |level| %>
  <% level.with_left do %>
    <h1 class="text-3xl">Large Title</h1>
  <% end %>

  <% level.with_right do %>
    <small>Small text aligned to start</small>
  <% end %>
<% end %>
```

## Notes

- Base classes: `level flex justify-between gap-4`
- Gap between items is fixed at `gap-4`
- Items are distributed with `justify-between`
- All content is wrapped in a flex container
