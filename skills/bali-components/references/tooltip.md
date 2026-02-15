# Tooltip Component

Bali::Tooltip::Component - Hover tooltip using Tippy.js. Requires `tippy.js` in node_modules.

## Parameters

```ruby
Bali::Tooltip::Component.new(
  placement: :top,                    # :top, :bottom, :left, :right
  trigger_event: 'mouseenter focus',  # Tippy.js trigger events
  **options                           # Additional HTML attributes for container
)
```

## Placement Options

- `:top` - Tooltip appears above trigger (default)
- `:bottom` - Tooltip appears below trigger
- `:left` - Tooltip appears to the left of trigger
- `:right` - Tooltip appears to the right of trigger

## Trigger Events

The `trigger_event` parameter accepts Tippy.js event strings:
- `'mouseenter focus'` - Show on hover and focus (default)
- `'click'` - Show on click
- `'mouseenter'` - Show on hover only
- `'focus'` - Show on focus only
- `'manual'` - Programmatic control only

**Note:** Parameter is named `trigger_event` (not `trigger`) to avoid collision with the `trigger` slot.

## Slots

| Slot | API | Notes |
|------|-----|-------|
| `trigger` | `with_trigger { block }` | **REQUIRED** - The element user interacts with |

Block content (outside the trigger slot) becomes the tooltip message text.

## Stimulus Controller

The component uses `data-controller="tooltip"` with Stimulus values:
- `data-tooltip-placement-value` - Placement position (top/bottom/left/right)
- `data-tooltip-trigger-value` - Trigger events string

The Stimulus controller dynamically imports Tippy.js and initializes the tooltip.

## Examples

### Basic tooltip on button

```erb
<%= render Bali::Tooltip::Component.new(placement: :top) do |tooltip| %>
  <% tooltip.with_trigger do %>
    <%= render Bali::Button::Component.new(name: "Hover me", variant: :outline) %>
  <% end %>
  This is the tooltip text that appears on hover
<% end %>
```

### Tooltip on icon

```erb
<%= render Bali::Tooltip::Component.new(placement: :right) do |tooltip| %>
  <% tooltip.with_trigger do %>
    <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
      <path d="M..."/>
    </svg>
  <% end %>
  Additional information about this icon
<% end %>
```

### Tooltip with HTML content

```erb
<%= render Bali::Tooltip::Component.new(placement: :bottom) do |tooltip| %>
  <% tooltip.with_trigger do %>
    <%= link_to "Help", "#", class: "link" %>
  <% end %>
  <div>
    <strong>Pro Tip:</strong><br>
    You can do multiple things here.
  </div>
<% end %>
```

### Click-triggered tooltip

```erb
<%= render Bali::Tooltip::Component.new(
  placement: :top,
  trigger_event: 'click'
) do |tooltip| %>
  <% tooltip.with_trigger do %>
    <%= render Bali::Button::Component.new(name: "Click for info", variant: :ghost) %>
  <% end %>
  This tooltip shows on click instead of hover
<% end %>
```

### Tooltip on text link

```erb
<p>
  For more details, see the
  <%= render Bali::Tooltip::Component.new do |tooltip| %>
    <% tooltip.with_trigger do %>
      <%= link_to "documentation", docs_path, class: "link" %>
    <% end %>
    Opens in new tab with comprehensive guides
  <% end %>
</p>
```

### Tooltip with custom container classes

```erb
<%= render Bali::Tooltip::Component.new(
  placement: :left,
  class: 'ml-2'
) do |tooltip| %>
  <% tooltip.with_trigger do %>
    <span class="badge badge-info">New</span>
  <% end %>
  This feature was added recently
<% end %>
```

### Tooltip on disabled button

```erb
<%# Wrap disabled button in tooltip since disabled elements don't fire events %>
<%= render Bali::Tooltip::Component.new do |tooltip| %>
  <% tooltip.with_trigger do %>
    <span class="inline-block">
      <%= render Bali::Button::Component.new(
        name: "Submit",
        disabled: true,
        variant: :primary
      ) %>
    </span>
  <% end %>
  Please fill out all required fields first
<% end %>
```

## Common Mistakes

| Wrong | Right | Why |
|-------|-------|-----|
| `Tooltip.new(content: "text")` | Block content + `with_trigger` | NO content parameter exists |
| `Tooltip.new { button }` | `tooltip.with_trigger { button }` | MUST use trigger slot for interactive element |
| `placement: 'top'` | `placement: :top` | Use symbol, not string |
| Tooltip around disabled button | Wrap in `<span>` first | Disabled elements don't fire events |
| Missing `with_trigger` slot | Always include trigger | Trigger slot is required |
| `trigger: 'click'` | `trigger_event: 'click'` | Parameter is `trigger_event`, not `trigger` |

## JavaScript Dependency

Install Tippy.js via npm/yarn:

```bash
yarn add tippy.js
# or
npm install tippy.js
```

The Bali Stimulus controller dynamically imports Tippy.js from node_modules:

```javascript
import Tooltip from "tippy.js"
```

Tippy.js must be available in your JavaScript build pipeline.

## CSS Classes Applied

The component applies:
- `tooltip-component` - Custom identifier class
- `inline-block` - Ensures proper positioning
- Additional classes from `options[:class]`

The trigger wrapper gets:
- `trigger` - Class identifier
- `cursor-pointer` - Indicates interactivity

## Accessibility Notes

- Tooltips should supplement, not replace, visible labels
- Don't put critical information in tooltips (may not be accessible to all users)
- The trigger element should be keyboard-focusable (buttons, links work well)
- Default `trigger_event: 'mouseenter focus'` ensures keyboard accessibility

## Tippy.js Configuration

The Stimulus controller can be extended to pass additional Tippy.js options. Current implementation sets:
- `placement` - From component parameter
- `trigger` - From component parameter (via `trigger_event`)

For advanced Tippy.js features (animations, delays, themes), extend the Stimulus controller or pass options via data attributes.
