# Pagination Footer

Standardized pagination footer with summary text and page navigation controls.

## Parameters

- `pagy:` (required) - Pagy object from controller
- `item_name:` - Custom name for items in summary text (default: "items")
- `show_summary:` - Display summary text (default: true)
- `show_pagination:` - Display pagination controls (default: true)

## Usage

```erb
<%# Basic pagination footer %>
<%= render Bali::PaginationFooter::Component.new(pagy: @pagy) %>
<%# Displays: "Showing 1-10 of 100 items" %>

<%# Custom item name %>
<%= render Bali::PaginationFooter::Component.new(
  pagy: @pagy,
  item_name: 'products'
) %>
<%# Displays: "Showing 1-10 of 100 products" %>

<%# Hide summary, show only pagination controls %>
<%= render Bali::PaginationFooter::Component.new(
  pagy: @pagy,
  show_summary: false
) %>

<%# Hide pagination controls, show only summary %>
<%= render Bali::PaginationFooter::Component.new(
  pagy: @pagy,
  show_pagination: false
) %>

<%# In a table layout %>
<table class="table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
    </tr>
  </thead>
  <tbody>
    <% @users.each do |user| %>
      <tr>
        <td><%= user.name %></td>
        <td><%= user.email %></td>
      </tr>
    <% end %>
  </tbody>
</table>

<%= render Bali::PaginationFooter::Component.new(
  pagy: @pagy,
  item_name: 'users'
) %>
```

## Notes

- Requires Pagy gem to be configured in the application
- Summary text shows range (from-to) and total count
- Pagination controls only appear when multiple pages exist
- Layout uses flexbox: summary on left, controls on right
- Item name can be translated via I18n key `view_components.bali.pagination_footer.default_item_name`
- Does not render if `pagy` is nil
