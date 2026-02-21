# Label-Value

Display a label-value pair with consistent styling.

## Parameters

- `label:` (required) - The label text
- `value:` - The value to display (can also be provided via block)

## Usage

```erb
<%# With value parameter %>
<%= render Bali::LabelValue::Component.new(label: 'Name', value: @user.name) %>

<%# With block content %>
<%= render Bali::LabelValue::Component.new(label: 'Email') do %>
  <%= mail_to @user.email %>
<% end %>

<%# Multiple label-value pairs %>
<div class="grid grid-cols-2 gap-4">
  <%= render Bali::LabelValue::Component.new(label: 'Status', value: @order.status) %>
  <%= render Bali::LabelValue::Component.new(label: 'Total', value: number_to_currency(@order.total)) %>
  <%= render Bali::LabelValue::Component.new(label: 'Created', value: @order.created_at.to_s(:long)) %>
</div>

<%# With custom styling %>
<%= render Bali::LabelValue::Component.new(label: 'Priority', value: @task.priority, class: 'mb-4') %>
```

## Notes

- Label is displayed in small, bold, semi-transparent text
- Value has a minimum height to ensure consistent spacing
- Default bottom margin of 0.5rem can be overridden with custom classes
