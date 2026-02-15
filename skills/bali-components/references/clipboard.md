# Bali::Clipboard::Component

Copy-to-clipboard component with customizable trigger, source, and success feedback.

## Parameters

- Standard HTML attributes accepted via `**options`

## Slots

### `trigger` (renders_one)
The clickable element that initiates the copy action. Uses `Bali::Clipboard::Trigger::Component`.

### `source` (renders_one)
The element containing the text to be copied. Uses `Bali::Clipboard::Source::Component`.

### `success_content` (renders_one)
Optional feedback content shown briefly after successful copy. Uses `Bali::Clipboard::SucessContent::Component` (note: typo in class name).

## Usage

### Basic Clipboard

```erb
<%= render Bali::Clipboard::Component.new do |clipboard| %>
  <% clipboard.with_source do %>
    <code>npm install bali-components</code>
  <% end %>

  <% clipboard.with_trigger do %>
    <button type="button" class="btn btn-sm">Copy</button>
  <% end %>
<% end %>
```

### With Success Feedback

```erb
<%= render Bali::Clipboard::Component.new do |clipboard| %>
  <% clipboard.with_source do %>
    <pre><code>git clone https://github.com/example/repo.git</code></pre>
  <% end %>

  <% clipboard.with_trigger do %>
    <button type="button" class="btn btn-ghost btn-sm">
      <i class="icon-copy"></i>
    </button>
  <% end %>

  <% clipboard.with_success_content do %>
    <span class="text-success">Copied!</span>
  <% end %>
<% end %>
```

### Inline Code Snippet

```erb
<%= render Bali::Clipboard::Component.new(class: "inline-flex") do |clipboard| %>
  <% clipboard.with_source do %>
    <code class="bg-base-200 px-2 py-1 rounded">API_KEY=your_key_here</code>
  <% end %>

  <% clipboard.with_trigger do %>
    <button type="button" class="btn btn-xs ml-2">Copy</button>
  <% end %>
<% end %>
```

### API Token Display

```erb
<div class="form-control">
  <label class="label">
    <span class="label-text">API Token</span>
  </label>

  <%= render Bali::Clipboard::Component.new do |clipboard| %>
    <% clipboard.with_source do %>
      <input
        type="text"
        value="<%= current_user.api_token %>"
        readonly
        class="input input-bordered flex-1"
      />
    <% end %>

    <% clipboard.with_trigger do %>
      <button type="button" class="btn btn-primary">Copy Token</button>
    <% end %>

    <% clipboard.with_success_content do %>
      <span class="badge badge-success">Copied to clipboard!</span>
    <% end %>
  <% end %>
</div>
```

### Share URL

```erb
<%= render Bali::Clipboard::Component.new do |clipboard| %>
  <% clipboard.with_source do %>
    <div class="bg-base-200 p-3 rounded">
      <%= request.original_url %>
    </div>
  <% end %>

  <% clipboard.with_trigger do %>
    <button type="button" class="btn btn-outline mt-2">
      Share Link
    </button>
  <% end %>

  <% clipboard.with_success_content do %>
    <div class="alert alert-success mt-2">
      Link copied to clipboard!
    </div>
  <% end %>
<% end %>
```

### Hidden Source

```erb
<%= render Bali::Clipboard::Component.new do |clipboard| %>
  <% clipboard.with_source do %>
    <span class="sr-only"><%= @secret_value %></span>
  <% end %>

  <% clipboard.with_trigger do %>
    <button type="button" class="btn">Copy Secret</button>
  <% end %>
<% end %>
```

## CSS Classes

- **Base container**: `clipboard-component inline-flex items-stretch max-w-full`

## Stimulus Controller

The component uses:
- `data-controller="clipboard"`
- Trigger and source are connected via Stimulus targets
- Success content is shown temporarily after successful copy

## Notes

- Base classes: `clipboard-component inline-flex items-stretch max-w-full`
- Uses browser Clipboard API for copying
- Source content can be visible or hidden (with `sr-only`)
- Success feedback typically disappears after a brief delay
- Works with text content, input values, or any text-containing element
- The component uses `inline-flex` for inline positioning
