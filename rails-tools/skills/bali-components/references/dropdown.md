# Dropdown

Menu dropdown component (different from ActionsDropdown). Provides a trigger element and dropdown menu with customizable items.

## Parameters

- `hoverable:` (Boolean, default: `false`) - Open dropdown on hover instead of click
- `close_on_click:` (Boolean, default: `true`) - Whether dropdown closes when an item is clicked
- `align:` (Symbol, default: `:right`) - Dropdown menu alignment (`:left`, `:right`, `:top`, `:bottom`, `:top_end`, `:bottom_end`)
- `wide:` (Boolean, default: `false`) - Use wider dropdown menu (80 vs 52 default width)

## Slots

- `trigger` (renders_one) - Element that triggers the dropdown (uses `Trigger::Component`)
- `items` (renders_many) - Menu items in the dropdown
  - `method:` (Symbol, default: `:get`) - HTTP method for links
  - `href:` (String, optional) - URL for link items
  - `tag:` (Symbol, default: `:link`) - Use `:button` for button items, `:link` for link items
  - Accepts additional options passed to underlying component

## Usage

### Basic dropdown with link items

```erb
<%= render Bali::Dropdown::Component.new do |dropdown| %>
  <% dropdown.with_trigger do %>
    <%= render Bali::Button::Component.new(variant: :ghost) do %>
      Menu
      <%= render Bali::Icon::Component.new('chevron-down', size: :small) %>
    <% end %>
  <% end %>

  <% dropdown.with_items(href: profile_path) { 'Profile' } %>
  <% dropdown.with_items(href: settings_path) { 'Settings' } %>
  <% dropdown.with_items(href: logout_path, method: :delete) { 'Logout' } %>
<% end %>
```

### Dropdown with custom alignment and width

```erb
<%= render Bali::Dropdown::Component.new(align: :left, wide: true) do |dropdown| %>
  <% dropdown.with_trigger do %>
    <%= render Bali::Button::Component.new { 'Options' } %>
  <% end %>

  <% dropdown.with_items(href: edit_path) { 'Edit' } %>
  <% dropdown.with_items(href: duplicate_path, method: :post) { 'Duplicate' } %>
  <% dropdown.with_items(href: archive_path, method: :patch) { 'Archive' } %>
<% end %>
```

### Hoverable dropdown (opens on hover)

```erb
<%= render Bali::Dropdown::Component.new(hoverable: true, align: :bottom) do |dropdown| %>
  <% dropdown.with_trigger do %>
    <span class="cursor-pointer">Hover me</span>
  <% end %>

  <% dropdown.with_items(href: '#') { 'Quick Action 1' } %>
  <% dropdown.with_items(href: '#') { 'Quick Action 2' } %>
<% end %>
```

### Dropdown with button items

```erb
<%= render Bali::Dropdown::Component.new do |dropdown| %>
  <% dropdown.with_trigger do %>
    <%= render Bali::Button::Component.new { 'Actions' } %>
  <% end %>

  <% dropdown.with_items(tag: :button, onclick: 'handleAction1()') { 'Action 1' } %>
  <% dropdown.with_items(tag: :button, onclick: 'handleAction2()') { 'Action 2' } %>
<% end %>
```

### Dropdown that stays open on click

```erb
<%= render Bali::Dropdown::Component.new(close_on_click: false) do |dropdown| %>
  <% dropdown.with_trigger do %>
    <%= render Bali::Button::Component.new { 'Filters' } %>
  <% end %>

  <% dropdown.with_items(tag: :button) do %>
    <label class="flex items-center gap-2">
      <input type="checkbox" class="checkbox checkbox-sm" />
      Show archived
    </label>
  <% end %>
<% end %>
```

## Alignment Options

- `:left` - Menu aligns to left edge of trigger
- `:right` - Menu aligns to right edge of trigger (default)
- `:top` - Menu appears above trigger
- `:bottom` - Menu appears below trigger
- `:top_end` - Menu appears above and aligns to right
- `:bottom_end` - Menu appears below and aligns to right

## Notes

- Uses `dropdown` Stimulus controller when not hoverable
- Delete method links automatically use `DeleteLink::Component` for confirmation
- Menu items have `role="menuitem"` for accessibility
- Menu has shadow (`shadow-lg`) and rounded corners (`rounded-box`)
- Wide mode uses `w-80`, default uses `w-52`
- Component only renders if it has authorized items or content
- Text color is forced to `text-base-content` to ensure proper contrast
