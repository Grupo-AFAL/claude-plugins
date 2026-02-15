# Pagination

Pagy-integrated pagination component with previous/next buttons and page numbers. Compatible with Pagy 43+.

## Parameters

- `pagy:` (Pagy, required) - Pagy pagination object
- `size:` (Symbol, default: `:md`) - Button size (`:xs`, `:sm`, `:md`, `:lg`)
- `variant:` (Symbol, default: `:default`) - Button style (`:default`, `:outline`, `:ghost`)
- `url:` (String, optional) - Base URL for pagination links (defaults to `request.path`)

## Usage

### Basic pagination

```erb
<%= render Bali::Pagination::Component.new(pagy: @pagy) %>
```

### Pagination with custom size

```erb
<%= render Bali::Pagination::Component.new(pagy: @pagy, size: :sm) %>
```

### Pagination with outline variant

```erb
<%= render Bali::Pagination::Component.new(pagy: @pagy, variant: :outline) %>
```

### Pagination with custom base URL

```erb
<%= render Bali::Pagination::Component.new(
  pagy: @pagy,
  url: filtered_projects_path
) %>
```

### Combining size and variant

```erb
<%= render Bali::Pagination::Component.new(
  pagy: @pagy,
  size: :lg,
  variant: :ghost
) %>
```

## Controller Setup

Ensure Pagy is configured in your controller:

```ruby
class ProjectsController < ApplicationController
  include Pagy::Backend

  def index
    @pagy, @projects = pagy(Project.all, limit: 25)
  end
end
```

## View Helper Setup

Include Pagy::Frontend in ApplicationHelper:

```ruby
module ApplicationHelper
  include Pagy::Frontend
end
```

## Notes

- Component only renders if `@pagy.pages > 1`
- Uses DaisyUI's join component for button group layout
- Active page button has `btn-active` class
- Disabled buttons (when at first/last page) have `btn-disabled` class
- Previous/next buttons show arrows (`‹` and `›`)
- Accessibility: includes `aria-label` for navigation and page buttons
- URL generation:
  - Uses `@pagy.page_url(page)` if available (Pagy 43+ with request object)
  - Falls back to manual URL building with query params
  - Respects custom `page_key` option from Pagy config
- Series rendering uses Pagy's internal series method (supports gaps shown as `...`)
