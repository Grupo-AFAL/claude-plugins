# Bali::HoverCard::Component

Tooltip-style popover component with asynchronous content loading using Tippy.js.

## Parameters

- `hover_url:` (String) - URL to fetch content from asynchronously
- `placement:` (String) - Tippy.js placement. Options: `auto`, `auto-start`, `auto-end`, `top`, `top-start`, `top-end`, `bottom`, `bottom-start`, `bottom-end`, `right`, `right-start`, `right-end`, `left`, `left-start`, `left-end`. Default: `'auto'`
- `open_on_click:` (Boolean) - Switch between hover and click behavior. Default: `false`
- `append_to:` (String) - Where to append the popup. Options: `'body'` (default), `'parent'`, or CSS selector
- `z_index:` (Integer) - Z-index for the popup. Default: `9999`
- `content_padding:` (Boolean) - Whether to add padding to content. Default: `true`
- `arrow:` (Boolean) - Whether to show an arrow pointing to trigger. Default: `true`
- Standard HTML attributes accepted via `**options`

## Slots

### `trigger` (renders_one)
The element that triggers the hovercard. Automatically receives `data-hovercard-target="trigger"`.

## Placement Options

Valid Tippy.js placements (validated, falls back to `'auto'`):
- **Auto**: `auto`, `auto-start`, `auto-end`
- **Top**: `top`, `top-start`, `top-end`
- **Bottom**: `bottom`, `bottom-start`, `bottom-end`
- **Right**: `right`, `right-start`, `right-end`
- **Left**: `left`, `left-start`, `left-end`

## Usage

### Basic Hover Card

```erb
<%= render Bali::HoverCard::Component.new(hover_url: user_card_path(@user)) do |card| %>
  <% card.with_trigger do %>
    <%= link_to @user.name, user_path(@user) %>
  <% end %>

  Loading...
<% end %>
```

### Click to Open

```erb
<%= render Bali::HoverCard::Component.new(
  hover_url: details_path,
  open_on_click: true
) do |card| %>
  <% card.with_trigger do %>
    <button type="button" class="btn btn-sm">Details</button>
  <% end %>

  <p>Loading details...</p>
<% end %>
```

### Custom Placement

```erb
<%= render Bali::HoverCard::Component.new(
  hover_url: preview_path(@item),
  placement: 'right-start'
) do |card| %>
  <% card.with_trigger do %>
    <span class="link">Preview</span>
  <% end %>

  Loading preview...
<% end %>
```

### Without Arrow

```erb
<%= render Bali::HoverCard::Component.new(
  hover_url: info_path,
  arrow: false
) do |card| %>
  <% card.with_trigger do %>
    <i class="icon-info"></i>
  <% end %>

  Loading...
<% end %>
```

### Without Content Padding

```erb
<%= render Bali::HoverCard::Component.new(
  hover_url: image_path,
  content_padding: false
) do |card| %>
  <% card.with_trigger do %>
    <span>View Image</span>
  <% end %>

  <%= image_tag "placeholder.jpg" %>
<% end %>
```

### Append to Parent

```erb
<%= render Bali::HoverCard::Component.new(
  hover_url: tooltip_path,
  append_to: 'parent'
) do |card| %>
  <% card.with_trigger do %>
    <span>Hover me</span>
  <% end %>

  Loading...
<% end %>
```

### Custom Z-Index

```erb
<%= render Bali::HoverCard::Component.new(
  hover_url: modal_content_path,
  z_index: 10000
) do |card| %>
  <% card.with_trigger do %>
    <button class="btn">Open</button>
  <% end %>

  Loading...
<% end %>
```

## Controller Response

The `hover_url` endpoint should return HTML fragment:

```ruby
class UserCardsController < ApplicationController
  def show
    @user = User.find(params[:id])
    render partial: 'user_card', locals: { user: @user }
  end
end
```

## Stimulus Controller Data

The component sets the following Stimulus values:
- `data-controller="hovercard"`
- `data-hovercard-placement-value`: Placement option
- `data-hovercard-url-value`: URL to fetch content from
- `data-hovercard-content-padding-value`: Whether to add padding
- `data-hovercard-z-index-value`: Z-index value
- `data-hovercard-append-to-value`: Where to append popup
- `data-hovercard-arrow-value`: Whether to show arrow
- `data-hovercard-trigger-value`: Trigger event (`'mouseenter focus'` or `'click'`)

## Notes

- Base component class: `hover-card-component`
- Content padding wrapper class: `hover-card-content`
- Trigger automatically gets: `data-hovercard-target="trigger"`
- Invalid placement values fall back to `'auto'`
- Async loading displays initial content slot until server response arrives
