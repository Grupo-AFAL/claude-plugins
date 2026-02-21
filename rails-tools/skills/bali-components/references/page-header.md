# PageHeader

Page title and subtitle section with optional back button. Provides consistent page header styling across the application.

## Parameters

- `title:` (String, optional) - Main page title text
- `subtitle:` (String, optional) - Subtitle text below the title
- `align:` (Symbol, default: `:center`) - Vertical alignment (`:top`, `:center`, `:bottom`)
- `back:` (Hash, optional) - Back button configuration with `:href` key

## Slots

- `title` (renders_one) - Custom title content with configurable HTML tag
  - `text` (String, optional) - Title text
  - `tag:` (Symbol, default: `:h3`) - HTML heading tag (`:h1`, `:h2`, `:h3`, `:h4`, `:h5`, `:h6`)
  - Accepts additional HTML attributes

- `subtitle` (renders_one) - Custom subtitle content with configurable HTML tag
  - `text` (String, optional) - Subtitle text
  - `tag:` (Symbol, default: `:h5`) - HTML heading tag
  - Accepts additional HTML attributes

## Usage

### Basic page header with title and subtitle

```erb
<%= render Bali::PageHeader::Component.new(
  title: 'Projects',
  subtitle: 'Manage all your active projects'
) %>
```

### Page header with back button

```erb
<%= render Bali::PageHeader::Component.new(
  title: 'Project Details',
  subtitle: 'View and edit project information',
  back: { href: projects_path }
) %>
```

### Page header with custom title tag

```erb
<%= render Bali::PageHeader::Component.new do |header| %>
  <% header.with_title('Dashboard Overview', tag: :h1) %>
  <% header.with_subtitle('Your performance metrics', tag: :h4) %>
<% end %>
```

### Page header with custom HTML in slots

```erb
<%= render Bali::PageHeader::Component.new(align: :top) do |header| %>
  <% header.with_title(tag: :h2, class: 'text-primary') do %>
    Projects
    <%= render Bali::Badge::Component.new(color: :accent) { '12' } %>
  <% end %>

  <% header.with_subtitle do %>
    <span class="flex items-center gap-2">
      <%= render Bali::Icon::Component.new('check-circle', size: :small) %>
      All systems operational
    </span>
  <% end %>
<% end %>
```

### Align options

```erb
<!-- Top-aligned (title/subtitle at top of Level container) -->
<%= render Bali::PageHeader::Component.new(title: 'Title', align: :top) %>

<!-- Center-aligned (default) -->
<%= render Bali::PageHeader::Component.new(title: 'Title', align: :center) %>

<!-- Bottom-aligned (title/subtitle at bottom of Level container) -->
<%= render Bali::PageHeader::Component.new(title: 'Title', align: :bottom) %>
```

## Notes

- Uses `Bali::Level::Component` internally for layout
- Default title uses `text-2xl` and subtitle uses `text-lg`
- Title has bottom margin of `mb-1` for spacing from subtitle
- Subtitle has reduced opacity (`text-base-content/60`) for visual hierarchy
- Back button appears as ghost button with primary text color
- Alignment maps to Level component's vertical alignment (`:top` → `:start`, `:center` → `:center`, `:bottom` → `:end`)
