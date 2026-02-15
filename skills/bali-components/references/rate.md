# Rate

Star rating component for collecting and displaying ratings.

## Parameters

- `value:` (required) - Current rating value (integer)
- `form:` - Rails form builder object (required for input mode)
- `method:` - Form method name (required for input mode)
- `scale:` - Rating scale as a range (default: 1..5)
- `size:` - Star size: `:xs`, `:sm`, `:md`, `:lg` (default: `:md`)
- `color:` - Star color: `:warning`, `:primary`, `:secondary`, `:accent`, `:success`, `:error`, `:info` (default: `:warning`)
- `auto_submit:` - Auto-submit form on click (default: false)
- `readonly:` - Display-only mode, no interaction (default: false)

## Usage

```erb
<%# In a form for user input %>
<%= form_with model: @review do |f| %>
  <%= render Bali::Rate::Component.new(form: f, method: :rating, value: @review.rating) %>
<% end %>

<%# Read-only display %>
<%= render Bali::Rate::Component.new(value: @product.average_rating, readonly: true) %>

<%# Auto-submit on click %>
<%= form_with model: @rating, data: { turbo_frame: 'rating' } do |f| %>
  <%= render Bali::Rate::Component.new(
    form: f,
    method: :stars,
    value: @rating.stars,
    auto_submit: true
  ) %>
<% end %>

<%# Custom scale (1-10) %>
<%= render Bali::Rate::Component.new(
  form: f,
  method: :score,
  value: @review.score,
  scale: 1..10
) %>

<%# Custom size and color %>
<%= render Bali::Rate::Component.new(
  value: 4,
  readonly: true,
  size: :lg,
  color: :primary
) %>
```

## Notes

- Default scale is 1-5 stars
- Uses native DaisyUI radio button styling for stars
- When `readonly: true`, stars are not interactive
- When `auto_submit: true`, form submits immediately on star selection
- Renders as radio buttons with star mask for accessibility
