# Bali::SearchInput::Component

Search input field component with optional auto-submit and manual submit button.

## Parameters

- `form:` (FormBuilder) **Required** - Rails form builder object
- `field:` (Symbol) **Required** - Form field name
- `auto_submit:` (Boolean) - Auto-submit form on input change. Default: `false`
- `placeholder:` (String) - Placeholder text. Default: I18n translated
- Standard HTML attributes accepted via `**options`
- `submit:` (Hash) - Options for the submit button (only shown when `auto_submit: false`)
  - Pass button-specific options like `class:`, `disabled:`, etc.

## Usage

### Basic Search Input

```erb
<%= form_with url: search_path, method: :get do |f| %>
  <%= render Bali::SearchInput::Component.new(
    form: f,
    field: :query
  ) %>
<% end %>
```

### With Auto-Submit

```erb
<%= form_with url: search_path, method: :get, data: { controller: 'submit-on-change' } do |f| %>
  <%= render Bali::SearchInput::Component.new(
    form: f,
    field: :query,
    auto_submit: true
  ) %>
<% end %>
```

### With Custom Placeholder

```erb
<%= form_with url: products_path, method: :get do |f| %>
  <%= render Bali::SearchInput::Component.new(
    form: f,
    field: :search,
    placeholder: "Search products by name or SKU..."
  ) %>
<% end %>
```

### Custom Submit Button

```erb
<%= form_with url: search_path, method: :get do |f| %>
  <%= render Bali::SearchInput::Component.new(
    form: f,
    field: :query,
    submit: { class: 'btn-secondary', disabled: false }
  ) %>
<% end %>
```

### With Custom Input Classes

```erb
<%= form_with url: search_path, method: :get do |f| %>
  <%= render Bali::SearchInput::Component.new(
    form: f,
    field: :query,
    class: 'input-lg'
  ) %>
<% end %>
```

## Notes

- Base input classes: `input input-bordered`
- Base button classes: `btn btn-primary join-item`
- Container uses DaisyUI `join` class when submit button is visible
- Auto-submit requires Stimulus `submit-on-change` controller
- Submit button is hidden when `auto_submit: true`
- Generated input ID format: `#{form.model_name}_#{field}`
- Generated input name format: `#{form.model_name}[#{field}]`
- Placeholder defaults to I18n key: `bali.search_input.placeholder`
