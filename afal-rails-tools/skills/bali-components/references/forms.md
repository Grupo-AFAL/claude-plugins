# Bali FormBuilder

Bali forms use a custom FormBuilder (`Bali::FormBuilder`), **NOT** ViewComponents. Never use raw HTML with Stimulus data attributes for form fields -- the FormBuilder handles all wiring automatically.

## Basic Usage

```erb
<%# ALWAYS specify builder: Bali::FormBuilder %>
<%= form_with model: @user, url: users_path, builder: Bali::FormBuilder do |f| %>
  <%= f.text_field_group :name %>
  <%= f.email_field_group :email %>
  <%= f.password_field_group :password %>
  <%= f.boolean_field_group :accept_terms, label: "Accept terms" %>
  <%= f.submit_actions "Register", cancel_path: root_path %>
<% end %>

<%# For forms without a model %>
<%= form_with url: "#", method: :get, builder: Bali::FormBuilder, data: { turbo: false } do |f| %>
  <%= f.date_field_group :start_date, label: "Start Date" %>
  <%= f.slim_select_group :category, @options, { label: "Category" }, { placeholder: "Choose..." } %>
<% end %>
```

## Field Methods

| Method | Usage |
|--------|-------|
| `text_field_group :attr` | Text input with label |
| `email_field_group :attr` | Email input |
| `password_field_group :attr` | Password input |
| `number_field_group :attr` | Number input |
| `text_area_group :attr` | Textarea |
| `select_group :attr, options` | Native select |
| `slim_select_group :attr, options, form_opts, html_opts` | Enhanced searchable select |
| `boolean_field_group :attr` | Checkbox |
| `switch_field_group :attr` | Toggle switch |
| `date_field_group :attr` | Date picker (Flatpickr) |
| `datetime_field_group :attr` | DateTime picker |
| `file_field_group :attr` | File upload |

## Field Options

```ruby
f.text_field_group :name,
  addon_left: tag.span("@"),        # Left addon
  addon_right: tag.button("Clear"), # Right addon
  help: "Enter your full name"      # Help text below field
```

## SlimSelect (Enhanced Select)

```erb
<%# Single select %>
<%= f.slim_select_group :status, @options, { label: "Status" }, { placeholder: "Choose..." } %>

<%# Multiple select %>
<%= f.slim_select_group :tags, @options, { label: "Tags" }, { multiple: true, placeholder: "Select..." } %>

<%# With search enabled %>
<%= f.slim_select_group :user_id, @users, { label: "User", show_search: true }, { placeholder: "Search users..." } %>
```

**Arguments:** `method`, `options_array`, `form_options_hash`, `html_options_hash`

**Form options:** `label:`, `show_search:`, `add_items:`, `allow_deselect_option:`

**HTML options:** `placeholder:`, `multiple:`, `disabled:`

## Submit Buttons

```ruby
# Simple submit
f.submit "Save", variant: :primary

# Submit with cancel (recommended)
f.submit_actions "Save", cancel_path: back_path

# In modal forms
f.submit_actions "Save", modal: true  # Auto-adds modal#close to cancel
```

## JavaScript Dependencies

```bash
yarn add slim-select   # Required for SlimSelect
yarn add flatpickr     # Required for date/datetime pickers
```

## Common Mistakes

| Wrong | Right | Why |
|-------|-------|-----|
| Raw HTML `data-controller="slim-select"` | `f.slim_select_group` | FormBuilder handles Stimulus wiring |
| `Bali::Form::TextField::Component` | `f.text_field_group` | Forms use FormBuilder, not ViewComponents |
| `form_with model:` (no builder) | `form_with builder: Bali::FormBuilder` | Always specify FormBuilder |
