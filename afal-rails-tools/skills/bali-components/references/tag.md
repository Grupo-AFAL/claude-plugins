# Tag Component

Bali::Tag::Component - Badge/tag for labels and status indicators.

## Parameters

```ruby
Bali::Tag::Component.new(
  text: 'Active',                # Tag text (optional if block content provided)
  href: path,                    # Makes tag clickable (renders as <a> instead of <div>)
  color: :success,               # DaisyUI semantic color
  custom_color: '#FF5733',       # Custom hex color (auto-calculates contrast text)
  size: :md,                     # :xs, :sm, :md, :lg, :xl
  style: :outline,               # :outline, :soft, :dash
  light: false,                  # DEPRECATED - use style: :outline instead
  rounded: false,                # Full rounded styling (rounded-full)
  **options                      # Additional HTML attributes
)
```

## Colors

DaisyUI semantic colors:
- `:neutral`, `:primary`, `:secondary`, `:accent`, `:ghost`
- `:info`, `:success`, `:warning`, `:error`

Legacy Bulma mappings (deprecated):
- `:danger` → `:error`
- `:link` → `:primary`
- `:black`, `:dark` → `:neutral`
- `:light`, `:white` → `:ghost`

## Sizes

- `:xs` - badge-xs
- `:sm` - badge-sm
- `:md` - badge-md
- `:lg` - badge-lg
- `:xl` - badge-xl

Legacy Bulma mappings (deprecated):
- `:small` → `:sm`
- `:medium` → `:md`
- `:large` → `:lg`
- `:normal` → default

## Styles

- `:outline` - badge-outline
- `:soft` - badge-soft
- `:dash` - badge-dash

## Custom Colors

Use `custom_color:` with hex value. Component automatically calculates contrasting text color:
```ruby
Bali::Tag::Component.new(text: 'Custom', custom_color: '#FF5733')
```

## Clickable Tags

Provide `href:` to render as link:
```ruby
Bali::Tag::Component.new(text: 'Filter', href: filter_path, color: :primary)
```

## Examples

```erb
<%# Basic tag %>
<%= render Bali::Tag::Component.new(text: 'Active', color: :success) %>

<%# Outlined style %>
<%= render Bali::Tag::Component.new(
  text: 'Pending',
  color: :warning,
  style: :outline
) %>

<%# Custom color %>
<%= render Bali::Tag::Component.new(
  text: 'Brand',
  custom_color: '#FF5733',
  size: :lg
) %>

<%# Clickable tag %>
<%= render Bali::Tag::Component.new(
  text: 'Documentation',
  href: docs_path,
  color: :info
) %>

<%# Fully rounded %>
<%= render Bali::Tag::Component.new(
  text: '99+',
  color: :error,
  rounded: true,
  size: :sm
) %>

<%# Soft style %>
<%= render Bali::Tag::Component.new(
  text: 'Draft',
  color: :neutral,
  style: :soft
) %>

<%# With block content %>
<%= render Bali::Tag::Component.new(color: :primary) do %>
  <i class="fas fa-star"></i> Featured
<% end %>
```

## Status Indicators

Common pattern for status tags:
```erb
<%= render Bali::Tag::Component.new(
  text: @user.status.humanize,
  color: case @user.status
    when 'active' then :success
    when 'pending' then :warning
    when 'suspended' then :error
    else :neutral
  end
) %>
```
