# Delete Link Component

Bali::DeleteLink::Component - DELETE action with confirmation dialog. Wraps link in form with method: :delete.

## Parameters

```ruby
Bali::DeleteLink::Component.new(
  model: @user,                  # ActiveRecord model (auto-generates href and confirm)
  href: path,                    # Explicit path (use if not passing model)
  name: 'Delete',                # Link text (optional if block content provided)
  confirm: 'Are you sure?',      # Custom confirm message
  size: :md,                     # :xs, :sm, :md, :lg
  disabled: false,               # Disables link
  disabled_hover_url: '/help',   # Tooltip URL when disabled
  skip_confirm: false,           # Skip confirmation dialog
  icon: false,                   # Show trash icon instead of text
  icon_name: 'trash-alt',        # Custom icon name (vs icon: true for default)
  authorized: true,              # Controls render? visibility
  plain: false,                  # No button styling (just flex layout)
  form_class: 'inline-block',    # CSS class for wrapping form
  **options                      # Additional HTML attributes for button
)
```

## Sizes

- `:xs` - btn-xs
- `:sm` - btn-sm
- `:md` - default
- `:lg` - btn-lg

## Auto-Generated Confirmation

If `model:` is provided and `confirm:` is not, generates localized message:
```
"Are you sure you want to delete {pronoun} {model_name}?"
```

Uses:
- `@model.model_name.human` for model name
- `I18n.t("activerecord.pronouns.#{model_name}")` for pronoun

## URL Requirement

Must provide either `model:` or `href:`. Raises `MissingURL` error if neither is present.

## Authorization

Component checks `@authorized` in `render?` method. Use `authorized: false` to hide from unauthorized users:
```ruby
Bali::DeleteLink::Component.new(
  model: @user,
  authorized: policy(@user).destroy?
)
```

## Examples

```erb
<%# Simple delete with model %>
<%= render Bali::DeleteLink::Component.new(model: @user) %>

<%# Custom confirm message %>
<%= render Bali::DeleteLink::Component.new(
  model: @user,
  confirm: 'This will permanently delete the user. Continue?'
) %>

<%# Icon only %>
<%= render Bali::DeleteLink::Component.new(
  model: @user,
  icon: true,
  size: :sm
) %>

<%# Custom icon %>
<%= render Bali::DeleteLink::Component.new(
  model: @user,
  icon_name: 'times-circle',
  name: 'Remove'
) %>

<%# Skip confirmation (dangerous!) %>
<%= render Bali::DeleteLink::Component.new(
  model: @user,
  skip_confirm: true
) %>

<%# With authorization %>
<%= render Bali::DeleteLink::Component.new(
  model: @user,
  authorized: policy(@user).destroy?
) %>

<%# Plain styling %>
<%= render Bali::DeleteLink::Component.new(
  model: @user,
  plain: true,
  name: 'Delete User'
) %>

<%# Explicit href %>
<%= render Bali::DeleteLink::Component.new(
  href: admin_user_path(@user),
  name: 'Delete',
  confirm: 'Remove this admin user?'
) %>

<%# Disabled with tooltip %>
<%= render Bali::DeleteLink::Component.new(
  model: @user,
  disabled: @user.has_dependencies?,
  disabled_hover_url: help_path('cannot_delete')
) %>

<%# Custom form class %>
<%= render Bali::DeleteLink::Component.new(
  model: @user,
  form_class: 'block mt-4'
) %>
```

## In Dropdown Menus

ActionsDropdown automatically uses DeleteLink when `method: :delete`:
```erb
<%= render Bali::ActionsDropdown::Component.new do |dropdown| %>
  <% dropdown.with_item(href: edit_path(@user), name: 'Edit') %>
  <% dropdown.with_item(model: @user, method: :delete) %>  <%# Auto-renders DeleteLink %>
<% end %>
```
