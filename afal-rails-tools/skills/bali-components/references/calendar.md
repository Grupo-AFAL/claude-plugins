# Calendar

Calendar view for displaying events across days, weeks, or months.

## Parameters

- `template:` - Path to HTML template for rendering day content
- `start_date:` - Starting date (Date object or string) (default: today)
- `period:` - View period: `:month`, `:week`, `:day` (default: `:month`)
- `events:` - Array of event objects
- `start_attribute:` - Method name for event start date (default: `:start_time`)
- `end_attribute:` - Method name for event end date (default: `:end_time`)
- `weekdays_only:` - Show only Monday-Friday (default: false)
- `show_date:` - Display date numbers (default: true)

## Slots

- `header` - Calendar header with parameters:
  - `route_path:` - Base path for navigation
  - `period_switch:` - Show period switcher (default: true)
- `footer` - Calendar footer content

## Usage

```erb
<%# Basic month view %>
<%= render Bali::Calendar::Component.new(events: @events) do |c| %>
  <% c.with_header(route_path: calendar_path) %>
<% end %>

<%# Week view %>
<%= render Bali::Calendar::Component.new(
  period: :week,
  start_date: @week_start,
  events: @events
) do |c| %>
  <% c.with_header(route_path: calendar_path) %>
<% end %>

<%# Weekdays only (Monday-Friday) %>
<%= render Bali::Calendar::Component.new(
  events: @events,
  weekdays_only: true
) %>

<%# With custom template %>
<%= render Bali::Calendar::Component.new(
  template: 'calendars/custom_day',
  events: @appointments,
  start_attribute: :scheduled_at,
  end_attribute: :ends_at
) %>

<%# Day view %>
<%= render Bali::Calendar::Component.new(
  period: :day,
  start_date: Date.today,
  events: @today_events
) do |c| %>
  <% c.with_header %>
  <% c.with_footer do %>
    <%= link_to "Add Event", new_event_path, class: "btn btn-primary" %>
  <% end %>
<% end %>
```

## Notes

- Events are automatically grouped by date
- Multi-day events span across dates
- Header includes navigation controls and optional period switcher
- Month view shows full weeks (including previous/next month days)
- Week view shows Monday-Sunday (or Mon-Fri with `weekdays_only: true`)
- Events must respond to `start_attribute` method, optionally to `end_attribute`
- Template receives access to `sorted_events` hash indexed by date
