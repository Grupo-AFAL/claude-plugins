# Link Component

Bali::Link::Component - Styled navigation link. Use for anything that navigates to a URL.

## Parameters

```ruby
Bali::Link::Component.new(
  href: path,                    # Required - URL or path
  name: 'Click me',              # Link text (optional if block content provided)
  variant: :primary,             # Button styling variant (optional)
  style: :outline,               # :outline or :soft (requires variant)
  size: :md,                     # :xs, :sm, :md, :lg, :xl (requires variant)
  icon_name: 'edit',             # Icon name (auto-renders via slot)
  active: true,                  # Force active state
  active_path: '/users',         # Path to match for active state
  match: :exact,                 # :exact or :prefix (for active_path matching)
  method: :post,                 # HTTP method (:get, :post, :delete, :patch, :put)
  disabled: false,               # Disables link (removes href, adds styling)
  plain: false,                  # No button styling (just flex layout)
  modal: true,                   # Opens modal (true or { size: :lg })
  drawer: true,                  # Opens drawer (true or { size: :lg })
  authorized: true,              # Controls render? visibility
  type: :primary,                # DEPRECATED - use variant instead
  **options                      # Additional HTML attributes (class, data, etc.)
)
```

## Variants

`:primary`, `:secondary`, `:accent`, `:info`, `:success`, `:warning`, `:error`, `:ghost`, `:link`, `:neutral`

## Styles

- `:outline` - Outlined button style (requires variant)
- `:soft` - Soft background style (requires variant)

## Slots

```ruby
# Icon slots - both accept icon name and options
link.with_icon('edit', class: 'text-xl')
link.with_icon_right('arrow-right')
```

## Active State

Links automatically detect active state:
- If `active:` is explicitly set, uses that value
- Otherwise, checks if current path matches `href` or `active_path`
- `match: :exact` requires exact path match (default)
- `match: :prefix` matches if current path starts with the specified path

## Modal and Drawer

Open modal or drawer on click instead of navigating:
```ruby
# Simple - uses default size
Bali::Link::Component.new(href: path, modal: true)

# With size option
Bali::Link::Component.new(href: path, modal: { size: :lg })
Bali::Link::Component.new(href: path, drawer: { size: :xl })
```

## HTTP Methods

Specify HTTP method for form-like links:
```ruby
# GET uses data-method
Bali::Link::Component.new(href: path, method: :get)

# POST/DELETE/etc use data-turbo-method
Bali::Link::Component.new(href: path, method: :delete)
```

## When to Use

| Use Case | Component |
|----------|-----------|
| Navigation (goes to URL) | `Bali::Link::Component` |
| Action (triggers behavior) | `Bali::Button::Component` |
| Link styled as button | `Bali::Link::Component` with `variant:` |
| Delete action | `Bali::DeleteLink::Component` |

## Examples

```erb
<%# Simple link %>
<%= render Bali::Link::Component.new(href: user_path(@user), name: 'View User') %>

<%# Button-styled link %>
<%= render Bali::Link::Component.new(
  href: new_user_path,
  name: 'New User',
  variant: :primary,
  icon_name: 'plus'
) %>

<%# Link with active detection %>
<%= render Bali::Link::Component.new(
  href: users_path,
  name: 'Users',
  active_path: '/users',
  match: :prefix
) %>

<%# Modal trigger link %>
<%= render Bali::Link::Component.new(
  href: edit_user_path(@user),
  name: 'Edit',
  variant: :secondary,
  modal: { size: :lg }
) %>

<%# Plain link (no button styling) %>
<%= render Bali::Link::Component.new(
  href: user_path(@user),
  name: 'Details',
  plain: true,
  icon_name: 'arrow-right'
) %>

<%# With icon slots %>
<%= render Bali::Link::Component.new(href: path, name: 'Edit') do |link| %>
  <% link.with_icon('pencil') %>
<% end %>
```
