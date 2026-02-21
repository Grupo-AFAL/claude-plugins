# Button Component

Bali::Button::Component - Action button for triggering behavior. Use Link for navigation.

## Parameters

```ruby
Bali::Button::Component.new(
  name: 'Click',                 # Button text (optional if block content provided)
  variant: :primary,             # Button variant (optional)
  size: :md,                     # :xs, :sm, :md, :lg, :xl
  icon_name: 'save',             # Icon name (auto-renders via slot)
  type: :button,                 # HTML button type (:button, :submit, :reset)
  disabled: false,               # Disables button
  loading: false,                # Shows spinner (adds 'loading loading-spinner' classes)
  **options                      # Additional HTML attributes (class, data, etc.)
)
```

## Variants

`:primary`, `:secondary`, `:accent`, `:info`, `:success`, `:warning`, `:error`, `:ghost`, `:link`, `:neutral`, `:outline`

Note: Button has `:outline` as a variant (not a separate style parameter like Link).

## Sizes

`:xs`, `:sm`, `:md`, `:lg`, `:xl`

## Slots

```ruby
# Icon slots - both accept icon name and options
button.with_icon('save', class: 'text-xl')
button.with_icon_right('arrow-right')
```

## Loading State

Show spinner while async action is processing:
```ruby
Bali::Button::Component.new(name: 'Saving...', loading: true)
```

## Button vs Link Decision

| Use Case | Component |
|----------|-----------|
| Navigation (goes to URL) | `Bali::Link::Component` |
| Action (triggers JS behavior) | `Bali::Button::Component` |
| Link styled as button | `Bali::Link::Component` with `variant:` |
| Submit in a form | `f.submit` or `f.submit_actions` via FormBuilder |
| Delete action | `Bali::DeleteLink::Component` |

## Examples

```erb
<%# Simple button %>
<%= render Bali::Button::Component.new(
  name: 'Click Me',
  variant: :primary
) %>

<%# Submit button in form %>
<%= render Bali::Button::Component.new(
  name: 'Save',
  type: :submit,
  variant: :success
) %>

<%# Button with icon %>
<%= render Bali::Button::Component.new(
  name: 'Save',
  variant: :primary,
  icon_name: 'save'
) %>

<%# Loading state %>
<%= render Bali::Button::Component.new(
  name: 'Processing...',
  variant: :primary,
  loading: true,
  disabled: true
) %>

<%# Stimulus action %>
<%= render Bali::Button::Component.new(
  name: 'Toggle',
  variant: :secondary,
  data: { action: 'click->modal#open' }
) %>

<%# With icon slots %>
<%= render Bali::Button::Component.new(name: 'Next') do |button| %>
  <% button.with_icon_right('arrow-right') %>
<% end %>
```
