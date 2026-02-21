# Progress

Progress bar component with optional percentage display. Shows completion progress for tasks, uploads, or other processes.

## Parameters

- `value:` (Numeric, default: `0`) - Current progress value
- `max:` (Numeric, default: `100`) - Maximum value (represents 100% completion)
- `color:` (Symbol, optional) - Color theme (`:primary`, `:secondary`, `:accent`, `:neutral`, `:info`, `:success`, `:warning`, `:error`)
- `show_percentage:` (Boolean, default: `true`) - Display percentage text next to bar

## Usage

### Basic progress bar

```erb
<%= render Bali::Progress::Component.new(value: 45) %>
```

### Progress bar with custom max value

```erb
<!-- Shows 60% (30 out of 50) -->
<%= render Bali::Progress::Component.new(value: 30, max: 50) %>
```

### Progress bar with color

```erb
<%= render Bali::Progress::Component.new(value: 75, color: :success) %>
```

### Progress bar without percentage text

```erb
<%= render Bali::Progress::Component.new(value: 60, show_percentage: false) %>
```

### File upload progress example

```erb
<div class="space-y-2">
  <div class="flex justify-between text-sm">
    <span>Uploading document.pdf</span>
    <span class="text-base-content/60"><%= @uploaded_mb %> / <%= @total_mb %> MB</span>
  </div>
  <%= render Bali::Progress::Component.new(
    value: @uploaded_mb,
    max: @total_mb,
    color: :primary,
    show_percentage: true
  ) %>
</div>
```

### Multi-step process with progress

```erb
<div class="space-y-4">
  <h3 class="font-semibold">Processing your request...</h3>

  <div>
    <p class="text-sm mb-1">Step 1: Validating data</p>
    <%= render Bali::Progress::Component.new(value: 100, color: :success) %>
  </div>

  <div>
    <p class="text-sm mb-1">Step 2: Importing records</p>
    <%= render Bali::Progress::Component.new(value: 450, max: 1000, color: :primary) %>
  </div>

  <div>
    <p class="text-sm mb-1">Step 3: Generating report</p>
    <%= render Bali::Progress::Component.new(value: 0, color: :neutral) %>
  </div>
</div>
```

### Task completion dashboard

```erb
<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div>
    <p class="font-medium mb-2">Project Alpha</p>
    <%= render Bali::Progress::Component.new(value: 100, color: :success) %>
    <p class="text-xs text-success mt-1">Completed</p>
  </div>

  <div>
    <p class="font-medium mb-2">Project Beta</p>
    <%= render Bali::Progress::Component.new(value: 67, color: :primary) %>
    <p class="text-xs text-base-content/60 mt-1">In progress</p>
  </div>

  <div>
    <p class="font-medium mb-2">Project Gamma</p>
    <%= render Bali::Progress::Component.new(value: 15, color: :warning) %>
    <p class="text-xs text-warning mt-1">At risk</p>
  </div>
</div>
```

## Color Options

- `:primary` - Primary theme color
- `:secondary` - Secondary theme color
- `:accent` - Accent theme color
- `:neutral` - Neutral gray
- `:info` - Blue
- `:success` - Green (good for completed tasks)
- `:warning` - Yellow/orange (good for at-risk items)
- `:error` - Red (good for failed/blocked items)

## Notes

- Percentage is automatically calculated as `(value / max) * 100`
- Handles division by zero (returns 0% if max is 0)
- Percentage is rounded to nearest integer
- Progress bar uses full width (`w-full`)
- Component wrapper uses flexbox with gap for percentage alignment
- When `show_percentage` is false, only the bar is displayed
- Uses DaisyUI's `progress` component classes
