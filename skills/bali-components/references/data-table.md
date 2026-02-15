# DataTable

Full-featured data table with filters, export, pagination, column selection, and grid mode. Integrates with Pagy for pagination and FilterForm/Ransack for filtering.

## Parameters

- `url:` (String, required) - Base URL for filtering/sorting links
- `filter_form:` (Bali::FilterForm, optional) - Filter form object for Ransack integration
- `pagy:` (Pagy, optional) - Pagy object for pagination
- `show_summary:` (Boolean, default: auto) - Show summary text (auto-enabled when pagy present)
- `summary_position:` (Symbol, default: `:bottom`) - Summary position (`:top` or `:bottom`)
- `item_name:` (String, optional) - Name for items in summary (uses I18n default if not provided)
- `table_class:` (String, optional) - CSS class for table wrapper
- `display_mode:` (Symbol, default: `:table`) - Display mode (`:table` or `:grid`)

## Slots

### Content Slots

- `table` (renders_one) - Table content (tbody with rows)
- `grid` (renders_one) - Grid content (card-based layout)
- `summary` (renders_one) - Custom summary text (overrides auto-generated summary)

### Toolbar Slots

- `actions_panel` (renders_one) - Actions panel with export and display mode toggle
  - `export_formats:` (Array, default: `[]`) - Export formats (e.g., `[:csv, :excel, :pdf]`)
  - `display_mode_param_name:` (Symbol, default: `:data_display_mode`) - URL param name for display mode
  - `grid_display_mode_enabled:` (Boolean, default: `false`) - Enable grid mode toggle

- `filters_panel` (renders_one) - Advanced filters with AND/OR groupings
  - `available_attributes:` (Array, optional) - Filterable attributes (auto-populated from filter_form)
  - `filter_groups:` (Array, optional) - Initial filter state (auto-populated from filter_form)
  - `search:` (Hash, optional) - Quick search config (auto-populated from filter_form)
    - `:fields` (Array) - Fields to search
    - `:value` (String) - Current search value
    - `:placeholder` (String) - Placeholder text
  - `apply_mode:` (Symbol, default: `:batch`) - `:batch` or `:live`
  - `popover:` (Boolean, default: `true`) - Show filters in popover

- `simple_filters` (renders_one) - Simple inline dropdown filters (alternative to filters_panel)
  - `filters:` (Array, optional) - Filter definitions (auto-populated from filter_form)

- `column_selector` (renders_one) - Column visibility toggle
  - `table_id:` (String, required) - CSS selector for target table
  - `button_label:` (String, optional) - Button label (uses I18n default)
  - `button_icon:` (String, optional) - Icon name
  - Yields block to define columns

- `export` (renders_one) - Export dropdown
  - `formats:` (Array, default: `[:csv, :excel, :pdf]`) - Export formats
  - `url:` (String, optional) - Base URL for export
  - `button_label:` (String, optional) - Button label
  - `button_icon:` (String, optional) - Icon name

- `toolbar_buttons` (renders_many) - Custom toolbar buttons (right-aligned)

### Pagination Slots

- `custom_pagy_nav` (renders_one) - Custom pagination component (overrides default Bali::Pagination)

## Usage

### Minimal data table with table slot

```erb
<%= render Bali::DataTable::Component.new(url: projects_path, pagy: @pagy) do |data_table| %>
  <% data_table.with_table do %>
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <% @projects.each do |project| %>
          <tr>
            <td><%= project.name %></td>
            <td><%= project.status %></td>
          </tr>
        <% end %>
      </tbody>
    </table>
  <% end %>
<% end %>
```

### Data table with filters panel (auto-configured)

```erb
<%= render Bali::DataTable::Component.new(
  url: projects_path,
  filter_form: @filter_form,
  pagy: @pagy
) do |data_table| %>
  <% data_table.with_filters_panel %>

  <% data_table.with_table do %>
    <%= render 'projects_table', projects: @projects %>
  <% end %>
<% end %>
```

### Data table with simple filters

```erb
<%= render Bali::DataTable::Component.new(
  url: projects_path,
  filter_form: @filter_form,
  pagy: @pagy
) do |data_table| %>
  <% data_table.with_simple_filters %>

  <% data_table.with_table do %>
    <%= render 'projects_table', projects: @projects %>
  <% end %>
<% end %>
```

### Data table with column selector

```erb
<%= render Bali::DataTable::Component.new(url: projects_path, pagy: @pagy) do |data_table| %>
  <% data_table.with_column_selector(table_id: 'projects-table') do |selector| %>
    <% selector.column(key: 'name', label: 'Project Name', visible: true) %>
    <% selector.column(key: 'status', label: 'Status', visible: true) %>
    <% selector.column(key: 'created_at', label: 'Created', visible: false) %>
  <% end %>

  <% data_table.with_table do %>
    <table id="projects-table" class="table">
      <!-- table content -->
    </table>
  <% end %>
<% end %>
```

### Data table with export and grid mode

```erb
<%= render Bali::DataTable::Component.new(
  url: projects_path,
  filter_form: @filter_form,
  pagy: @pagy,
  display_mode: params[:data_display_mode]&.to_sym || :table
) do |data_table| %>
  <% data_table.with_actions_panel(
    export_formats: [:csv, :excel],
    grid_display_mode_enabled: true
  ) %>

  <% data_table.with_table do %>
    <%= render 'projects_table', projects: @projects %>
  <% end %>

  <% data_table.with_grid do %>
    <%= render 'projects_grid', projects: @projects %>
  <% end %>
<% end %>
```

### Data table with custom toolbar buttons

```erb
<%= render Bali::DataTable::Component.new(url: projects_path, pagy: @pagy) do |data_table| %>
  <% data_table.with_toolbar_buttons do %>
    <%= render Bali::Button::Component.new(
      href: new_project_path,
      variant: :primary,
      size: :sm
    ) do %>
      <%= render Bali::Icon::Component.new('plus', size: :small) %>
      New Project
    <% end %>
  <% end %>

  <% data_table.with_table do %>
    <%= render 'projects_table', projects: @projects %>
  <% end %>
<% end %>
```

### Data table with custom summary

```erb
<%= render Bali::DataTable::Component.new(url: projects_path, pagy: @pagy) do |data_table| %>
  <% data_table.with_summary do %>
    <div class="text-sm text-base-content/70">
      Showing <%= @pagy.from %>-<%= @pagy.to %> of <%= @pagy.count %> projects
      (<%= @active_count %> active)
    </div>
  <% end %>

  <% data_table.with_table do %>
    <%= render 'projects_table', projects: @projects %>
  <% end %>
<% end %>
```

## Notes

- Auto-generates unique ID from filter_form or random hex if not provided
- Summary text uses I18n key `view_components.bali.data_table.summary`
- Default item name uses I18n key `view_components.bali.data_table.default_item_name`
- Toolbar only renders if it has content (filters, buttons, column selector, etc.)
- Summary can appear at top or bottom (controlled by `summary_position`)
- Footer renders if pagy, summary, or bottom summary is present
- Grid mode requires both `grid` slot and `grid_display_mode_enabled: true` in actions_panel
- `filters_panel` and `simple_filters` are mutually exclusive - use one or the other
- FilterForm auto-populates available_attributes, filter_groups, search config, and storage_id
