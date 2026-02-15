# Image Grid

Responsive image gallery with configurable columns and spacing.

## Parameters

- `columns:` - Number of columns (2, 3, 4, 5, or 6) (default: 4)
- `gap:` - Spacing between images: `:none`, `:sm`, `:md`, `:lg` (default: `:md`)

## Slots

- `images` - Image components (`Bali::ImageGrid::Image::Component`)

## Usage

```erb
<%# Basic 4-column grid %>
<%= render Bali::ImageGrid::Component.new do |c| %>
  <% @photos.each do |photo| %>
    <% c.with_image(src: photo.url, alt: photo.title) %>
  <% end %>
<% end %>

<%# 3-column grid with small gap %>
<%= render Bali::ImageGrid::Component.new(columns: 3, gap: :sm) do |c| %>
  <% @gallery.each do |image| %>
    <% c.with_image(src: image.url, alt: image.caption) %>
  <% end %>
<% end %>

<%# 6-column grid with no gap %>
<%= render Bali::ImageGrid::Component.new(columns: 6, gap: :none) do |c| %>
  <% @thumbnails.each do |thumb| %>
    <% c.with_image(src: thumb.url) %>
  <% end %>
<% end %>

<%# Large spacing %>
<%= render Bali::ImageGrid::Component.new(columns: 2, gap: :lg) do |c| %>
  <% c.with_image(src: 'image1.jpg', alt: 'First') %>
  <% c.with_image(src: 'image2.jpg', alt: 'Second') %>
<% end %>
```

## Notes

- Gap options:
  - `:none` - No spacing (0px)
  - `:sm` - Small spacing (8px)
  - `:md` - Medium spacing (16px)
  - `:lg` - Large spacing (24px)
- Grid is responsive via Tailwind CSS classes
