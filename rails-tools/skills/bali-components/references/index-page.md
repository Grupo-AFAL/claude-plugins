# IndexPage

Standard list/table page layout with breadcrumbs, header, action buttons, and body area for DataTable or other list content.

## Parameters

- `title:` (String, required) - Page title (e.g., "Movies", "Orders")
- `subtitle:` (String, optional) - Subtitle text (e.g., "24 movies total")
- `breadcrumbs:` (Array, default: []) - Array of hashes with keys: `name`, `href`, `icon_name`

## Slots

- `actions` (renders_many) - Action buttons in header (e.g., "New Movie" link)
- `body` (renders_one) - Main content area (typically DataTable or Card with table)

## Layout

- Breadcrumbs (if provided) -> PageHeader (title + subtitle + actions) -> Body (mt-6)
- Full-width layout (no max-width constraints)

## Usage

### Index page with DataTable

```erb
<%= render Bali::IndexPage::Component.new(
  title: "Movies",
  subtitle: "#{@movies.size} movies total",
  breadcrumbs: [
    { name: "Dashboard", href: root_path, icon_name: "home" },
    { name: "Movies" }
  ]
) do |page| %>
  <% page.with_action do %>
    <%= render Bali::Link::Component.new(
      name: "New Movie",
      href: new_movie_path,
      variant: :primary,
      icon_name: "plus"
    ) %>
  <% end %>

  <% page.with_body do %>
    <%= render Bali::DataTable::Component.new(items: @movies) do |table| %>
      <% table.with_column(name: "Title", sort: :title) { |movie| movie.title } %>
      <% table.with_column(name: "Genre") { |movie| movie.genre.name } %>
      <% table.with_column(name: "Year", sort: :year) { |movie| movie.year } %>
      <% table.with_actions_column do |movie| %>
        <%= render Bali::ActionsDropdown::Component.new do |actions| %>
          <% actions.with_item(name: "View", href: movie_path(movie), icon: "eye") %>
          <% actions.with_item(name: "Edit", href: edit_movie_path(movie), icon: "pencil") %>
          <% actions.with_delete_item(name: "Delete", href: movie_path(movie)) %>
        <% end %>
      <% end %>
    <% end %>
  <% end %>
<% end %>
```

### Simple list with cards

```erb
<%= render Bali::IndexPage::Component.new(
  title: "Studios",
  breadcrumbs: [
    { name: "Dashboard", href: root_path, icon_name: "home" },
    { name: "Studios" }
  ]
) do |page| %>
  <% page.with_action do %>
    <%= render Bali::Link::Component.new(name: "Add Studio", href: new_studio_path, variant: :primary, icon_name: "plus") %>
  <% end %>

  <% page.with_body do %>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <% @studios.each do |studio| %>
        <%= render Bali::Card::Component.new(title: studio.name, style: :bordered) do %>
          <p class="text-base-content/60"><%= studio.description %></p>
        <% end %>
      <% end %>
    </div>
  <% end %>
<% end %>
```

## Notes

- The simplest page component -- just header + body with no layout constraints
- Body typically contains a DataTable, but can hold any content (card grids, lists, etc.)
- No `max_width` parameter -- the body is full-width within its container
- Multiple actions are displayed in a flex row with `gap-2`
- Uses `PageHeader` internally for the title/subtitle/actions area
