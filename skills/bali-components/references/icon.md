# Icon

Icon component with automatic resolution from multiple sources. Primary source is Lucide icons via lucide-rails gem, with fallbacks to kept icons, custom icons, and legacy icons.

## Parameters

- `name` (String/Symbol, required) - Icon name (Bali name or Lucide name)
- `tag_name:` (Symbol, default: `:span`) - HTML tag to wrap the icon (`:span`, `:div`, etc.)
- `size:` (Symbol, optional) - Icon size (`:small`, `:medium`, `:large`)

## Icon Resolution Order

1. **Lucide icons** (via lucide-rails gem) - Primary source for UI icons
2. **Kept icons** (brands, regional, custom) - Original Bali icon set
3. **Custom icons** (via `Bali.custom_icons`) - App-specific extensions
4. **Legacy icons** (DefaultIcons) - Fallback for backwards compatibility

## Size Mappings

- `:small` - 16px (4 in Tailwind units)
- `:medium` - 32px (8 in Tailwind units)
- `:large` - 48px (12 in Tailwind units)

## Usage

### Basic icon

```erb
<%= render Bali::Icon::Component.new('user') %>
```

### Icon with size

```erb
<%= render Bali::Icon::Component.new('check', size: :large) %>
```

### Icon with custom classes

```erb
<%= render Bali::Icon::Component.new('alert', size: :medium, class: 'text-error') %>
```

### Icon in a button

```erb
<%= render Bali::Button::Component.new do %>
  <%= render Bali::Icon::Component.new('settings', size: :small) %>
  Settings
<% end %>
```

### Icon with custom wrapper tag

```erb
<%= render Bali::Icon::Component.new('star', tag_name: :div, class: 'text-warning') %>
```

## Common Icon Names

All Lucide icons are available (see https://lucide.dev/icons). Common examples:

**Navigation & UI**
- `menu`, `x`, `chevron-down`, `chevron-up`, `chevron-left`, `chevron-right`
- `arrow-left`, `arrow-right`, `external-link`

**Actions**
- `plus`, `edit`, `trash`, `copy`, `download`, `upload`, `save`
- `check`, `x-circle`, `check-circle`

**Content**
- `file`, `folder`, `image`, `file-text`, `download`
- `search`, `filter`, `settings`

**Communication**
- `mail`, `message-circle`, `bell`, `send`

**Users & Account**
- `user`, `users`, `user-plus`, `log-in`, `log-out`

**Status & Alerts**
- `info`, `alert-circle`, `alert-triangle`, `help-circle`

**Data & Charts**
- `bar-chart`, `pie-chart`, `trending-up`, `calendar`

## Notes

- Icons are wrapped in inline-flex container with centering
- Default size (when not specified) is 16px (small)
- Child SVG elements are styled to be 4x4 (w-4 h-4) by default unless size overrides
- If icon is not found, raises `Options::IconNotAvailable` error with suggestions
- Lucide icons are rendered as SVG with class `lucide-icon`
- Component accepts additional HTML attributes via `**options`
