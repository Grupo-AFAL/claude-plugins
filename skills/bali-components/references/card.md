# Card Component

Bali::Card::Component - Content card with optional header, title, image, and actions.

## Parameters

```ruby
Bali::Card::Component.new(
  style: :default,      # :default, :bordered, :dash
  size: :md,            # :xs, :sm, :md, :lg, :xl
  side: false,          # Side-by-side layout (image beside content)
  image_full: false,    # Image fills entire card as background
  shadow: true,         # Apply shadow (shadow-sm class)
  body_class: nil,      # Additional classes for card-body
  **options             # Additional HTML attributes (class, data, etc.)
)
```

## Style Options

- `:default` - Standard card appearance
- `:bordered` - Card with border (card-border class)
- `:dash` - Card with dashed border (card-dash class)

## Size Options

- `:xs` - Extra small card (card-xs)
- `:sm` - Small card (card-sm)
- `:md` - Medium card (default, no size class)
- `:lg` - Large card (card-lg)
- `:xl` - Extra large card (card-xl)

## Slots

| Slot | API | Notes |
|------|-----|-------|
| `header` | `with_header { block }` | Renders Bali::Card::Header::Component |
| `title` | `with_title(text, **options)` | **STRING argument, NOT a block** - renders `<h2 class="card-title">` |
| `image` | `with_image(src:, href:, alt:, figure_class:, **opts)` | Card image with optional link wrapper |
| `actions` | `with_action(...)` | **Use singular `with_action`** - renders Bali::Card::Action::Component |

**NO** `with_body` or `with_footer` slots. Content goes directly in the block (auto-wrapped in card-body when header, title, or actions present).

## Image Slot Details

The image slot accepts either keyword arguments OR a block:

### With keyword arguments:
```ruby
card.with_image(src: url, href: link_path, alt: "Description", figure_class: "custom-class")
```
- Creates `Bali::Card::Image::Component`
- `src:` - Image URL (required when using keyword args)
- `href:` - Optional link wrapper URL
- `alt:` - Image alt text
- `figure_class:` - CSS classes for `<figure>` wrapper

### With block (custom figure content):
```ruby
card.with_image(figure_class: "custom-class") do
  # Custom content inside <figure>
end
```

## Examples

### Simple card with title and actions

```erb
<%= render Bali::Card::Component.new(style: :bordered, size: :lg) do |card| %>
  <% card.with_title("Project Name") %>
  <% card.with_image(src: project.image_url, alt: "Project thumbnail") %>

  <p>Project description goes here.</p>

  <% card.with_action(href: edit_project_path(project)) { "Edit" } %>
  <% card.with_action(href: project_path(project), data: { turbo_method: :delete }) { "Delete" } %>
<% end %>
```

### Card with side image layout

```erb
<%= render Bali::Card::Component.new(side: true, shadow: true) do |card| %>
  <% card.with_image(src: user.avatar_url) %>
  <% card.with_title("#{user.name}") %>

  <p><%= user.bio %></p>
<% end %>
```

### Card with full background image

```erb
<%= render Bali::Card::Component.new(image_full: true) do |card| %>
  <% card.with_image(src: background_url) %>
  <% card.with_title("Overlay Title", class: "text-white") %>

  <p class="text-white">Content with image background</p>
<% end %>
```

### Card with custom body classes

```erb
<%= render Bali::Card::Component.new(body_class: "items-center text-center") do |card| %>
  <% card.with_title("Centered Content") %>
  <p>This content is centered.</p>
<% end %>
```

### Complex title with nested components

For titles containing badges, icons, or other components, use `with_title` with options or raw HTML in the card body:

```erb
<%# Option 1: Pass title text with custom class %>
<%= render Bali::Card::Component.new do |card| %>
  <% card.with_title("My Title", class: "text-lg flex gap-2 items-center") %>
  <%# Add badge separately in body %>
  <%= render Bali::Tag::Component.new(text: "Badge", color: :primary, size: :sm) %>
<% end %>

<%# Option 2: Use raw HTML in body for full control %>
<%= render Bali::Card::Component.new do %>
  <h2 class="card-title text-lg">
    My Title
    <%= render Bali::Tag::Component.new(text: "Badge", color: :primary, size: :sm) %>
  </h2>
  <p>Content here...</p>
<% end %>
```

### Compact card without shadow

```erb
<%= render Bali::Card::Component.new(size: :sm, shadow: false) do |card| %>
  <% card.with_title("Compact Card") %>
  <p>Minimal spacing, no shadow.</p>
<% end %>
```

## Common Mistakes

| Wrong | Right | Why |
|-------|-------|-----|
| `card.with_title { "Title" }` | `card.with_title("Title")` | Takes text argument, not block |
| `card.with_title { tag + text }` | `<h2 class="card-title">` in body | For complex titles, use raw HTML |
| `card.with_body` | Block content directly | Card has no body slot |
| `card.with_footer` | `card.with_action` (singular) | Use singular, add each action separately |
| `card.with_actions` | `card.with_action` (singular) | Slot is singular, call multiple times |
| `compact: true` | `size: :xs` or `size: :sm` | Use size parameter, not compact |
| `side_image: true` | `side: true` | Parameter is `side`, not `side_image` |

## CSS Classes Applied

The component automatically applies:
- `card` - Base DaisyUI card class
- `bg-base-100` - Background color
- `shadow-sm` - Default shadow (unless `shadow: false`)
- Size and style classes based on parameters
- `card-side` - When `side: true`
- `image-full` - When `image_full: true`

The card-body wrapper is automatically rendered when:
- `header` slot is used
- `title` slot is used
- Any `actions` are present
- Block content is provided
