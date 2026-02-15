# Modal Component

Bali::Modal::Component - Dialog modal with header, body, and action slots. Uses Stimulus controller for open/close behavior.

## Parameters

```ruby
Bali::Modal::Component.new(
  active: true,         # Whether modal starts open (default: true)
  size: nil,            # :sm, :md, :lg, :xl, :full
  id: nil,              # Modal ID (auto-generated if nil)
  wrapper_class: nil,   # Additional classes for modal-box
  **options             # Additional HTML attributes for outer modal element
)
```

## Size Options

- `:sm` - `max-w-sm` - Small modal
- `:md` - `max-w-md` - Medium modal
- `:lg` - `max-w-lg` - Large modal
- `:xl` - `max-w-xl` - Extra large modal
- `:full` - `max-w-full` - Full width modal
- `nil` - Default DaisyUI modal-box width

## Slots

| Slot | API | Notes |
|------|-----|-------|
| `header` | `with_header(title:, badge:, badge_color:, close_button:)` | Modal header with title, optional badge, and close button |
| `body` | `with_body(**options) { block }` | Main content area (provides `aria-describedby`) |
| `actions` | `with_actions(**options) { block }` | Bottom action buttons (**NOT** `with_footer`) |

### Header Slot Details

```ruby
modal.with_header(
  title: "Modal Title",           # Required - header text
  badge: nil,                      # Optional badge text
  badge_color: :primary,           # Badge color (default: :primary)
  close_button: true,              # Show close button (default: true)
  **opts                           # Additional options passed to Header::Component
)
```

The header automatically:
- Receives `modal_id` for closing the modal
- Sets `id="#{modal_id}-title"` for `aria-labelledby`
- Renders close button unless `close_button: false`

### Body Slot Details

```ruby
modal.with_body(**options) do
  # Content here
end
```

The body automatically:
- Receives `modal_id` from parent
- Sets `id="#{modal_id}-description"` for `aria-describedby`

### Actions Slot Details

```ruby
modal.with_actions(**options) do
  # Button components here
end
```

Renders `Bali::Modal::Actions::Component` - typically contains buttons for submit/cancel actions.

## Modal ID and Accessibility

The modal generates these IDs for accessibility:
- `modal_id` - Main modal ID (from `id:` param or auto-generated as `modal-#{object_id}`)
- `#{modal_id}-title` - Header title ID (for `aria-labelledby`)
- `#{modal_id}-description` - Body content ID (for `aria-describedby`)

## Stimulus Controllers

The modal has `data-controller="modal"` and responds to:

- `modal#open` - Opens the modal
- `modal#close` - Closes the modal

## Examples

### Basic modal with all slots

```erb
<%= render Bali::Modal::Component.new(id: 'user-modal', size: :lg) do |modal| %>
  <% modal.with_header(title: "Edit User", close_button: true) %>

  <% modal.with_body do %>
    <%= form_with model: @user, url: user_path(@user), builder: Bali::FormBuilder do |f| %>
      <%= f.text_field_group :name %>
      <%= f.email_field_group :email %>
      <%= f.submit_actions "Save", modal: true %>
    <% end %>
  <% end %>
<% end %>
```

### Modal with badge in header

```erb
<%= render Bali::Modal::Component.new(id: 'status-modal') do |modal| %>
  <% modal.with_header(
    title: "Task Status",
    badge: "New",
    badge_color: :success
  ) %>

  <% modal.with_body do %>
    <p>Task details...</p>
  <% end %>
<% end %>
```

### Modal opened by button trigger

```erb
<%# Button that opens the modal %>
<%= render Bali::Button::Component.new(
  name: 'Open Modal',
  variant: :primary,
  data: { action: 'modal#open' }
) %>

<%# Modal (starts closed) %>
<%= render Bali::Modal::Component.new(id: 'my-modal', active: false) do |modal| %>
  <% modal.with_header(title: "Dialog") %>
  <% modal.with_body do %>
    <p>Content here</p>
  <% end %>
<% end %>
```

### Modal without header (standalone close button)

```erb
<%= render Bali::Modal::Component.new(id: 'simple-modal') do |modal| %>
  <% modal.with_body do %>
    <p>Modal without header shows standalone close button.</p>
  <% end %>

  <% modal.with_actions do %>
    <%= render Bali::Button::Component.new(
      name: 'Close',
      data: { action: 'modal#close' }
    ) %>
  <% end %>
<% end %>
```

### Full-width modal

```erb
<%= render Bali::Modal::Component.new(id: 'wide-modal', size: :full) do |modal| %>
  <% modal.with_header(title: "Full Width Content") %>
  <% modal.with_body do %>
    <p>This modal spans the full width.</p>
  <% end %>
<% end %>
```

### Modal with custom wrapper classes

```erb
<%= render Bali::Modal::Component.new(
  id: 'custom-modal',
  wrapper_class: 'max-h-screen overflow-y-auto'
) do |modal| %>
  <% modal.with_header(title: "Scrollable Content") %>
  <% modal.with_body do %>
    <!-- Long content here -->
  <% end %>
<% end %>
```

## Common Mistakes

| Wrong | Right | Why |
|-------|-------|-----|
| `modal.with_header { "Title" }` | `modal.with_header(title: "Title")` | Keyword argument `title:` required |
| `modal.with_header("Title")` | `modal.with_header(title: "Title")` | Must use keyword argument |
| `modal.with_footer` | `modal.with_actions` | Slot is named `actions`, not `footer` |
| `active: 'true'` | `active: true` | Boolean, not string |
| Missing `id:` param | Provide explicit `id:` | Auto-generated IDs work but explicit is clearer |
| `size: 'lg'` | `size: :lg` | Use symbol, not string |

## Accessibility Notes

The component automatically handles:
- `aria-labelledby` pointing to header title ID
- `aria-describedby` pointing to body content ID (when body slot present)
- Close button label via I18n (`bali.modal.close`, defaults to "Close modal")
- Keyboard navigation (modal Stimulus controller should handle ESC key)

## CSS Classes Applied

The component applies:
- `modal-component` - Custom identifier class
- `modal` - DaisyUI modal class
- `modal-open` - When `active: true`
- `modal-box` - On inner wrapper
- Size class (`max-w-*`) based on `size:` parameter
- Custom `wrapper_class` on modal-box
