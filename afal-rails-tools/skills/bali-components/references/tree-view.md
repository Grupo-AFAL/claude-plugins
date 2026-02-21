# Tree View

Nested menu tree with expandable/collapsible items.

## Parameters

- `current_path:` - Current URL path for highlighting active items

## Slots

- `items` - Tree item components with parameters:
  - `name:` (required) - Display text for the item
  - `path:` (required) - URL path for the item
  - Additional options can be passed

## Usage

```erb
<%# Basic tree view %>
<%= render Bali::TreeView::Component.new(current_path: request.path) do |c| %>
  <% c.with_item(name: 'Dashboard', path: dashboard_path) %>
  <% c.with_item(name: 'Settings', path: settings_path) %>
<% end %>

<%# Nested tree structure %>
<%= render Bali::TreeView::Component.new(current_path: request.path) do |c| %>
  <% c.with_item(name: 'Projects', path: projects_path) do |item| %>
    <% item.with_item(name: 'Active', path: active_projects_path) %>
    <% item.with_item(name: 'Archived', path: archived_projects_path) %>
  <% end %>
  <% c.with_item(name: 'Team', path: team_path) do |item| %>
    <% item.with_item(name: 'Members', path: team_members_path) %>
    <% item.with_item(name: 'Roles', path: team_roles_path) %>
  <% end %>
<% end %>
```

## Notes

- Styled with DaisyUI menu classes
- Items matching `current_path` are highlighted as active
- Supports unlimited nesting levels
- Items can be expanded/collapsed when they have children
