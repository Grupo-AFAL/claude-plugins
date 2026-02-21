# Bali::Hero::Component

Banner/hero section component with size presets, color themes, and content slots.

## Parameters

- `size:` (Symbol) - Hero height. Options: `:sm` (`min-h-48`), `:md` (`min-h-80`, default), `:lg` (`min-h-screen`)
- `color:` (Symbol) - Background color preset. Options: `:base` (default), `:primary`, `:secondary`, `:accent`, `:neutral`
- `centered:` (Boolean) - Center-align content. Default: `true`
- Standard HTML attributes accepted via `**options`

## Slots

### `title` (renders_one)
Main heading. Accepts text and options. Default classes: `text-5xl font-bold`.

```erb
<% hero.with_title("Welcome to My App", class: "custom-class") %>
```

### `subtitle` (renders_one)
Subtitle/description text. Accepts text and options. Default classes: `py-4`.

```erb
<% hero.with_subtitle("Your journey starts here", class: "text-lg") %>
```

### `actions` (renders_one)
Call-to-action buttons or links. Rendered as-is without default styling.

## Size Presets

| Size | CSS Class | Description |
|------|-----------|-------------|
| `:sm` | `min-h-48` | Small (12rem) |
| `:md` | `min-h-80` | Medium (20rem, default) |
| `:lg` | `min-h-screen` | Full viewport height |

## Color Presets

| Color | CSS Classes | Description |
|-------|-------------|-------------|
| `:base` | `bg-base-200` | Base background (default) |
| `:primary` | `bg-primary text-primary-content` | Primary theme color |
| `:secondary` | `bg-secondary text-secondary-content` | Secondary theme color |
| `:accent` | `bg-accent text-accent-content` | Accent theme color |
| `:neutral` | `bg-neutral text-neutral-content` | Neutral gray |

## Usage

### Basic Hero

```erb
<%= render Bali::Hero::Component.new do |hero| %>
  <% hero.with_title("Welcome") %>
  <% hero.with_subtitle("Get started with our amazing product") %>
  <% hero.with_actions do %>
    <%= link_to "Get Started", signup_path, class: "btn btn-primary" %>
  <% end %>
<% end %>
```

### Large Primary Hero

```erb
<%= render Bali::Hero::Component.new(size: :lg, color: :primary) do |hero| %>
  <% hero.with_title("Launch Your Project") %>
  <% hero.with_subtitle("The fastest way to build and ship") %>
  <% hero.with_actions do %>
    <%= link_to "Start Free Trial", trial_path, class: "btn btn-secondary btn-lg" %>
  <% end %>
<% end %>
```

### Small Hero

```erb
<%= render Bali::Hero::Component.new(size: :sm) do |hero| %>
  <% hero.with_title("Quick Banner") %>
<% end %>
```

### Left-Aligned Hero

```erb
<%= render Bali::Hero::Component.new(centered: false) do |hero| %>
  <% hero.with_title("Not Centered") %>
  <% hero.with_subtitle("Content aligned to the left") %>
<% end %>
```

### With Custom Title Styling

```erb
<%= render Bali::Hero::Component.new do |hero| %>
  <% hero.with_title("Custom Styled Title", class: "text-6xl text-gradient") %>
  <% hero.with_subtitle("Styled subtitle", class: "text-xl opacity-80") %>
<% end %>
```

### Multiple Action Buttons

```erb
<%= render Bali::Hero::Component.new(size: :lg, color: :accent) do |hero| %>
  <% hero.with_title("Choose Your Path") %>
  <% hero.with_subtitle("Sign up or log in to continue") %>
  <% hero.with_actions do %>
    <div class="flex gap-4">
      <%= link_to "Sign Up", signup_path, class: "btn btn-primary" %>
      <%= link_to "Log In", login_path, class: "btn btn-ghost" %>
    </div>
  <% end %>
<% end %>
```

## Notes

- Content wrapper always has class: `hero-content`
- When `centered: true`, content wrapper also has: `text-center`
- Title and subtitle slots accept custom classes via options parameter
- Actions slot has no default styling - full control over layout
