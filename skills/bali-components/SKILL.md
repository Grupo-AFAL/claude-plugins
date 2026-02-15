---
name: bali-components
description: Use when building Rails views with Bali ViewComponent library - forms, card layouts, modals, tables, avatars, buttons, links, tags, dropdowns
---

# Bali ViewComponents Quick Reference

Bali is a Rails ViewComponent library using DaisyUI/Tailwind. This reference prevents common API mistakes.

## Critical: Slot APIs

### Card - Title takes TEXT, not block

```erb
<%# Simple title - use with_title with text argument %>
<%= render Bali::Card::Component.new do |card| %>
  <% card.with_title("Simple Title") %>
  <% card.with_image(src: url) %>
  Your content here (auto-wrapped in card-body)

  <%# Actions use with_action (singular) - each becomes a btn %>
  <% card.with_action(href: edit_path) { "Edit" } %>
<% end %>

<%# Complex title with nested components - use raw HTML in body %>
<%= render Bali::Card::Component.new do %>
  <h2 class="card-title text-lg">
    My Title
    <%= render Bali::Tag::Component.new(text: "Badge", color: :primary, size: :sm) %>
  </h2>
  Content here...
<% end %>
```

**CRITICAL:** `with_title(text)` takes a STRING argument, NOT a block. For complex titles with badges/icons, use `<h2 class="card-title">` directly in the card body.

**Slots:** `header`, `title(text)`, `image`, `actions` (use `with_action` singular to add each)
**NO slots:** `with_body`, `with_footer` - content goes directly in block

### Tooltip - REQUIRES `with_trigger` slot

```erb
<%# CORRECT: Use with_trigger slot for the hoverable element %>
<%= render Bali::Tooltip::Component.new(placement: :top) do |tooltip| %>
  <% tooltip.with_trigger do %>
    <%= render Bali::Button::Component.new(name: "Hover me", variant: :outline) %>
  <% end %>
  This is the tooltip text that appears on hover
<% end %>
```

**CRITICAL:** There is NO `content:` parameter! The tooltip text goes in the block, and you MUST use `with_trigger` for the hoverable element.

**Parameters:** `placement:` (`:top`, `:bottom`, `:left`, `:right`), `trigger_event:` (`'mouseenter focus'` default)
**Slots:** `trigger` (REQUIRED - the element user hovers over)
**Block content:** The tooltip message text

### Modal - Header takes `title:` keyword

```erb
<%= render Bali::Modal::Component.new(id: 'my-modal') do |modal| %>
  <% modal.with_header(title: "Modal Title", close_button: true) %>
  <% modal.with_body do %>
    Content here
  <% end %>
  <% modal.with_actions do %>
    <%= render Bali::Button::Component.new(name: 'Cancel', variant: :ghost, data: { action: 'modal#close' }) %>
    <%= render Bali::Button::Component.new(name: 'Save', variant: :primary) %>
  <% end %>
<% end %>
```

**Slots:** `header(title:)`, `body`, `actions` (NOT footer)
**Stimulus:** `modal#close`, `modal#open`

### Table - NO pagination slot

```erb
<%= render Bali::Table::Component.new(form: @filter_form) do |table| %>
  <%= table.with_header(name: 'Name', sort: :name) %>
  <%= table.with_header(name: 'Actions') %>
  <% @records.each do |record| %>
    <%= table.with_row do %>
      <td><%= record.name %></td>
      <td>...</td>
    <% end %>
  <% end %>
<% end %>

<%# Pagination is SEPARATE - use Pagy directly %>
<%== pagy_nav(@pagy) %>
```

**Slots:** `headers`, `rows`, `footers`, `new_record_link`, `no_records_notification`

## Component Parameters

### Avatar

```ruby
Bali::Avatar::Component.new(
  src: url,           # Image URL
  size: :md,          # :xs, :sm, :md, :lg, :xl
  shape: :circle,     # :square, :rounded, :circle
  mask: nil,          # :heart, :squircle, :hexagon, :triangle, :diamond, :pentagon, :star
  status: nil,        # :online, :offline
  ring: nil           # :primary, :secondary, :accent, :success, :warning, :error, :info
)
```

**NO `alt` parameter** - use `picture` slot for custom img attributes.

### Link

```ruby
Bali::Link::Component.new(
  href: path,
  name: 'Click me',
  variant: :primary,  # NOT `type:` (deprecated)
  size: :md,
  icon_name: 'edit',
  modal: true,        # Opens modal on click
  drawer: true        # Opens drawer on click
)
```

**Variants:** `:primary`, `:secondary`, `:accent`, `:info`, `:success`, `:warning`, `:error`, `:ghost`, `:link`, `:neutral`

