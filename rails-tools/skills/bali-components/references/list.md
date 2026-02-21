# List

Styled list container with optional borders and spacing control.

## Parameters

- `borderless:` - Remove border and rounded box styling (default: false)
- `relaxed_spacing:` - Increase vertical padding for list items (default: false)

## Slots

- `items` - List item components (`Bali::List::Item::Component`)

## Usage

```erb
<%# Basic bordered list %>
<%= render Bali::List::Component.new do |c| %>
  <% c.with_item { "First item" } %>
  <% c.with_item { "Second item" } %>
  <% c.with_item { "Third item" } %>
<% end %>

<%# Borderless list %>
<%= render Bali::List::Component.new(borderless: true) do |c| %>
  <% c.with_item { "Item without border" } %>
<% end %>

<%# Relaxed spacing %>
<%= render Bali::List::Component.new(relaxed_spacing: true) do |c| %>
  <% @tasks.each do |task| %>
    <% c.with_item { task.title } %>
  <% end %>
<% end %>
```

## Notes

- By default, lists have a border and rounded box styling (DaisyUI)
- Use `borderless: true` for clean lists without visual containers
- Use `relaxed_spacing: true` for more breathing room between items
