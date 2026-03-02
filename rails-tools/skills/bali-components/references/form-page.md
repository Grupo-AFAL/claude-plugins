# FormPage

New/edit form page wrapper with consistent header, optional card styling, and two-column layout support (form + sidebar).

## Parameters

- `title:` (String, required) - Page title (e.g., "New Movie", "Edit Order")
- `subtitle:` (String, optional) - Subtitle text
- `breadcrumbs:` (Array, default: []) - Array of hashes with keys: `name`, `href`, `icon_name`
- `back:` (Hash, optional) - Back button with `href` key (e.g., `{ href: movies_path }`)
- `max_width:` (Symbol, default: `:md`) - Container max-width: `:sm` (max-w-xl), `:md` (max-w-3xl), `:lg` (max-w-5xl), `:xl` (max-w-7xl), `:full` (max-w-full)
- `card:` (Boolean, default: true) - Wrap body in a bordered Card

## Slots

- `body` (renders_one) - Form content (required)
- `sidebar` (renders_one) - Optional right-column sidebar (tips, help, related info)

## Layout

- Breadcrumbs (if provided) -> PageHeader (title + subtitle + back button) -> Form body (+ optional sidebar)
- **With sidebar:** `grid-cols-1 lg:grid-cols-3` -- body takes 2 columns, sidebar takes 1
- **Without sidebar:** Single column centered layout
- Body wrapped in bordered Card when `card: true`

## Usage

### Simple form page

```erb
<%= render Bali::FormPage::Component.new(
  title: "New Movie",
  breadcrumbs: [
    { name: "Dashboard", href: root_path, icon_name: "home" },
    { name: "Movies", href: movies_path },
    { name: "New" }
  ],
  back: { href: movies_path },
  max_width: :md
) do |page| %>
  <% page.with_body do %>
    <%= form_with model: @movie, builder: Bali::FormBuilder do |f| %>
      <div class="card-body space-y-4">
        <%= f.text_field_group :title %>
        <%= f.text_area_group :description %>
        <%= f.slim_select_group :genre_id, collection: @genres %>
        <%= f.submit_actions cancel_href: movies_path %>
      </div>
    <% end %>
  <% end %>
<% end %>
```

### Form with sidebar

```erb
<%= render Bali::FormPage::Component.new(
  title: "Edit Movie",
  subtitle: "Update movie details",
  back: { href: movie_path(@movie) },
  max_width: :lg
) do |page| %>
  <% page.with_body do %>
    <%= form_with model: @movie, builder: Bali::FormBuilder do |f| %>
      <div class="card-body space-y-4">
        <%= f.text_field_group :title %>
        <%= f.text_area_group :description %>
        <%= f.submit_actions cancel_href: movie_path(@movie) %>
      </div>
    <% end %>
  <% end %>

  <% page.with_sidebar do %>
    <%= render Bali::Card::Component.new(title: "Tips", style: :bordered) do %>
      <div class="card-body">
        <ul class="text-sm text-base-content/70 space-y-2">
          <li>Use a descriptive title for search</li>
          <li>Select the primary genre</li>
        </ul>
      </div>
    <% end %>
  <% end %>
<% end %>
```

### Multi-section form (no card wrapper)

```erb
<%= render Bali::FormPage::Component.new(
  title: "Settings",
  max_width: :lg,
  card: false
) do |page| %>
  <% page.with_body do %>
    <%= form_with model: @settings, builder: Bali::FormBuilder do |f| %>
      <%= render Bali::Card::Component.new(title: "General", style: :bordered) do %>
        <div class="card-body space-y-4">
          <%= f.text_field_group :name %>
          <%= f.text_field_group :email %>
        </div>
      <% end %>

      <%= render Bali::Card::Component.new(title: "Notifications", style: :bordered, class: "mt-6") do %>
        <div class="card-body space-y-4">
          <%= f.checkbox_group :email_notifications %>
          <%= f.checkbox_group :sms_notifications %>
        </div>
      <% end %>

      <div class="flex justify-end gap-2 mt-6">
        <%= f.submit_actions %>
      </div>
    <% end %>
  <% end %>
<% end %>
```

## Notes

- Use `card: false` when the form has multiple sections, each wrapped in their own Card
- Use `card: true` (default) for simple single-section forms
- When `card: true`, put form content inside `<div class="card-body">` for proper padding
- The `back:` button renders as a ghost button with primary color
- Default `max_width: :md` is appropriate for most forms; use `:lg` when sidebar is present
- Forms should always use `builder: Bali::FormBuilder`
- Uses `PageHeader` internally for the title/subtitle/back area
