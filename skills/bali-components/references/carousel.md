# Carousel

Image carousel/slideshow using Glide.js.

## Parameters

- `slides_per_view:` - Number of slides visible at once (default: 1)
- `start_at:` - Index of initial slide (default: 0)
- `autoplay:` - Autoplay speed: `:disabled`, `:slow` (5s), `:medium` (3s), `:fast` (1.5s), or milliseconds as integer (default: `:disabled`)
- `gap:` - Space between slides in pixels (default: 0)
- `focus_at:` - Focus position: `:center` or numeric index (default: `:center`)
- `breakpoints:` - Responsive breakpoints configuration (default: nil)
- `peek:` - Pixels to show of adjacent slides (default: nil)

## Slots

- `items` - Slide content (any content)
- `arrows` - Navigation arrows component (`Bali::Carousel::Arrows::Component`)
- `bullets` - Pagination bullets indicator

## Usage

```erb
<%# Basic carousel %>
<%= render Bali::Carousel::Component.new do |c| %>
  <% c.with_item { image_tag('slide1.jpg') } %>
  <% c.with_item { image_tag('slide2.jpg') } %>
  <% c.with_item { image_tag('slide3.jpg') } %>
  <% c.with_arrows %>
  <% c.with_bullets %>
<% end %>

<%# Autoplay with 3 seconds interval %>
<%= render Bali::Carousel::Component.new(autoplay: :medium) do |c| %>
  <% @images.each do |img| %>
    <% c.with_item { image_tag(img.url) } %>
  <% end %>
<% end %>

<%# Multiple slides per view %>
<%= render Bali::Carousel::Component.new(slides_per_view: 3, gap: 20) do |c| %>
  <% @products.each do |product| %>
    <% c.with_item { render 'product_card', product: product } %>
  <% end %>
  <% c.with_arrows %>
<% end %>

<%# With peek effect %>
<%= render Bali::Carousel::Component.new(peek: { before: 50, after: 50 }) do |c| %>
  <% c.with_item { image_tag('photo1.jpg') } %>
  <% c.with_item { image_tag('photo2.jpg') } %>
<% end %>

<%# Responsive breakpoints %>
<%= render Bali::Carousel::Component.new(
  slides_per_view: 1,
  breakpoints: {
    768: { perView: 2 },
    1024: { perView: 3 }
  }
) do |c| %>
  <% @items.each do |item| %>
    <% c.with_item { render item } %>
  <% end %>
<% end %>
```

## Notes

- Autoplay intervals:
  - `:disabled` - No autoplay (default)
  - `:slow` - 5000ms (5 seconds)
  - `:medium` - 3000ms (3 seconds)
  - `:fast` - 1500ms (1.5 seconds)
  - Or pass any integer for custom milliseconds
- Bullets are hidden by default, call `with_bullets(hidden: false)` to show them
- Arrows provide previous/next navigation
- Peek shows portions of adjacent slides for preview effect