### DeleteLink

```ruby
Bali::DeleteLink::Component.new(
  model: @user,       # OR href: path
  name: 'Delete',
  confirm: 'Custom message?',
  size: :md,
  icon: true,         # Icon-only mode
  skip_confirm: false
)
```

**NO `variant` parameter** - always styled as error/danger.

### Tag (Badge)

```ruby
Bali::Tag::Component.new(
  text: 'Label',
  color: :primary,    # :neutral, :primary, :secondary, :accent, :ghost, :info, :success, :warning, :error
  size: :md,          # :xs, :sm, :md, :lg, :xl
  style: :outline,    # :outline, :soft, :dash
  href: nil           # Makes it clickable
)
```

### ActionsDropdown

```erb
<%= render Bali::ActionsDropdown::Component.new(align: :end) do |dropdown| %>
  <%= dropdown.with_item(href: edit_path(record)) { "Edit" } %>
  <%= dropdown.with_item(href: record_path(record), method: :delete) { "Delete" } %>
<% end %>
```

**Item with `method: :delete`** auto-uses DeleteLink with confirmation.

## Forms - Use FormBuilder, NOT ViewComponents

**CRITICAL:** Bali forms use a custom FormBuilder, not ViewComponents. NEVER use raw HTML with Stimulus data attributes for form fields - the FormBuilder handles all the wiring automatically.

```erb
<%# ALWAYS use builder: Bali::FormBuilder %>
<%= form_with model: @user, url: users_path, builder: Bali::FormBuilder do |f| %>
  <%= f.text_field_group :name %>
  <%= f.email_field_group :email %>
  <%= f.password_field_group :password %>
  <%= f.boolean_field_group :accept_terms, label: "Accept terms" %>
  <%= f.submit_actions "Register", cancel_path: root_path %>
<% end %>

<%# For forms without a model, use url: %>
<%= form_with url: "#", method: :get, builder: Bali::FormBuilder, data: { turbo: false } do |f| %>
  <%= f.date_field_group :start_date, label: "Start Date" %>
  <%= f.slim_select_group :category, @options, { label: "Category" }, { placeholder: "Choose..." } %>
<% end %>
```

### Field Methods

| Method | Usage |
|--------|-------|
| `text_field_group :attr` | Text input with label |
| `email_field_group :attr` | Email input |
| `password_field_group :attr` | Password input |
| `number_field_group :attr` | Number input |
| `text_area_group :attr` | Textarea |
| `select_group :attr, options` | Native select |
| `slim_select_group :attr, options, form_opts, html_opts` | Enhanced searchable select |
| `boolean_field_group :attr` | Checkbox |
| `switch_field_group :attr` | Toggle switch |
| `date_field_group :attr` | Date picker (Flatpickr) |
| `datetime_field_group :attr` | DateTime picker |
| `file_field_group :attr` | File upload |

### SlimSelect (Enhanced Select)

```erb
<%# Single select %>
<%= f.slim_select_group :status, @options, { label: "Status" }, { placeholder: "Choose..." } %>

<%# Multiple select %>
<%= f.slim_select_group :tags, @options, { label: "Tags" }, { multiple: true, placeholder: "Select..." } %>

<%# With search enabled %>
<%= f.slim_select_group :user_id, @users, { label: "User", show_search: true }, { placeholder: "Search users..." } %>
```

**Arguments:** `method`, `options_array`, `form_options_hash`, `html_options_hash`
**Form options:** `label:`, `show_search:`, `add_items:`, `allow_deselect_option:`
**HTML options:** `placeholder:`, `multiple:`, `disabled:`

### Submit Buttons

```ruby
# Simple submit
f.submit "Save", variant: :primary

# Submit with cancel (recommended)
f.submit_actions "Save", cancel_path: back_path

# In modal forms
f.submit_actions "Save", modal: true  # Auto-adds modal#close to cancel
```

### Field Options

```ruby
f.text_field_group :name,
  addon_left: tag.span("@"),        # Left addon
  addon_right: tag.button("Clear"), # Right addon
  help: "Enter your full name"      # Help text below field
```

## Notifications & Feedback

### Notification vs Message

| Component | Purpose | Position | Auto-dismiss |
|-----------|---------|----------|--------------|
| `Notification` | Toast alerts | Fixed top-right | Yes (3s default) |
| `Message` | Inline alerts | Inline | No |

### Notification (Toast)

```ruby
Bali::Notification::Component.new(
  type: :success,    # :success, :info, :warning, :error, :danger
  delay: 3000,       # ms before auto-dismiss
  fixed: true,       # fixed position (set false for inline)
  dismiss: true      # whether it auto-dismisses
)
```

