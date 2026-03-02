# ShowPage

Detail/show page layout with title, tags, actions, breadcrumbs, and optional two-column layout (content + sidebar).

## Parameters

- `title:` (String, required) - Page title (e.g., record name)
- `subtitle:` (String, optional) - Subtitle text (e.g., "Added 2 days ago")
- `breadcrumbs:` (Array, default: []) - Array of hashes with keys: `name`, `href`, `icon_name`
- `back:` (Hash, optional) - Back button with `href` key

## Slots

- `title_tags` (renders_many) - Tags displayed next to the title (flex row, gap-3)
- `actions` (renders_many) - Action buttons (Edit, Delete, etc.)
- `body` (renders_one) - Main content area
- `sidebar` (renders_one) - Optional right-column sidebar

## Layout

- Breadcrumbs (if provided) -> PageHeader (title + tags + subtitle + back + actions) -> Body (+ optional sidebar)
- **With sidebar:** `grid-cols-1 lg:grid-cols-3` -- body takes 2 columns, sidebar takes 1
- **Without sidebar:** Full-width body
- Title row: `flex items-center gap-3` (title text + tags inline)

## Usage

### Show page with sidebar

```erb
<%= render Bali::ShowPage::Component.new(
  title: @movie.title,
  subtitle: "Added #{time_ago_in_words(@movie.created_at)} ago",
  breadcrumbs: [
    { name: "Dashboard", href: root_path, icon_name: "home" },
    { name: "Movies", href: movies_path },
    { name: @movie.title }
  ],
  back: { href: movies_path }
) do |page| %>
  <% page.with_title_tag do %>
    <%= render Bali::Tag::Component.new(text: @movie.genre.name, style: :outline, size: :sm) %>
  <% end %>
  <% page.with_title_tag do %>
    <%= render Bali::Tag::Component.new(text: "Released", color: :success, size: :sm) %>
  <% end %>

  <% page.with_action do %>
    <%= render Bali::Link::Component.new(name: "Edit", href: edit_movie_path(@movie), variant: :ghost, icon_name: "pencil") %>
  <% end %>
  <% page.with_action do %>
    <%= render Bali::DeleteLink::Component.new(name: "Delete", href: movie_path(@movie)) %>
  <% end %>

  <% page.with_body do %>
    <%= render Bali::Card::Component.new(title: "Details", style: :bordered) do %>
      <div class="card-body">
        <%= render Bali::PropertiesTable::Component.new do |pt| %>
          <% pt.with_property(label: "Director") { @movie.director } %>
          <% pt.with_property(label: "Year") { @movie.year } %>
          <% pt.with_property(label: "Rating") { @movie.rating } %>
        <% end %>
      </div>
    <% end %>
  <% end %>

  <% page.with_sidebar do %>
    <%= render Bali::Card::Component.new(title: "Studio", style: :bordered) do %>
      <div class="card-body">
        <p><%= @movie.studio.name %></p>
        <p class="text-sm text-base-content/60"><%= @movie.studio.location %></p>
      </div>
    <% end %>

    <%= render Bali::Card::Component.new(title: "Cast", style: :bordered) do %>
      <div class="card-body">
        <%= render Bali::List::Component.new(items: @movie.actors.map(&:name)) %>
      </div>
    <% end %>
  <% end %>
<% end %>
```

### Show page without sidebar (full-width)

```erb
<%= render Bali::ShowPage::Component.new(
  title: @order.reference,
  subtitle: "Created #{l(@order.created_at, format: :short)}",
  back: { href: orders_path }
) do |page| %>
  <% page.with_action do %>
    <%= render Bali::Link::Component.new(name: "Edit", href: edit_order_path(@order), variant: :ghost, icon_name: "pencil") %>
  <% end %>

  <% page.with_body do %>
    <!-- Full-width content (tabs, tables, etc.) -->
  <% end %>
<% end %>
```

## Notes

- Title tags appear inline next to the title -- use for status badges, category labels, etc.
- Sidebar `space-y-6` allows stacking multiple Cards with consistent spacing
- Without sidebar, body is full-width -- good for pages with wide tables or tabbed content
- Back button renders as a ghost button with primary color
- Uses `PageHeader` internally for the title/subtitle/actions area
