# AppLayout

Full admin layout wrapper combining SideMenu + optional topbar + main content area. This is the outermost container for sidebar-based admin interfaces.

## Parameters

- `fixed_sidebar:` (Boolean, default: false) - Use fixed positioning for sidebar
- `**options` - Additional HTML options (e.g., `class`, `data-*`)

## Slots

- `banner` (renders_one) - Full-width banner above everything (announcements, alerts)
- `navbar` (renders_one) - Full-width navbar below banner, above sidebar+body (adds `.app-layout--has-navbar` class)
- `sidebar` (renders_one) - Sidebar content (typically SideMenu component)
- `topbar` (renders_one) - Optional topbar above body within the main content area (not full-width)
- `body` (renders_one) - Main content area (flex-1, p-6)

## Layout

- Banner (full-width, if present) -> Navbar (full-width, if present) -> Sidebar + Main content
- Sidebar on left (fixed width) + Main content (flex-1, bg-base-200)
- Topbar rendered above body within main content area (unlike navbar which is full-width)
- Body is a `<main>` element with `flex-1` and `p-6` padding

## Usage

### Admin layout with sidebar and page components

```erb
<%# app/views/layouts/admin.html.erb %>
<%= render Bali::AppLayout::Component.new(fixed_sidebar: true) do |layout| %>
  <% layout.with_sidebar do %>
    <%= render Bali::SideMenu::Component.new(
      current_path: request.path,
      collapsible: true,
      brand: "Admin"
    ) do |menu| %>
      <% menu.with_list(title: "Main") do |list| %>
        <% list.with_item(name: "Dashboard", href: root_path, icon: "layout-dashboard", match: :exact) %>
        <% list.with_item(name: "Movies", href: movies_path, icon: "film", match: :crud) %>
        <% list.with_item(name: "Studios", href: studios_path, icon: "building-2", match: :crud) %>
      <% end %>

      <% menu.with_bottom_item(name: "Profile", href: profile_path, icon: "circle-user") %>
    <% end %>
  <% end %>

  <% layout.with_body do %>
    <%= yield %>
  <% end %>
<% end %>
```

Then in individual views, use page components inside the layout's body:

```erb
<%# app/views/movies/index.html.erb %>
<%= render Bali::IndexPage::Component.new(title: "Movies") do |page| %>
  ...
<% end %>
```

### Layout with topbar

```erb
<%= render Bali::AppLayout::Component.new do |layout| %>
  <% layout.with_sidebar do %>
    <%= render Bali::SideMenu::Component.new(current_path: request.path) do |menu| %>
      <!-- menu items -->
    <% end %>
  <% end %>

  <% layout.with_topbar do %>
    <div class="flex items-center justify-between px-6 py-3 bg-base-100 border-b">
      <h2 class="font-bold"><%= content_for(:page_title) || "Admin" %></h2>
      <div class="flex items-center gap-2">
        <%= render Bali::Avatar::Component.new(size: :sm) do |avatar| %>
          <% avatar.with_picture(src: current_user.avatar_url, alt: current_user.name) %>
        <% end %>
      </div>
    </div>
  <% end %>

  <% layout.with_body do %>
    <%= yield %>
  <% end %>
<% end %>
```

## Notes

- AppLayout is the **outermost wrapper** -- use it in layout files, not in individual views
- Individual views use page components (IndexPage, ShowPage, etc.) inside the layout's body
- Content area has `min-w-0` to prevent flex overflow with wide tables
- When `fixed_sidebar: true`, sidebar stays fixed on scroll; content area scrolls independently
- The body has `p-6` padding by default -- page components add their own internal spacing
- CSS class `.app-layout--has-fixed-sidebar` is added when sidebar is fixed
