# Bali::BulkActions::Component

Floating action bar for batch operations with item selection and counter display.

## Parameters

- Standard HTML attributes accepted via `**options`

## Slots

### `actions` (renders_many)
Action buttons to perform on selected items. Uses `Bali::BulkActions::Action::Component`.

### `items` (renders_many)
Selectable items. Uses `Bali::BulkActions::Item::Component`.

## Usage

### Basic Bulk Actions

```erb
<%= render Bali::BulkActions::Component.new do |bulk| %>
  <% @users.each do |user| %>
    <% bulk.with_item(id: user.id) do %>
      <div class="card">
        <input type="checkbox" class="checkbox" />
        <span><%= user.name %></span>
      </div>
    <% end %>
  <% end %>

  <% bulk.with_action do %>
    <%= button_to "Delete Selected", bulk_delete_users_path,
                  method: :delete, class: "btn btn-error" %>
  <% end %>

  <% bulk.with_action do %>
    <%= button_to "Export Selected", export_users_path,
                  method: :post, class: "btn btn-primary" %>
  <% end %>
<% end %>
```

### Table with Bulk Actions

```erb
<%= render Bali::BulkActions::Component.new do |bulk| %>
  <table class="table">
    <thead>
      <tr>
        <th>
          <input type="checkbox" class="checkbox" data-action="bulk-actions#selectAll" />
        </th>
        <th>Name</th>
        <th>Email</th>
      </tr>
    </thead>
    <tbody>
      <% @users.each do |user| %>
        <% bulk.with_item(id: user.id) do %>
          <tr>
            <td>
              <input type="checkbox" class="checkbox" />
            </td>
            <td><%= user.name %></td>
            <td><%= user.email %></td>
          </tr>
        <% end %>
      <% end %>
    </tbody>
  </table>

  <% bulk.with_action do %>
    <%= button_to "Archive", archive_users_path, class: "btn btn-warning" %>
  <% end %>

  <% bulk.with_action do %>
    <%= button_to "Delete", bulk_delete_users_path, class: "btn btn-error" %>
  <% end %>
<% end %>
```

### Multiple Action Types

```erb
<%= render Bali::BulkActions::Component.new do |bulk| %>
  <% @products.each do |product| %>
    <% bulk.with_item(id: product.id) do %>
      <div class="product-card">
        <input type="checkbox" class="checkbox" />
        <%= image_tag product.image %>
        <h3><%= product.name %></h3>
      </div>
    <% end %>
  <% end %>

  <% bulk.with_action do %>
    <%= button_to "Publish", publish_products_path, class: "btn btn-success" %>
  <% end %>

  <% bulk.with_action do %>
    <%= button_to "Unpublish", unpublish_products_path, class: "btn btn-warning" %>
  <% end %>

  <% bulk.with_action do %>
    <%= button_to "Delete", bulk_delete_products_path,
                  method: :delete, class: "btn btn-error",
                  data: { confirm: "Are you sure?" } %>
  <% end %>

  <% bulk.with_action do %>
    <%= link_to "Export CSV", export_products_path(format: :csv), class: "btn btn-ghost" %>
  <% end %>
<% end %>
```

### Card Grid with Bulk Actions

```erb
<%= render Bali::BulkActions::Component.new do |bulk| %>
  <div class="grid grid-cols-3 gap-4">
    <% @items.each do |item| %>
      <% bulk.with_item(id: item.id) do %>
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <input type="checkbox" class="checkbox" />
            <h2 class="card-title"><%= item.title %></h2>
            <p><%= item.description %></p>
          </div>
        </div>
      <% end %>
    <% end %>
  </div>

  <% bulk.with_action do %>
    <%= button_to "Move to Folder", move_items_path, class: "btn" %>
  <% end %>

  <% bulk.with_action do %>
    <%= button_to "Download", download_items_path, class: "btn btn-primary" %>
  <% end %>
<% end %>
```

## Floating Action Bar Structure

The component renders a fixed floating bar at the bottom center:

- **Position**: Fixed at bottom, horizontally centered
- **Counter**: Shows number of selected items with primary background
- **Actions**: Displayed in a row with gap spacing
- **Visibility**: Hidden by default, shown when items are selected

## CSS Classes

Predefined classes:
- **Floating bar**: `fixed bottom-4 left-1/2 -translate-x-1/2 z-40 hidden`
- **Inner wrapper**: `flex items-center shadow-xl rounded-lg overflow-hidden`
- **Counter**: `bg-primary text-primary-content font-bold text-2xl px-4 py-2 rounded-l-lg`
- **Actions wrapper**: `flex gap-2 px-3 py-2 bg-base-100 rounded-r-lg`

## Stimulus Controller

The component uses:
- `data-controller="bulk-actions"`
- Automatically tracks selected items
- Shows/hides floating bar based on selection
- Updates counter with selected item count

## Notes

- Base component class: `bulk-actions-component`
- Floating bar appears at bottom center of viewport
- Z-index of 40 ensures bar appears above most content
- Counter displays in large bold text (text-2xl)
- Actions area has base-100 background with rounded corners
- Gap between action buttons is fixed at gap-2
- Hidden by default, becomes visible when items are selected
