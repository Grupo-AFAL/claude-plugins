# Bali::Reveal::Component

Toggle visibility component with trigger and collapsible content.

## Parameters

- `opened:` (Boolean) - Initial visibility state. Default: `false`
- Standard HTML attributes accepted via `**options`

## Slots

### `trigger` (renders_one)
The clickable element that toggles visibility. Uses `Bali::Reveal::Trigger::Component`.

## Usage

### Basic Reveal

```erb
<%= render Bali::Reveal::Component.new do |reveal| %>
  <% reveal.with_trigger do %>
    <button type="button" class="btn btn-link">Show More</button>
  <% end %>

  <div>
    <p>This content is hidden by default.</p>
    <p>Click the trigger to reveal it.</p>
  </div>
<% end %>
```

### Initially Opened

```erb
<%= render Bali::Reveal::Component.new(opened: true) do |reveal| %>
  <% reveal.with_trigger do %>
    <button type="button" class="btn btn-link">Hide Details</button>
  <% end %>

  <div>
    <p>This content is visible by default.</p>
  </div>
<% end %>
```

### Accordion-Style

```erb
<div class="space-y-4">
  <%= render Bali::Reveal::Component.new do |reveal| %>
    <% reveal.with_trigger do %>
      <div class="flex items-center justify-between p-4 bg-base-200 rounded cursor-pointer">
        <h3 class="font-bold">Section 1</h3>
        <span>▼</span>
      </div>
    <% end %>

    <div class="p-4">
      <p>Section 1 content goes here.</p>
    </div>
  <% end %>

  <%= render Bali::Reveal::Component.new do |reveal| %>
    <% reveal.with_trigger do %>
      <div class="flex items-center justify-between p-4 bg-base-200 rounded cursor-pointer">
        <h3 class="font-bold">Section 2</h3>
        <span>▼</span>
      </div>
    <% end %>

    <div class="p-4">
      <p>Section 2 content goes here.</p>
    </div>
  <% end %>
</div>
```

### FAQ List

```erb
<div class="space-y-4">
  <% @faqs.each do |faq| %>
    <%= render Bali::Reveal::Component.new do |reveal| %>
      <% reveal.with_trigger do %>
        <button type="button" class="w-full text-left font-semibold p-3 bg-base-100 hover:bg-base-200 rounded">
          <%= faq.question %>
        </button>
      <% end %>

      <div class="p-3 text-base-content/80">
        <%= faq.answer %>
      </div>
    <% end %>
  <% end %>
</div>
```

### With Custom Classes

```erb
<%= render Bali::Reveal::Component.new(class: "my-custom-reveal") do |reveal| %>
  <% reveal.with_trigger do %>
    <span class="link">Toggle</span>
  <% end %>

  <div>Hidden content</div>
<% end %>
```

## CSS Classes

- **Base container**: `reveal-component select-none group`
- **When opened**: `is-revealed` class is added
- **Content wrapper**: `reveal-content mb-8 hidden group-[.is-revealed]:block`

## Behavior

- Content is hidden by default unless `opened: true`
- Clicking the trigger toggles the `is-revealed` class
- Uses CSS group selector to show/hide content
- Requires Stimulus `reveal` controller

## Stimulus Controller

The component uses:
- `data-controller="reveal"`
- Group-based CSS toggling (`.group` and `.group-[.is-revealed]:block`)

## Notes

- Content has `mb-8` (margin-bottom) by default
- Trigger should be clickable (button, link, or element with cursor-pointer)
- Uses `select-none` to prevent text selection on trigger clicks
- The `group` class enables Tailwind's group-based variants
