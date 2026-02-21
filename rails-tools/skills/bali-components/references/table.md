# Table Component

Bali::Table::Component - Data table with sortable headers, bulk actions, and filter integration. Uses Stimulus controller for interactivity.

## Parameters

```ruby
Bali::Table::Component.new(
  form: nil,                # Optional filter form object (for sorting/filtering)
  bulk_actions: [],         # Array of bulk action definitions
  sticky_headers: false,    # Enable sticky header positioning
  tbody: {},                # Hash of attributes for <tbody> element
  table_container: {},      # Hash of attributes for container div
  **options                 # Additional HTML attributes for <table> element
)
```

## Slots

| Slot | API | Notes |
|------|-----|-------|
| `headers` | `with_header(name:, sort:, **options)` | Column header with optional sort key |
| `rows` | `with_row(skip_tr:, **options) { block }` | Table row (auto-wraps in `<tr>` unless `skip_tr: true`) |
| `footers` | `with_footer { block }` | Table footer row (renders Footer::Component) |
| `new_record_link` | `with_new_record_link(name:, href:, modal:, **options)` | "Add new" link in empty state |
| `no_records_notification` | `with_no_records_notification { block }` | Empty state when no records exist |
| `no_results_notification` | `with_no_results_notification { block }` | Empty state when filters return no results |

### Headers Slot Details

```ruby
table.with_header(
  name: "Column Name",      # Column header text (optional)
  sort: :attribute_name,    # Sort key (optional, requires form)
  **options                 # Additional options (class, colspan, etc.)
)
```

The header automatically receives `form:` from parent table for sort link generation.

### Rows Slot Details

```ruby
table.with_row(
  skip_tr: false,           # Skip wrapping in <tr> (default: false)
  **options                 # Additional HTML attributes for <tr>
) do
  # <td> elements here
end
```

The row automatically receives `bulk_actions:` boolean from parent table for bulk action checkbox rendering.

### New Record Link Details

```ruby
table.with_new_record_link(
  name: "Add User",         # Link text (required)
  href: new_user_path,      # Link URL (required)
  modal: true,              # Open in modal (default: true)
  **options                 # Additional options passed to Bali::Link::Component
)
```

Renders `Bali::Link::Component` with `type: :success` styling.

## Form Integration

When `form:` parameter is provided:
- Header sort links automatically use the form object
- Empty state detection uses `form.active_filters?` to distinguish between "no records" and "no results"

## Bulk Actions

When `bulk_actions: [...]` array is non-empty:
- Row components receive `bulk_actions: true`
- Typically used to render checkboxes for selecting rows

## Sticky Headers

When `sticky_headers: true`:
- Container gets overflow and positioning classes
- Headers stick to top during scroll
- Positioned at `top: 3.75rem` (adjust for navbar height)

## Empty States

The table intelligently shows empty states:

1. **No results** (when `form.active_filters?` is true):
   - Shows `no_results_notification` if provided
   - Otherwise shows default "No results" message

2. **No records** (when no filters active):
   - Shows `no_records_notification` if provided
   - Otherwise shows default "No records" message + `new_record_link` (if provided)

## Pagination

**Pagination is NOT a table slot.** Use Pagy separately after the table component.

## Examples

### Basic table with sortable headers

```erb
<%= render Bali::Table::Component.new(form: @filter_form) do |table| %>
  <% table.with_header(name: 'Name', sort: :name) %>
  <% table.with_header(name: 'Email', sort: :email) %>
  <% table.with_header(name: 'Actions') %>

  <% @users.each do |user| %>
    <% table.with_row do %>
      <td><%= user.name %></td>
      <td><%= user.email %></td>
      <td>
        <%= link_to 'Edit', edit_user_path(user) %>
      </td>
    <% end %>
  <% end %>
<% end %>

<%== pagy_nav(@pagy) %>
```

### Table with bulk actions

```erb
<%= render Bali::Table::Component.new(
  bulk_actions: [
    { name: 'Delete Selected', action: 'bulk_delete' }
  ]
) do |table| %>
  <% table.with_header(name: '') %>  <%# Checkbox column %>
  <% table.with_header(name: 'Name') %>

  <% @records.each do |record| %>
    <% table.with_row do %>
      <td>
        <%= check_box_tag 'record_ids[]', record.id, false,
            class: 'checkbox checkbox-sm' %>
      </td>
      <td><%= record.name %></td>
    <% end %>
  <% end %>
<% end %>
```

