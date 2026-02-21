# Sortable List

Drag-to-reorder list with automatic server updates via Turbo.

## Parameters

- `resource_name:` - Name of the resource being updated (e.g., 'task')
- `position_param_name:` - Name of the position parameter sent to server (default: 'position')
- `list_param_name:` - Name of the list parameter sent to server (default: 'list_id')
- `group_name:` - Name to group multiple lists for cross-list dragging
- `list_id:` - Identifier for this list when moving items between lists
- `response_kind:` - Response type: `:turbo_stream` or `:html` (default: `:html`)
- `handle:` - CSS selector for the drag handle (if nil, entire item is draggable)
- `disabled:` - Disable dragging (default: false)
- `animation:` - Animation duration in milliseconds (default: 150)

## Slots

- `items` - Sortable item components (`Bali::SortableList::Item::Component`)

## Usage

```erb
<%# Basic sortable list %>
<%= render Bali::SortableList::Component.new(resource_name: 'task') do |c| %>
  <% @tasks.each do |task| %>
    <% c.with_item(url: position_task_path(task)) { task.title } %>
  <% end %>
<% end %>

<%# With drag handle %>
<%= render Bali::SortableList::Component.new(
  resource_name: 'item',
  handle: '.handle'
) do |c| %>
  <% @items.each do |item| %>
    <% c.with_item(url: position_item_path(item)) do %>
      <span class="handle">⋮⋮</span>
      <%= item.name %>
    <% end %>
  <% end %>
<% end %>

<%# Multiple lists with cross-dragging %>
<%= render Bali::SortableList::Component.new(
  resource_name: 'task',
  group_name: 'tasks',
  list_id: 'todo'
) do |c| %>
  <% @todo_tasks.each do |task| %>
    <% c.with_item(url: position_task_path(task)) { task.title } %>
  <% end %>
<% end %>

<%= render Bali::SortableList::Component.new(
  resource_name: 'task',
  group_name: 'tasks',
  list_id: 'done'
) do |c| %>
  <% @done_tasks.each do |task| %>
    <% c.with_item(url: position_task_path(task)) { task.title } %>
  <% end %>
<% end %>

<%# Turbo Stream response %>
<%= render Bali::SortableList::Component.new(
  resource_name: 'task',
  response_kind: :turbo_stream
) do |c| %>
  <% @tasks.each do |task| %>
    <% c.with_item(url: position_task_path(task)) { task.title } %>
  <% end %>
<% end %>
```

## Notes

- Automatically sends PATCH requests to item URLs on reorder
- When `handle` is specified, only that element triggers dragging
- When `handle` is nil, the entire item is draggable
- Use `group_name` and `list_id` to enable dragging items between lists
- Animation duration controls the smoothness of position changes
