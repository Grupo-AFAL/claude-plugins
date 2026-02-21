# Bali::Footer::Component

Page footer component with brand section, navigation columns, and bottom content area.

## Parameters

- `color:` (Symbol) - Background color preset. Options: `:neutral` (default), `:base`, `:primary`, `:secondary`
- `center:` (Boolean) - Center-align footer content. Default: `false`
- Standard HTML attributes accepted via `**html_options`

## Slots

### `brand` (renders_one)
Brand/company information section. Accepts:
- `name:` (String) - Brand name
- `description:` (String) - Brand description
- Block content for custom HTML

### `sections` (renders_many)
Navigation columns/sections. Each section can have:
- `title:` (String) - Section title
- `links` slot (renders_many) - Navigation links with `name:` and `href:` parameters

### `bottom` (renders_one)
Bottom content area (typically for copyright, legal links). Rendered with border-top separator and centered styling.

## Color Presets

| Color | CSS Classes | Description |
|-------|-------------|-------------|
| `:neutral` | `bg-neutral text-neutral-content` | Neutral gray (default) |
| `:base` | `bg-base-200 text-base-content` | Base background |
| `:primary` | `bg-primary text-primary-content` | Primary theme color |
| `:secondary` | `bg-secondary text-secondary-content` | Secondary theme color |

## Usage

### Basic Footer

```erb
<%= render Bali::Footer::Component.new do |footer| %>
  <% footer.with_brand(name: "My Company", description: "Building amazing products since 2024") %>

  <% footer.with_section(title: "Company") do |section| %>
    <% section.with_link(name: "About", href: about_path) %>
    <% section.with_link(name: "Contact", href: contact_path) %>
  <% end %>

  <% footer.with_section(title: "Legal") do |section| %>
    <% section.with_link(name: "Privacy", href: privacy_path) %>
    <% section.with_link(name: "Terms", href: terms_path) %>
  <% end %>

  <% footer.with_bottom do %>
    <p>© 2024 My Company. All rights reserved.</p>
  <% end %>
<% end %>
```

### Custom Brand Content

```erb
<%= render Bali::Footer::Component.new do |footer| %>
  <% footer.with_brand do %>
    <%= image_tag "logo.svg", class: "h-12" %>
    <p class="mt-2">Custom brand HTML</p>
  <% end %>

  <% footer.with_bottom do %>
    <p>© 2024 Company Name</p>
  <% end %>
<% end %>
```

### Primary Color Footer

```erb
<%= render Bali::Footer::Component.new(color: :primary) do |footer| %>
  <% footer.with_brand(name: "My App") %>

  <% footer.with_section(title: "Resources") do |section| %>
    <% section.with_link(name: "Docs", href: docs_path) %>
    <% section.with_link(name: "Blog", href: blog_path) %>
  <% end %>
<% end %>
```

### Centered Footer

```erb
<%= render Bali::Footer::Component.new(center: true) do |footer| %>
  <% footer.with_brand(name: "Centered Brand") %>

  <% footer.with_bottom do %>
    <p>Centered content</p>
  <% end %>
<% end %>
```

### Multiple Navigation Sections

```erb
<%= render Bali::Footer::Component.new do |footer| %>
  <% footer.with_brand(name: "ACME Corp", description: "Innovation at its finest") %>

  <% footer.with_section(title: "Products") do |section| %>
    <% section.with_link(name: "Product A", href: "#") %>
    <% section.with_link(name: "Product B", href: "#") %>
    <% section.with_link(name: "Product C", href: "#") %>
  <% end %>

  <% footer.with_section(title: "Company") do |section| %>
    <% section.with_link(name: "About Us", href: about_path) %>
    <% section.with_link(name: "Careers", href: careers_path) %>
    <% section.with_link(name: "Press", href: press_path) %>
  <% end %>

  <% footer.with_section(title: "Support") do |section| %>
    <% section.with_link(name: "Help Center", href: help_path) %>
    <% section.with_link(name: "Contact", href: contact_path) %>
    <% section.with_link(name: "Status", href: status_path) %>
  <% end %>

  <% footer.with_bottom do %>
    <p>© <%= Date.current.year %> ACME Corp. All rights reserved.</p>
  <% end %>
<% end %>
```

### Base Color with Custom HTML Options

```erb
<%= render Bali::Footer::Component.new(color: :base, id: "main-footer", data: { controller: "footer" }) do |footer| %>
  <% footer.with_brand(name: "My App") %>
<% end %>
```

## Notes

- Base container classes: `footer-component p-10`
- Brand description has max-width constraint: `max-w-xs`
- Section links automatically get: `link link-hover` classes
- Bottom content has: `border-t border-current/20 mt-8 pt-8 text-sm opacity-60 text-center`
- Section title gets: `footer-title` class (DaisyUI styling)
