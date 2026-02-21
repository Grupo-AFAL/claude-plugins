# Drawer

Slide-out panel component that appears from the left or right edge of the screen. Includes optional header with title and close button, main content area, and footer slot.

## Parameters

- `active:` (Boolean, default: `false`) - Whether the drawer is initially open
- `size:` (Symbol, default: `:md`) - Panel width (`:sm`, `:md`, `:lg`, `:xl`, `:full`)
- `position:` (Symbol, default: `:right`) - Which edge the drawer slides from (`:left`, `:right`)
- `drawer_id:` (String, optional) - Custom ID for the drawer element (auto-generated if not provided)
- `title:` (String, optional) - Title text displayed in the header

## Slots

- `header` (renders_one) - Custom header content (replaces default title)
- `footer` (renders_one) - Footer content below the main body

## Usage

### Basic drawer with title

```erb
<%= render Bali::Drawer::Component.new(title: 'Settings', drawer_id: 'settings-drawer') do %>
  <p>Drawer content goes here</p>
<% end %>
```

### Drawer with custom size and position

```erb
<%= render Bali::Drawer::Component.new(
  title: 'Filters',
  size: :sm,
  position: :left
) do %>
  <%= render_filter_form %>
<% end %>
```

### Drawer with header and footer slots

```erb
<%= render Bali::Drawer::Component.new do |drawer| %>
  <% drawer.with_header do %>
    <div class="flex items-center justify-between">
      <h3>Custom Header</h3>
      <span class="badge badge-primary">New</span>
    </div>
  <% end %>

  <div class="p-4">
    Main content area
  </div>

  <% drawer.with_footer do %>
    <div class="flex gap-2 justify-end">
      <%= render Bali::Button::Component.new(variant: :ghost) { 'Cancel' } %>
      <%= render Bali::Button::Component.new(variant: :primary) { 'Save' } %>
    </div>
  <% end %>
<% end %>
```

### Opening/closing via Stimulus controller

```erb
<!-- Trigger button -->
<button data-action="click->drawer#open" data-drawer-id="my-drawer">
  Open Drawer
</button>

<!-- Drawer component -->
<%= render Bali::Drawer::Component.new(drawer_id: 'my-drawer', title: 'My Drawer') do %>
  Content here
<% end %>
```

## Notes

- Drawer uses the `drawer` Stimulus controller for open/close behavior
- Press `Esc` key to close the drawer (built-in)
- Includes backdrop overlay that closes drawer when clicked
- Drawer panel has `z-index: 9999` to appear above other content
- Automatically scrollable if content exceeds viewport height
- Mobile-friendly: on small screens, max width is limited to 85%
