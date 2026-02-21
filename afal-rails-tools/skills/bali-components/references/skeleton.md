# Skeleton

Loading placeholder component with preset patterns for common layouts. Use during data loading to improve perceived performance.

## Parameters

- `variant:` (Symbol, default: `:text`) - Preset pattern (`:text`, `:paragraph`, `:card`, `:avatar`, `:button`, `:modal`, `:list`)
- `size:` (Symbol, default: `:sm`) - Element size (`:xs`, `:sm`, `:md`, `:lg`)
- `lines:` (Integer, default: `3`) - Number of lines for `:paragraph` and `:list` variants

## Variants

### `:text`
Single line of text (default)

### `:paragraph`
Multiple lines of text with last line shorter

### `:card`
Card layout with title and content lines

### `:avatar`
Circular avatar placeholder

### `:button`
Button-shaped placeholder

### `:modal`
Modal content with title, paragraph, and action buttons

### `:list`
List of items with avatar and text lines

## Size Guide

- `:xs` - Height 3 (12px)
- `:sm` - Height 4 (16px) - default
- `:md` - Height 6 (24px)
- `:lg` - Height 8 (32px)

## Usage

### Single text line

```erb
<%= render Bali::Skeleton::Component.new %>
```

### Paragraph with custom lines

```erb
<%= render Bali::Skeleton::Component.new(variant: :paragraph, lines: 5) %>
```

### Card placeholder

```erb
<%= render Bali::Skeleton::Component.new(variant: :card) %>
```

### Avatar placeholder

```erb
<%= render Bali::Skeleton::Component.new(variant: :avatar, size: :lg) %>
```

### Button placeholder

```erb
<%= render Bali::Skeleton::Component.new(variant: :button) %>
```

### Modal placeholder

```erb
<%= render Bali::Skeleton::Component.new(variant: :modal) %>
```

### List placeholder

```erb
<%= render Bali::Skeleton::Component.new(variant: :list, lines: 4) %>
```

### Loading state for user profile

```erb
<% if @user.present? %>
  <%= render_user_profile(@user) %>
<% else %>
  <div class="flex items-start gap-4">
    <%= render Bali::Skeleton::Component.new(variant: :avatar, size: :lg) %>
    <div class="flex-1">
      <%= render Bali::Skeleton::Component.new(variant: :paragraph, lines: 3) %>
    </div>
  </div>
<% end %>
```

### Loading state for card list

```erb
<% if @projects.any? %>
  <% @projects.each do |project| %>
    <%= render 'project_card', project: project %>
  <% end %>
<% else %>
  <div class="space-y-4">
    <% 3.times do %>
      <%= render Bali::Skeleton::Component.new(variant: :card) %>
    <% end %>
  </div>
<% end %>
```

### Loading state for data table

```erb
<% if @loading %>
  <div class="space-y-3">
    <% 8.times do %>
      <%= render Bali::Skeleton::Component.new(variant: :text, size: :md) %>
    <% end %>
  </div>
<% else %>
  <%= render 'data_table', records: @records %>
<% end %>
```

### Turbo Frame loading placeholder

```erb
<%= turbo_frame_tag 'user_details', src: user_path(@user) do %>
  <div class="p-4">
    <%= render Bali::Skeleton::Component.new(variant: :card) %>
  </div>
<% end %>
```

## Variant Details

### Text
- Single line with configurable width

### Paragraph
- Multiple lines with spacing
- Last line is 75% width for natural appearance
- Line count controlled by `lines` parameter

### Card
- Title skeleton (h-6, w-1/3)
- Three content lines (last one 66% width)

### Avatar
- Circular shape (rounded-full)
- Size-responsive (xs: 8x8, sm: 10x10, md: 12x12, lg: 16x16)

### Button
- Button-shaped (h-10, w-24)
- Rounded with `rounded-btn`

### Modal
- Title (h-7, w-1/2)
- Paragraph content (3 lines)
- Two action buttons at bottom

### List
- Each item has circular avatar (10x10) and two text lines
- Line count controlled by `lines` parameter
- Natural spacing with gap-3

## Notes

- Uses DaisyUI's `skeleton` class for animation
- All skeletons are full width by default unless variant specifies otherwise
- Paragraph and list variants use `space-y-2` and `space-y-3` respectively
- Avatar sizes are fixed per size option, ignoring height setting
- Modal variant includes padding and proper spacing
- Combine with Turbo Frames for seamless loading states
