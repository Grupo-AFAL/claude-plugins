# Info Level

Horizontal layout component for displaying multiple info items with flexible alignment.

## Parameters

- `align:` - Alignment: `:start`, `:center`, `:end`, `:between` (default: `:center`)

## Slots

- `items` - Info item components (`Bali::InfoLevel::Item::Component`)

## Usage

```erb
<%# Centered info items %>
<%= render Bali::InfoLevel::Component.new do |c| %>
  <% c.with_item(label: "Total Sales", value: "$45,231") %>
  <% c.with_item(label: "Orders", value: "1,234") %>
  <% c.with_item(label: "Customers", value: "567") %>
<% end %>

<%# Space between alignment %>
<%= render Bali::InfoLevel::Component.new(align: :between) do |c| %>
  <% c.with_item(label: "Start Date", value: @project.start_date) %>
  <% c.with_item(label: "End Date", value: @project.end_date) %>
<% end %>

<%# Left-aligned %>
<%= render Bali::InfoLevel::Component.new(align: :start) do |c| %>
  <% c.with_item(label: "Status", value: "Active") %>
  <% c.with_item(label: "Priority", value: "High") %>
<% end %>

<%# Right-aligned %>
<%= render Bali::InfoLevel::Component.new(align: :end) do |c| %>
  <% @stats.each do |stat| %>
    <% c.with_item(label: stat.name, value: stat.value) %>
  <% end %>
<% end %>
```

## Notes

- Alignment options:
  - `:start` - Items aligned to left
  - `:center` - Items centered (default)
  - `:end` - Items aligned to right
  - `:between` - Items spread with space between
- Uses flexbox with wrapping for responsive layout
- Default gap of 2rem (32px) between items
