# Boolean Icon

Visual indicator for true/false values using icons.

## Parameters

- `value:` (required) - Boolean value to display (nil treated as false)

## Usage

```erb
<%# Show true/false status %>
<%= render Bali::BooleanIcon::Component.new(value: @task.completed?) %>

<%# In table cells %>
<table>
  <% @users.each do |user| %>
    <tr>
      <td><%= user.name %></td>
      <td><%= render Bali::BooleanIcon::Component.new(value: user.active?) %></td>
    </tr>
  <% end %>
</table>

<%# With custom wrapper class %>
<%= render Bali::BooleanIcon::Component.new(value: @setting.enabled, class: 'ml-2') %>
```

## Notes

- True displays a green check-circle icon
- False displays a red times-circle icon
- Nil values are treated as false
- Icons are 20x20px (w-5 h-5)
- Color automatically matches the boolean state:
  - True: `text-success` (green)
  - False: `text-error` (red)
