# Locations Map

Google Maps integration for displaying multiple locations with optional markers and info cards.

## Parameters

- `center_latitude:` - Map center latitude (default: 32.5036383, Tijuana)
- `center_longitude:` - Map center longitude (default: -117.0308968, Tijuana)
- `zoom:` - Initial zoom level (default: 12)
- `clustered:` - Enable marker clustering for many locations (default: false)

## Slots

- `cards` - Info card components displayed alongside map (`Bali::LocationsMap::Card::Component`)
- `locations` - Location marker components (`Bali::LocationsMap::Location::Component`)

## Usage

```erb
<%# Basic map with markers %>
<%= render Bali::LocationsMap::Component.new do |c| %>
  <% @stores.each do |store| %>
    <% c.with_location(
      latitude: store.latitude,
      longitude: store.longitude,
      title: store.name
    ) %>
  <% end %>
<% end %>

<%# With info cards %>
<%= render Bali::LocationsMap::Component.new(
  center_latitude: @city.latitude,
  center_longitude: @city.longitude,
  zoom: 13
) do |c| %>
  <% @locations.each do |loc| %>
    <% c.with_location(
      latitude: loc.lat,
      longitude: loc.lng,
      title: loc.name
    ) %>
    <% c.with_card do %>
      <h3><%= loc.name %></h3>
      <p><%= loc.address %></p>
    <% end %>
  <% end %>
<% end %>

<%# With marker clustering %>
<%= render Bali::LocationsMap::Component.new(
  clustered: true,
  zoom: 10
) do |c| %>
  <% @many_locations.each do |location| %>
    <% c.with_location(
      latitude: location.latitude,
      longitude: location.longitude,
      title: location.name
    ) %>
  <% end %>
<% end %>
```

## Notes

- Requires `GOOGLE_MAPS_KEY` environment variable
- Map is 450px tall by default
- Responsive layout: side-by-side on desktop, stacked on mobile
- Cards display in a separate panel alongside the map
- Clustering improves performance with many markers
- Respects `I18n.locale` for map controls
