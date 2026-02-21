# Properties Table

Simple table with zebra striping for displaying property-value pairs.

## Slots

- `properties` - Property row components (`Bali::PropertiesTable::Property::Component`)

## Usage

```erb
<%# Basic properties table %>
<%= render Bali::PropertiesTable::Component.new do |c| %>
  <% c.with_property(label: 'Name', value: @user.name) %>
  <% c.with_property(label: 'Email', value: @user.email) %>
  <% c.with_property(label: 'Role', value: @user.role) %>
<% end %>

<%# With formatted values %>
<%= render Bali::PropertiesTable::Component.new do |c| %>
  <% c.with_property(label: 'Created') do %>
    <%= @record.created_at.to_s(:long) %>
  <% end %>
  <% c.with_property(label: 'Status') do %>
    <span class="badge badge-primary"><%= @record.status %></span>
  <% end %>
<% end %>

<%# With custom class %>
<%= render Bali::PropertiesTable::Component.new(class: 'w-full') do |c| %>
  <% @object.attributes.each do |key, value| %>
    <% c.with_property(label: key.titleize, value: value) %>
  <% end %>
<% end %>
```

## Notes

- Uses DaisyUI table classes with zebra striping
- Clean design without heavy borders
- Each property row displays a label and value
