# Bali::Filters::Component

Advanced filter builder component with Ransack integration, group logic, quick search, and optional persistence.

## Parameters

- `url:` (String) **Required** - The URL to submit filters to
- `available_attributes:` (Array<Hash>) **Required** - Available filterable attributes. Each hash: `{ key:, label:, type:, options: }`. Types: `:text`, `:number`, `:date`, `:datetime`, `:select`, `:boolean`
- `filter_groups:` (Array<Hash>) - Initial filter state (from URL params). Default: `[]`
- `apply_mode:` (Symbol) - `:batch` (default) or `:live`. Batch requires explicit Apply, live submits on change
- `combinator:` (Symbol) - How groups are combined. Options: `:and` (default), `:or`
- `max_groups:` (Integer) - Maximum number of filter groups allowed. Default: `10`
- `popover:` (Boolean) - Whether to show filters in a popover. Default: `true`
- `button_text:` (String) - Text for the popover trigger button. Default: I18n translated
- `search:` (Hash) - Quick search configuration:
  - `:fields` (Array<Symbol>) - Fields to search (e.g., `[:name, :description]`)
  - `:value` (String) - Current search value from URL params
  - `:placeholder` (String) - Placeholder text for search input
- `storage_id:` (String) - Optional storage ID for filter persistence
- `persist_enabled:` (Boolean) - Whether user has opted into filter persistence. Default: `false`
- `turbo_stream:` (Boolean) - Whether to accept Turbo Stream responses. Default: `false`
- Standard HTML attributes accepted via `**options`

## Slots

### `applied_tags` (renders_one)
Renders the applied filter pills above the filter builder. Uses `Bali::Filters::AppliedTags::Component`.

## Attribute Types

- `:text` - String matching (contains, equals, starts with, ends with)
- `:number` - Numeric comparisons (equals, greater than, less than, etc.)
- `:date` - Date comparisons
- `:datetime` - DateTime comparisons
- `:select` - Dropdown selection (requires `options:` array)
- `:boolean` - True/false toggle

## Available Attributes Format

```ruby
[
  { key: :name, label: 'Name', type: :text },
  { key: :created_at, label: 'Created', type: :date },
  { key: :status, label: 'Status', type: :select, options: ['active', 'inactive'] },
  { key: :price, label: 'Price', type: :number },
  { key: :published, label: 'Published', type: :boolean }
]
```

## Usage

### Basic Filter

```erb
<%= render Bali::Filters::Component.new(
  url: users_path,
  available_attributes: [
    { key: :name, label: 'Name', type: :text },
    { key: :email, label: 'Email', type: :text },
    { key: :role, label: 'Role', type: :select, options: ['admin', 'user'] }
  ]
) %>
```

### With Quick Search

```erb
<%= render Bali::Filters::Component.new(
  url: products_path,
  available_attributes: [
    { key: :category, label: 'Category', type: :select, options: ['Electronics', 'Books'] },
    { key: :price, label: 'Price', type: :number }
  ],
  search: {
    fields: [:name, :description],
    value: params.dig(:q, :name_or_description_cont),
    placeholder: 'Search products...'
  }
) %>
```

### With Initial Filter Groups

```ruby
# Controller
@filter_groups = [
  {
    combinator: 'or',
    conditions: [
      { attribute: 'status', operator: 'eq', value: 'active' },
      { attribute: 'featured', operator: 'true', value: '' }
    ]
  }
]
```

```erb
<%= render Bali::Filters::Component.new(
  url: products_path,
  available_attributes: @attributes,
  filter_groups: @filter_groups
) %>
```

### Live Apply Mode

```erb
<%= render Bali::Filters::Component.new(
  url: users_path,
  available_attributes: @attributes,
  apply_mode: :live
) %>
```

### OR Combinator Between Groups

```erb
<%= render Bali::Filters::Component.new(
  url: users_path,
  available_attributes: @attributes,
  combinator: :or
) %>
```

### With Persistence

```erb
<%= render Bali::Filters::Component.new(
  url: users_path,
  available_attributes: @attributes,
  storage_id: 'users_index_filters',
  persist_enabled: current_user.persist_filters?
) %>
```

### Without Popover (Inline)

```erb
<%= render Bali::Filters::Component.new(
  url: users_path,
  available_attributes: @attributes,
  popover: false
) %>
```

### With Turbo Stream Support

```erb
<%= render Bali::Filters::Component.new(
  url: users_path,
  available_attributes: @attributes,
  turbo_stream: true
) %>
```

### With Applied Tags

```erb
<%= render Bali::Filters::Component.new(
  url: users_path,
  available_attributes: @attributes,
  filter_groups: @filter_groups
) do |filters| %>
  <% filters.with_applied_tags %>
<% end %>
```

## Controller Integration

```ruby
class UsersController < ApplicationController
  def index
    @q = User.ransack(params[:q])
    @users = @q.result(distinct: true)

    @available_attributes = [
      { key: :name, label: 'Name', type: :text },
      { key: :email, label: 'Email', type: :text },
      { key: :created_at, label: 'Created', type: :date },
      { key: :role, label: 'Role', type: :select,
        options: User.roles.keys.map { |r| [r.humanize, r] } }
    ]

    # Parse filter groups from params
    @filter_groups = params[:filter_groups] || []
  end
end
```

## I18n Keys

- `bali.filters.filters_button` - Popover trigger button text (default: "Filters")
- `bali.filters.search_placeholder` - Search input placeholder (default: "Search...")
- `bali.filters.combinators.and` - AND combinator label (default: "AND")
- `bali.filters.combinators.or` - OR combinator label (default: "OR")

## Notes

- Integrates with Ransack for query building
- Supports complex nested filter groups with AND/OR logic
- Persists query params when submitting filters
- Quick search generates Ransack multi-field search (e.g., `name_or_description_cont`)
- Excluded params: `q`, `clear_filters`, `clear_search`
- Filter groups default to one empty group if not provided
- Maximum groups enforced via `max_groups` parameter
