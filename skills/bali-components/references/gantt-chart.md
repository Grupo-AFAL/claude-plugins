# Gantt Chart

Gantt chart for project timeline visualization with drag/resize capabilities.

## Parameters

- `tasks:` - Array of task hashes (see Task Format below)
- `row_height:` - Height of each row in pixels (default: 35)
- `col_width:` - Width of each column in pixels (default: 25 for day, 100 for week/month)
- `zoom:` - Time scale: `:day`, `:week`, `:month` (default: `:day`)
- `readonly:` - Disable drag/resize interactions (default: false)
- `offset:` - Horizontal scroll offset in pixels (default: auto-calculated)
- `resource_name:` - Name of resource being updated
- `list_param_name:` - Name of list parameter (default: 'list_id')
- `start_date:` - Chart start date (default: auto-calculated from tasks)

## Slots

- `list_footer` - Footer content for task list area
- `footer` - Footer content for entire chart
- `view_mode_buttons` - Custom view mode buttons

## Task Format

```ruby
{
  id: 1,
  name: "Task name",
  start_date: Date.new(2024, 1, 1),
  end_date: Date.new(2024, 1, 5),
  parent_id: nil,  # Optional, for hierarchical tasks
  progress: 50,    # Optional, 0-100
  url: task_path(task)  # Optional, for updates
}
```

## Usage

```erb
<%# Basic Gantt chart %>
<%= render Bali::GanttChart::Component.new(
  tasks: [
    { id: 1, name: "Task 1", start_date: Date.today, end_date: Date.today + 5 },
    { id: 2, name: "Task 2", start_date: Date.today + 2, end_date: Date.today + 7 }
  ]
) %>

<%# Week view %>
<%= render Bali::GanttChart::Component.new(
  tasks: @project.tasks.map { |t|
    {
      id: t.id,
      name: t.name,
      start_date: t.start_date,
      end_date: t.end_date,
      progress: t.completion_percentage,
      url: task_path(t)
    }
  },
  zoom: :week,
  resource_name: 'task'
) %>

<%# Month view with custom dimensions %>
<%= render Bali::GanttChart::Component.new(
  tasks: @tasks,
  zoom: :month,
  row_height: 40,
  col_width: 120
) %>

<%# Read-only mode %>
<%= render Bali::GanttChart::Component.new(
  tasks: @tasks,
  readonly: true
) %>

<%# With footer %>
<%= render Bali::GanttChart::Component.new(tasks: @tasks) do |c| %>
  <% c.with_footer do %>
    <%= link_to "Add Task", new_task_path, class: "btn btn-primary" %>
  <% end %>
<% end %>

<%# Hierarchical tasks %>
<%= render Bali::GanttChart::Component.new(
  tasks: [
    { id: 1, name: "Parent Task", start_date: Date.today, end_date: Date.today + 10 },
    { id: 2, name: "Child Task 1", start_date: Date.today, end_date: Date.today + 3, parent_id: 1 },
    { id: 3, name: "Child Task 2", start_date: Date.today + 4, end_date: Date.today + 10, parent_id: 1 }
  ]
) %>
```

## Notes

- Tasks can be dragged to change dates and resized to change duration
- Parent-child relationships create hierarchical display
- Progress bars show completion percentage
- Automatically calculates chart date range from tasks
- When `resource_name` is provided, updates are sent to task URLs on drag/resize
- Day zoom is most granular, month zoom shows longest time periods
- Chart automatically includes today indicator