### Table with sticky headers

```erb
<%= render Bali::Table::Component.new(sticky_headers: true) do |table| %>
  <% table.with_header(name: 'Column 1') %>
  <% table.with_header(name: 'Column 2') %>

  <% @many_records.each do |record| %>
    <% table.with_row do %>
      <td><%= record.field1 %></td>
      <td><%= record.field2 %></td>
    <% end %>
  <% end %>
<% end %>
```

### Table with custom empty states

```erb
<%= render Bali::Table::Component.new(form: @filter_form) do |table| %>
  <% table.with_header(name: 'Name') %>

  <% table.with_no_records_notification do %>
    <div class="text-center py-8">
      <p class="text-lg">No users yet!</p>
      <%= render Bali::Button::Component.new(
        name: 'Create First User',
        href: new_user_path,
        variant: :primary
      ) %>
    </div>
  <% end %>

  <% table.with_no_results_notification do %>
    <p class="text-center py-8">No users match your filters.</p>
  <% end %>

  <% table.with_new_record_link(
    name: 'Add User',
    href: new_user_path
  ) %>

  <% @users.each do |user| %>
    <% table.with_row do %>
      <td><%= user.name %></td>
    <% end %>
  <% end %>
<% end %>
```

### Table with footer

```erb
<%= render Bali::Table::Component.new do |table| %>
  <% table.with_header(name: 'Item') %>
  <% table.with_header(name: 'Amount') %>

  <% @items.each do |item| %>
    <% table.with_row do %>
      <td><%= item.name %></td>
      <td><%= number_to_currency(item.amount) %></td>
    <% end %>
  <% end %>

  <% table.with_footer do %>
    <td class="font-bold">Total</td>
    <td class="font-bold"><%= number_to_currency(@total) %></td>
  <% end %>
<% end %>
```

### Table with custom tbody attributes

```erb
<%= render Bali::Table::Component.new(
  tbody: {
    data: { controller: 'sortable' },
    class: 'sortable-list'
  }
) do |table| %>
  <%# ... %>
<% end %>
```

### Table with custom container attributes

```erb
<%= render Bali::Table::Component.new(
  table_container: {
    class: 'max-h-96',
    data: { controller: 'auto-scroll' }
  }
) do |table| %>
  <%# ... %>
<% end %>
```

### Row without automatic <tr> wrapper

```erb
<%= render Bali::Table::Component.new do |table| %>
  <% table.with_header(name: 'Name') %>

  <% @grouped_records.each do |group, records| %>
    <% table.with_row(skip_tr: true) do %>
      <tr class="group-header">
        <td colspan="2"><strong><%= group %></strong></td>
      </tr>
      <% records.each do |record| %>
        <tr>
          <td><%= record.name %></td>
        </tr>
      <% end %>
    <% end %>
  <% end %>
<% end %>
```

## Common Mistakes

| Wrong | Right | Why |
|-------|-------|-----|
| `table.with_pagination` | `pagy_nav(@pagy)` | Pagination is separate from table |
| `table.with_header { "Name" }` | `table.with_header(name: "Name")` | Keyword argument required |
| Singular `with_row` for all rows | Call `with_row` per record | Use `each` loop, call slot method for each row |
| `no_records` for filtered results | `no_results_notification` | Two separate slots for different states |
| `table.with_footer` singular | `table.with_footer` is singular | Unlike rows/headers, footer is singular |

## CSS Classes Applied

The component applies:
- `table` - DaisyUI table class
- `table-zebra` - Striped rows
- `w-full` - Full width
- `overflow-x-auto` - Horizontal scroll on container
- `table-component` - Custom identifier on container
- `overflow-visible`, sticky positioning classes when `sticky_headers: true`

## Stimulus Controller

Container has `data-controller="table"` for table-specific behaviors.

## Accessibility Notes

- Use `<th>` for header cells (handled by Header::Component)
- Provide descriptive header names for screen readers
- Empty states provide clear messaging
- Sort links include proper ARIA labels (handled by form integration)