### Message (Inline Alert)

```ruby
Bali::Message::Component.new(
  title: "Warning",  # Bold header text
  color: :warning,   # :primary, :secondary, :success, :danger, :warning, :info
  size: :regular     # :small, :regular, :medium, :large
)
```

**Note:** Notification uses `type:`, Message uses `color:` - different param names.

### Loader

```ruby
Bali::Loader::Component.new(
  text: "Loading...",  # Text below spinner
  type: :spinner,      # :spinner, :dots, :ring, :ball, :bars, :infinity
  size: :lg,           # :xs, :sm, :md, :lg, :xl
  color: :primary      # semantic colors
)
```

### FlashNotifications

```erb
<%# In layout - renders Rails flash messages as toasts %>
<%= render Bali::FlashNotifications::Component.new(
  notice: flash[:notice],
  alert: flash[:alert]
) %>
```

## Navigation

### Breadcrumb

```erb
<%= render Bali::Breadcrumb::Component.new do |bc| %>
  <%= bc.with_item(name: 'Home', href: root_path, icon_name: 'home') %>
  <%= bc.with_item(name: 'Products', href: products_path) %>
  <%= bc.with_item(name: 'Laptops') %>  <%# No href = active/current %>
<% end %>
```

**Item params:** `name:`, `href:` (omit for current page), `icon_name:`, `active:`

### Tabs

```erb
<%= render Bali::Tabs::Component.new(style: :border) do |tabs| %>
  <%# Inline content tabs %>
  <%= tabs.with_tab(title: 'Details', active: true) do %>
    <p>Details content here</p>
  <% end %>
  <%= tabs.with_tab(title: 'Reviews') do %>
    <p>Reviews content here</p>
  <% end %>

  <%# OR: Full page navigation tabs %>
  <%= tabs.with_tab(title: 'Settings', href: settings_path) %>
<% end %>
```

**Tab params:** `title:` (NOT name), `active:`, `icon:`, `src:` (Turbo Frame URL), `href:` (full page nav)
**Styles:** `:default`, `:border`, `:box`, `:lift`
**Sizes:** `:xs`, `:sm`, `:md`, `:lg`, `:xl`

## Common Mistakes

| Wrong | Right | Why |
|-------|-------|-----|
| `card.with_title { "Title" }` | `card.with_title("Title")` | Takes text arg, not block |
| `card.with_title { tag + text }` | `<h2 class="card-title">` in body | For complex titles, use raw HTML |
| `card.with_body` | Block content | Card has no body slot |
| `card.with_footer` | `card.with_action` | Use singular, add each action separately |
| `Tooltip.new(content: "text")` | Block content + `with_trigger` | NO content param - see Tooltip section |
| `Tooltip.new { button }` | `tooltip.with_trigger { button }` | MUST use trigger slot |
| `modal.with_header { "Title" }` | `modal.with_header(title: "Title")` | Keyword arg required |
| `modal.with_footer` | `modal.with_actions` | Different name |
| `table.with_pagination` | `pagy_nav(@pagy)` | Pagination is separate |
| `Avatar.new(alt:)` | Use `picture` slot | No alt parameter |
| `Link.new(type:)` | `Link.new(variant:)` | type is deprecated |
| `DeleteLink.new(variant:)` | None needed | Always error-styled |
| Raw HTML `data-controller="slim-select"` | `f.slim_select_group` | FormBuilder handles Stimulus wiring |
| `Bali::Form::TextField::Component` | `f.text_field_group` | Forms use FormBuilder, not ViewComponents |
| `form_with model:` (no builder) | `form_with builder: Bali::FormBuilder` | Always specify FormBuilder |
| `Message.new(type:)` | `Message.new(color:)` | Message uses `color:`, not `type:` |
| `Notification` for inline | `Message` for inline | Notification is toast, Message is inline |
| `breadcrumb.with_item(current:)` | `with_item(active:)` or omit `href:` | Use `active:` not `current:` |
| `tabs.with_tab(name:)` | `tabs.with_tab(title:)` | Use `title:` not `name:` |

## Button vs Link

| Use Case | Component |
|----------|-----------|
| Navigation (goes to URL) | `Bali::Link::Component` |
| Action (triggers behavior) | `Bali::Button::Component` |
| Link styled as button | `Bali::Link::Component` with `variant:` |

## JavaScript Dependencies

When using components that require external JS libraries, ensure they're installed:

```bash
# Required for SlimSelect
yarn add slim-select

# Required for Datepicker
yarn add flatpickr

# Required for Tooltips
yarn add tippy.js
```

The Bali Stimulus controllers dynamically import these libraries, but they must be in `node_modules`.
