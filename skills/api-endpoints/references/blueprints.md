# Blueprinter Serialization Patterns

Detailed patterns for serializing resources using the `blueprinter` gem in AFAL Rails applications.

## Gem Setup

```ruby
# Gemfile
gem 'blueprinter'
```

Configure globally:

```ruby
# config/initializers/blueprinter.rb
Blueprinter.configure do |config|
  config.datetime_format = ->(datetime) { datetime&.iso8601 }
end
```

## Basic Blueprint Structure

Place blueprints in `app/blueprints/`. Name them `<ResourceName>Blueprint`:

```ruby
class ProjectBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :status, :created_at, :updated_at
end
```

Usage:

```ruby
ProjectBlueprint.render(project)           # JSON string
ProjectBlueprint.render_as_hash(project)   # Ruby hash
ProjectBlueprint.render_as_json(project)   # JSON object
```

## Views (Composable Serialization)

Views allow different detail levels from the same blueprint. Views inherit fields from the default view.

```ruby
class ProjectBlueprint < Blueprinter::Base
  identifier :id

  # Default view - always included
  fields :name, :status

  # List view - for index/collection responses
  view :list do
    field :task_count do |project|
      project.tasks.size
    end
    field :organization_name do |project|
      project.organization.name
    end
  end

  # Full view - for show/detail responses
  view :full do
    include_view :list  # Inherit list fields too

    fields :description, :notes, :created_at, :updated_at

    association :tasks, blueprint: TaskBlueprint, view: :list
    association :members, blueprint: UserBlueprint, view: :minimal
  end

  # Minimal view - for embedding in other blueprints
  view :minimal do
    # Only id and name (from default)
  end

  # As-ingredient view - for polymorphic contexts
  view :as_ingredient do
    field :ingredient_type do
      "Project"
    end
  end
end
```

Render with specific view:

```ruby
ProjectBlueprint.render_as_hash(project, view: :full)
ProjectBlueprint.render_as_hash(projects, view: :list)
```

## Field Types

### Simple Fields

```ruby
fields :name, :status, :created_at
```

### Computed Fields

Derive values from model methods or custom logic:

```ruby
field :full_name do |project|
  "#{project.organization.name} - #{project.name}"
end

field :is_overdue do |project|
  project.due_date.present? && project.due_date < Date.today
end

field :cost_per_serving do |recipe|
  recipe.total_cost / recipe.servings_count
end
```

### Formatted Fields

Transform attribute values:

```ruby
field :amount do |project|
  format('%.2f', project.amount)
end

field :yield do |recipe|
  { value: recipe.yield_value.to_f, unit: recipe.yield_unit }
end

field :times do |recipe|
  {
    preparation: format_time(recipe.preparation_time_in_seconds),
    cooking: format_time(recipe.cooking_time_in_seconds),
    total_seconds: recipe.total_time_in_seconds
  }
end
```

### Conditional Fields

```ruby
field :internal_notes, if: ->(field_name, project, options) {
  options[:current_user]&.admin?
}
```

Pass options when rendering:

```ruby
ProjectBlueprint.render_as_hash(project, current_user: current_user)
```

### Renamed Fields

```ruby
field :category_name do |item|
  item.category&.name
end

field :as_purchased_cost do |item|
  item.current_cost
end
```

## Associations

### Basic Association

```ruby
association :organization, blueprint: OrganizationBlueprint
association :tasks, blueprint: TaskBlueprint, view: :list
```

### Inline Association (no separate blueprint)

For simple nested objects, use a field block:

```ruby
field :organization do |project|
  { id: project.organization_id, name: project.organization.name }
end

field :created_by do |record|
  if record.creator
    { id: record.creator.id, name: record.creator.name }
  end
end
```

### Conditional Association

```ruby
association :tasks, blueprint: TaskBlueprint, if: ->(field_name, project, options) {
  options[:include_tasks]
}
```

### Polymorphic Association

```ruby
field :ingredient do |ingredient|
  case ingredient.ingredient_type
  when "Item"
    ItemBlueprint.render_as_hash(ingredient.ingredient, view: :as_ingredient)
  when "Recipe"
    RecipeBlueprint.render_as_hash(ingredient.ingredient, view: :as_ingredient)
  end
end
```

## Blueprint Inheritance

Share common fields across blueprints:

```ruby
class BaseBlueprint < Blueprinter::Base
  identifier :id
  fields :created_at, :updated_at
end

class ProjectBlueprint < BaseBlueprint
  fields :name, :status
end

class TaskBlueprint < BaseBlueprint
  fields :title, :completed
end
```

## N+1 Prevention

Blueprints access associations, so always eager-load in controllers:

```ruby
# BAD - N+1 queries
projects = Project.all
ProjectBlueprint.render_as_hash(projects, view: :list)

# GOOD - eager loaded
projects = Project.includes(:organization, :tasks)
ProjectBlueprint.render_as_hash(projects, view: :list)
```

For computed fields accessing associations:

```ruby
# In controller
projects = Project.includes(:tasks).all

# In blueprint - safe because tasks are preloaded
field :task_count do |project|
  project.tasks.size  # Uses preloaded association, not COUNT query
end
```

## Error Handling in Blueprints

Handle missing data gracefully:

```ruby
field :preferred_vendor do |item|
  if item.preferred_vendor
    { id: item.preferred_vendor.id, name: item.preferred_vendor.name }
  end
end

field :cost_per_serving do |recipe|
  return nil if recipe.servings_count.zero?
  (recipe.total_cost / recipe.servings_count).round(2)
rescue => e
  Rails.logger.warn("Cost calculation failed for recipe #{recipe.id}: #{e.message}")
  nil
end
```

## Rendering Patterns

### Single Resource

```ruby
render json: {
  data: ProjectBlueprint.render_as_hash(project, view: :full),
  meta: { timestamp: Time.current.iso8601 }
}
```

### Collection with Pagination

```ruby
pagy, records = pagy(scope, items: params[:per_page]&.to_i || 20)

render json: {
  data: ProjectBlueprint.render_as_hash(records, view: :list),
  pagination: {
    current_page: pagy.page,
    total_pages: pagy.pages,
    total_count: pagy.count,
    per_page: pagy.items,
    next_page: pagy.next,
    prev_page: pagy.prev
  },
  meta: { timestamp: Time.current.iso8601 }
}
```

### Empty Collection

```ruby
# Returns: { "data": [], "pagination": { ... } }
```

## File Organization

```
app/
  blueprints/
    project_blueprint.rb
    task_blueprint.rb
    user_blueprint.rb
    organization_blueprint.rb
```

For engines (like FlamingOS):

```
app/
  blueprints/
    flaming_os/
      recipe_blueprint.rb
      item_blueprint.rb
```
