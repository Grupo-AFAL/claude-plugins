# Avatar Component

Bali::Avatar::Component - User avatar with support for images, placeholders, shapes, masks, status indicators, and rings.

## Parameters

```ruby
Bali::Avatar::Component.new(
  src: image_url,                # Image URL (deprecated - use picture slot instead)
  size: :md,                     # :xs, :sm, :md, :lg, :xl
  shape: :circle,                # :square, :rounded, :circle
  mask: :heart,                  # :heart, :squircle, :hexagon, :triangle, :diamond, :pentagon, :star
  status: :online,               # :online, :offline (adds status indicator)
  ring: :primary,                # DaisyUI color for ring effect
  **options                      # Additional HTML attributes
)
```

## Sizes

- `:xs` - w-8
- `:sm` - w-12
- `:md` - w-16
- `:lg` - w-24
- `:xl` - w-32

## Shapes

- `:square` - rounded (small radius)
- `:rounded` - rounded-xl (large radius)
- `:circle` - rounded-full (default)

**Note**: Mask takes precedence over shape if both are provided.

## Masks

- `:heart` - mask-heart
- `:squircle` - mask-squircle
- `:hexagon` - mask-hexagon-2
- `:triangle` - mask-triangle
- `:diamond` - mask-diamond
- `:pentagon` - mask-pentagon
- `:star` - mask-star

## Status Indicators

- `:online` - Green dot indicator
- `:offline` - Gray dot indicator

## Ring Colors

DaisyUI semantic colors:
- `:primary`, `:secondary`, `:accent`, `:neutral`
- `:success`, `:warning`, `:error`, `:info`

Adds 2px ring with offset.

## Slots

### Picture Slot

Preferred way to provide avatar image:
```ruby
avatar.with_picture(image_url: url, alt: 'User name', **options)
```

### Placeholder Slot

Content shown when no image is provided:
```ruby
avatar.with_placeholder do
  # Custom placeholder content (e.g., initials)
end
```

## Examples

```erb
<%# Basic avatar with image %>
<%= render Bali::Avatar::Component.new do |avatar| %>
  <% avatar.with_picture(image_url: @user.avatar_url) %>
<% end %>

<%# Avatar with initials placeholder %>
<%= render Bali::Avatar::Component.new(size: :lg) do |avatar| %>
  <% avatar.with_placeholder do %>
    <span><%= @user.initials %></span>
  <% end %>
<% end %>

<%# Online status indicator %>
<%= render Bali::Avatar::Component.new(status: :online, size: :md) do |avatar| %>
  <% avatar.with_picture(image_url: @user.avatar_url) %>
<% end %>

<%# Custom shape %>
<%= render Bali::Avatar::Component.new(shape: :rounded, size: :xl) do |avatar| %>
  <% avatar.with_picture(image_url: @user.avatar_url) %>
<% end %>

<%# With mask %>
<%= render Bali::Avatar::Component.new(mask: :squircle, size: :lg) do |avatar| %>
  <% avatar.with_picture(image_url: @user.avatar_url) %>
<% end %>

<%# With ring %>
<%= render Bali::Avatar::Component.new(ring: :primary, size: :md) do |avatar| %>
  <% avatar.with_picture(image_url: @user.avatar_url) %>
<% end %>

<%# Multiple effects combined %>
<%= render Bali::Avatar::Component.new(
  size: :lg,
  status: :online,
  ring: :success,
  mask: :hexagon
) do |avatar| %>
  <% avatar.with_picture(image_url: @user.avatar_url) %>
<% end %>

<%# Placeholder with custom styling %>
<%= render Bali::Avatar::Component.new(size: :md) do |avatar| %>
  <% avatar.with_placeholder do %>
    <i class="fas fa-user"></i>
  <% end %>
<% end %>

<%# Deprecated src parameter (still works) %>
<%= render Bali::Avatar::Component.new(src: @user.avatar_url, size: :md) %>
```

## Avatar Groups

Combine multiple avatars (use CSS classes):
```erb
<div class="avatar-group -space-x-6 rtl:space-x-reverse">
  <%= render Bali::Avatar::Component.new do |avatar| %>
    <% avatar.with_picture(image_url: user1.avatar_url) %>
  <% end %>
  <%= render Bali::Avatar::Component.new do |avatar| %>
    <% avatar.with_picture(image_url: user2.avatar_url) %>
  <% end %>
  <%= render Bali::Avatar::Component.new do |avatar| %>
    <% avatar.with_placeholder do %>
      <span>+5</span>
    <% end %>
  <% end %>
</div>
```
