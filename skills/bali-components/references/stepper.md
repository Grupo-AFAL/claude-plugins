# Stepper

Step indicator component for multi-step processes. Shows progress through numbered steps with customizable orientation and color.

## Parameters

- `current:` (Integer, default: `0`) - Current active step index (0-based)
- `orientation:` (Symbol, default: `:horizontal`) - Layout direction (`:horizontal`, `:vertical`)
- `color:` (Symbol, default: `:primary`) - Color theme for active/completed steps

## Slots

- `steps` (renders_many) - Individual step items
  - `title:` (String, required) - Step title/label
  - Accepts additional options passed to `Step::Component`

## Usage

### Basic horizontal stepper

```erb
<%= render Bali::Stepper::Component.new(current: 1) do |stepper| %>
  <% stepper.with_steps(title: 'Account') %>
  <% stepper.with_steps(title: 'Profile') %>
  <% stepper.with_steps(title: 'Confirmation') %>
<% end %>
```

### Vertical stepper

```erb
<%= render Bali::Stepper::Component.new(current: 2, orientation: :vertical) do |stepper| %>
  <% stepper.with_steps(title: 'Create account') %>
  <% stepper.with_steps(title: 'Verify email') %>
  <% stepper.with_steps(title: 'Complete profile') %>
  <% stepper.with_steps(title: 'Start using') %>
<% end %>
```

### Stepper with custom color

```erb
<%= render Bali::Stepper::Component.new(current: 0, color: :success) do |stepper| %>
  <% stepper.with_steps(title: 'Upload files') %>
  <% stepper.with_steps(title: 'Process data') %>
  <% stepper.with_steps(title: 'Review results') %>
<% end %>
```

### Multi-step form example

```erb
<div class="max-w-2xl mx-auto">
  <%= render Bali::Stepper::Component.new(current: @current_step) do |stepper| %>
    <% stepper.with_steps(title: 'Basic Info') %>
    <% stepper.with_steps(title: 'Address') %>
    <% stepper.with_steps(title: 'Payment') %>
    <% stepper.with_steps(title: 'Review') %>
  <% end %>

  <div class="mt-8">
    <%= render_current_step_form %>
  </div>

  <div class="flex justify-between mt-6">
    <% if @current_step > 0 %>
      <%= render Bali::Button::Component.new(variant: :ghost) { 'Previous' } %>
    <% end %>

    <% if @current_step < 3 %>
      <%= render Bali::Button::Component.new(variant: :primary) { 'Next' } %>
    <% else %>
      <%= render Bali::Button::Component.new(variant: :primary) { 'Submit' } %>
    <% end %>
  </div>
</div>
```

## Step States

Steps automatically show different states based on their position relative to `current`:

- **Completed** - Steps before `current` (index < current)
- **Active** - The current step (index == current)
- **Upcoming** - Steps after `current` (index > current)

## Notes

- Steps are 0-indexed (first step is `0`, second is `1`, etc.)
- Uses DaisyUI's `steps` component classes
- Horizontal orientation is default and works well for 3-5 steps
- Vertical orientation is better for more steps or mobile layouts
- Color affects the active and completed step appearance
- Steps automatically increment their index internally
- Each step receives the `current`, `color`, and `index` from parent component
