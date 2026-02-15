# Timeline

Display chronological sequences of events using DaisyUI timeline component.

## Parameters

- `position:` - Timeline layout position: `:left`, `:center`, or `:right` (default: `:left`)

## Slots

- `tags` - Timeline elements (headers and items)
  - `header` - Timeline header component (`Bali::Timeline::Header::Component`)
  - `item` - Timeline item component (`Bali::Timeline::Item::Component`)

## Usage

```erb
<%# Basic left-aligned timeline %>
<%= render Bali::Timeline::Component.new do |c| %>
  <% c.with_tag_header(text: 'Start') %>
  <% c.with_tag_item(heading: 'Event 1') { 'Description of event 1' } %>
  <% c.with_tag_item(heading: 'Event 2') { 'Description of event 2' } %>
<% end %>

<%# Centered timeline with alternating sides %>
<%= render Bali::Timeline::Component.new(position: :center) do |c| %>
  <% c.with_tag_header(text: '2024') %>
  <% c.with_tag_item(heading: 'January') { 'New year started' } %>
  <% c.with_tag_item(heading: 'June') { 'Mid-year review' } %>
<% end %>

<%# Right-aligned timeline %>
<%= render Bali::Timeline::Component.new(position: :right) do |c| %>
  <% @events.each do |event| %>
    <% c.with_tag_item(heading: event.title) { event.description } %>
  <% end %>
<% end %>
```

## Notes

- Position `:left` - items appear on left side (default)
- Position `:center` - items alternate between both sides
- Position `:right` - items appear on right side (uses snap-icon modifier)
- Headers can be used to separate timeline sections
