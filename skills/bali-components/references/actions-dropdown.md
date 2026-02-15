# Actions Dropdown Component

Bali::ActionsDropdown::Component - Dropdown menu with action items. Auto-filters unauthorized items.

## Parameters

```ruby
Bali::ActionsDropdown::Component.new(
  align: :start,                 # :start, :center, :end (horizontal alignment)
  direction: :bottom,            # :top, :bottom, :left, :right (vertical direction)
  icon: 'ellipsis-h',            # Trigger icon name (default 'ellipsis-h')
  width: :md,                    # :sm, :md, :lg, :xl (menu width)
  popover: false,                # Use Tippy.js popover (escapes overflow containers)
  **options                      # Additional HTML attributes
)
```

## Slots

### Trigger Slot

Override the default ellipsis button with custom trigger:
```ruby
dropdown.with_trigger do
  # Custom trigger content
end
```

### Items Slot

Automatically selects Link or DeleteLink based on HTTP method:
```ruby
dropdown.with_item(href: path, name: 'Edit', method: :get)      # → Link::Component
dropdown.with_item(model: @user, name: 'Delete', method: :delete) # → DeleteLink::Component
```

All items automatically get `plain: true` styling.

## Alignment & Direction

- **align**: Horizontal alignment (`:start`, `:center`, `:end`)
- **direction**: Vertical direction (`:top`, `:bottom`, `:left`, `:right`)

## Width Options

- `:sm` - w-40
- `:md` - w-52 (default)
- `:lg` - w-64
- `:xl` - w-80

## Popover Mode

Use `popover: true` to render with Tippy.js instead of CSS dropdown. This allows the menu to escape overflow containers (e.g., tables with `overflow-x-auto`).

## Authorization

Component automatically filters items:
- Calls `authorized?` on each item
- Only renders if at least one item is authorized
- `render?` checks `authorized_items.any?`

## Examples

```erb
<%# Basic dropdown %>
<%= render Bali::ActionsDropdown::Component.new do |dropdown| %>
  <% dropdown.with_item(href: edit_user_path(@user), name: 'Edit') %>
  <% dropdown.with_item(href: user_path(@user), name: 'View') %>
  <% dropdown.with_item(model: @user, method: :delete) %>
<% end %>

<%# Custom alignment and width %>
<%= render Bali::ActionsDropdown::Component.new(align: :end, width: :lg) do |dropdown| %>
  <% dropdown.with_item(href: path, name: 'Action 1') %>
  <% dropdown.with_item(href: path, name: 'Action 2') %>
<% end %>

<%# Popover mode (for tables with overflow) %>
<%= render Bali::ActionsDropdown::Component.new(popover: true) do |dropdown| %>
  <% dropdown.with_item(href: edit_path(@record), name: 'Edit') %>
  <% dropdown.with_item(model: @record, method: :delete) %>
<% end %>

<%# Custom trigger %>
<%= render Bali::ActionsDropdown::Component.new do |dropdown| %>
  <% dropdown.with_trigger do %>
    <button class="btn btn-primary">Actions</button>
  <% end %>
  <% dropdown.with_item(href: path, name: 'Do Something') %>
<% end %>

<%# Direction options %>
<%= render Bali::ActionsDropdown::Component.new(direction: :top, align: :end) do |dropdown| %>
  <% dropdown.with_item(href: path, name: 'Action') %>
<% end %>
```

## Item Parameters

Items accept all Link or DeleteLink parameters:
```erb
<% dropdown.with_item(
  href: path,
  name: 'Custom Action',
  icon_name: 'edit',
  disabled: @record.locked?,
  method: :post
) %>

<% dropdown.with_item(
  model: @record,
  method: :delete,
  confirm: 'Are you absolutely sure?',
  skip_confirm: false
) %>
```
