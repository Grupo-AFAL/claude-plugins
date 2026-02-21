---
name: hotwire-patterns
description: This skill should be used when the user asks to add Turbo Frames, use Turbo Streams, create a Stimulus controller, make something interactive with Hotwire, add real-time updates, implement lazy loading, add inline editing, use Hotwire features, or asks when to use Turbo Frame vs Turbo Stream vs Stimulus vs React.
---

# Hotwire Patterns for AFAL Rails Apps

Guide for implementing Hotwire (Turbo + Stimulus) patterns in AFAL Rails applications. AFAL apps use Hotwire as the foundation for interactivity, with React reserved for complex widgets via Turbo Mount.

## Quick Decision Guide

Choose the right tool:

| Need | Use | Why |
|------|-----|-----|
| Replace one section of page | Turbo Frame | Scoped navigation/updates |
| Update multiple parts at once | Turbo Streams | Multi-target updates |
| Client-side behavior (toggle, form validation) | Stimulus | JavaScript sprinkles |
| Complex interactive widget (diagrams, rich editors) | React via Turbo Mount | Full component model |
| Real-time updates from server | Turbo Streams + Cable | Broadcast changes |
| Lazy load content | Turbo Frame with src | Deferred loading |
| Inline editing (click to edit) | Turbo Frame | Frame swap pattern |
| Form submission without reload | Turbo Drive (automatic) | Default behavior |

## Turbo Drive (Automatic)

Turbo Drive is active by default and handles:
- Form submissions without full page reload
- Link navigation with AJAX
- Progress bar on slow requests
- Back/forward browser navigation
- Preserves scroll position

Opt out when needed: `data-turbo="false"` on links/forms.

## Turbo Frames

Use for scoped page updates. A frame acts as a portal - navigation inside it only affects that section.

Basic pattern:

```erb
<turbo-frame id="message_1">
  <%= render @message %>
</turbo-frame>
```

Links inside the frame target the frame by default. Break out with `data-turbo-frame="_top"`.

Common patterns:
- Lazy loading (see turbo-frames.md)
- Inline editing (see turbo-frames.md)
- Modal/drawer content
- Tab panels
- Pagination within a section

See `references/turbo-frames.md` for detailed patterns.

## Turbo Streams

Use when one action needs to update multiple parts of the page.

Controller response:

```ruby
def create
  @message = Message.create(message_params)

  respond_to do |format|
    format.turbo_stream
    format.html { redirect_to @message }
  end
end
```

View template `create.turbo_stream.erb`:

```erb
<%= turbo_stream.append "messages", @message %>
<%= turbo_stream.update "message_form", "" %>
<%= turbo_stream.replace "flash", partial: "shared/flash" %>
```

Available actions: append, prepend, replace, update, remove, before, after, morph, refresh.

For real-time updates, use Turbo Streams with ActionCable (Solid Cable in AFAL apps).

See `references/turbo-streams.md` for broadcasting patterns.

## Stimulus Controllers

Use for client-side behavior. Stimulus connects JavaScript to markup via data attributes.

Basic controller structure:

```javascript
// app/javascript/controllers/toggle_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content"]
  static values = { open: Boolean }

  toggle() {
    this.openValue = !this.openValue
    this.contentTarget.hidden = !this.openValue
  }
}
```

In markup:

```erb
<div data-controller="toggle" data-toggle-open-value="false">
  <button data-action="toggle#toggle">Toggle</button>
  <div data-toggle-target="content" hidden>Content</div>
</div>
```

Common use cases:
- Form validation before submit
- Auto-save (debounced)
- Toggle visibility
- Dropdown menus
- Character counters
- Clipboard copy

See `references/stimulus.md` for patterns and examples.

## Bali Integration

Bali ViewComponents already include Stimulus controllers for their interactivity. Do not duplicate:
- Modals - use `Bali::ModalComponent`
- Dropdowns - use `Bali::DropdownComponent`
- Tabs - use `Bali::TabsComponent`

Only write custom Stimulus when Bali does not provide the needed behavior.

## When to Use React

React via Turbo Mount is for complex interactive widgets:
- Diagram editors (React Flow)
- Rich text editors (ProseMirror, Lexical)
- Data visualization requiring heavy client state
- Complex forms with dynamic validation/dependencies

Do NOT use React for:
- Simple forms
- CRUD interfaces
- Navigation
- List filtering/sorting (use Turbo Frames)
- Modals/dropdowns (use Bali)

React islands integrate with Turbo - they auto-mount when frames/streams update the DOM.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing turbo-frame ID on response | Ensure server response includes matching frame ID |
| Frame not found error | Check ID matches, or use `data-turbo-frame="_top"` |
| Turbo intercepts external link | Add `data-turbo="false"` to external links |
| Form submits with full reload | Check Turbo is enabled, form is not `data-turbo="false"` |
| Stimulus controller not connecting | Check naming (kebab-case in HTML, snake_case in filename) |
| Stream broadcast not received | Verify `turbo_stream_from` helper in view, check Solid Cable |
| Multiple frames with same ID | IDs must be unique on page |
| Nested frames breaking navigation | Use explicit `data-turbo-frame` targeting |

## Error Handling

Turbo Frames and Streams handle 4xx/5xx responses by replacing frame content with error HTML. Return appropriate status codes:

```ruby
def update
  if @message.update(message_params)
    # success
  else
    render :edit, status: :unprocessable_entity
  end
end
```

For streams, render error content:

```ruby
format.turbo_stream do
  render turbo_stream: turbo_stream.replace(
    "flash",
    partial: "shared/flash",
    locals: { error: @message.errors.full_messages.join(", ") }
  )
end
```

## Testing

Minitest system tests support Turbo:

```ruby
test "inline editing a message" do
  visit messages_path

  within "#message_#{@message.id}" do
    click_on "Edit"
    fill_in "Body", with: "Updated"
    click_on "Save"

    assert_text "Updated"
  end
end
```

For Turbo Streams with broadcasting, use `perform_enqueued_jobs` to test async broadcasts.

## References

Detailed patterns and examples:
- `references/turbo-frames.md` - Frame patterns (lazy loading, inline editing, modals)
- `references/turbo-streams.md` - Stream actions, broadcasting, real-time updates
- `references/stimulus.md` - Controller patterns, values, targets, outlets

## Implementation Steps

When adding Hotwire interactivity:

1. Identify the interaction need (consult decision table)
2. Choose appropriate tool (Frame/Stream/Stimulus/React)
3. Check if Bali provides the component
4. Implement minimal solution first
5. Test in browser (verify no full page reloads)
6. Add system test coverage
7. Handle error cases

Start with Turbo Drive (default), add Frames for scoped updates, add Streams for multi-target updates, add Stimulus for client behavior, use React only when essential.
