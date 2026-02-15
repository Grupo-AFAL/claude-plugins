# JSON:API Serialization Patterns

Detailed patterns for serializing resources to JSON:API format using `jsonapi-serializer` gem.

## Gem Setup

Add to Gemfile:

```ruby
gem 'jsonapi-serializer'
```

## Basic Serializer Structure

Place serializers in `app/serializers/`. Name them `<ResourceName>Serializer`:

```ruby
class ProjectSerializer
  include JSONAPI::Serializer

  set_type :projects  # Optional: defaults to model name pluralized
  set_id :id          # Optional: defaults to :id

  attributes :name, :status, :description, :created_at, :updated_at
end
```

Usage:

```ruby
ProjectSerializer.new(project).serializable_hash
# => { data: { id: '1', type: 'projects', attributes: { name: '...', ... } } }
```

## Attributes Declaration

### Simple Attributes

```ruby
attributes :name, :status, :created_at
```

### Conditional Attributes

Show attribute only when condition is met:

```ruby
attribute :internal_notes, if: Proc.new { |record, params|
  params && params[:current_user]&.admin?
}
```

### Computed Attributes

Derive attribute from model method or custom logic:

```ruby
attribute :full_name do |project|
  "#{project.organization.name} - #{project.name}"
end

attribute :task_count do |project|
  project.tasks.count
end

attribute :is_overdue do |project|
  project.due_date && project.due_date < Date.today
end
```

### Formatted Attributes

Transform attribute values:

```ruby
attribute :created_at do |project|
  project.created_at.iso8601
end

attribute :amount do |project|
  format('%.2f', project.amount)
end
```

## Relationship Serialization

### Belongs To

```ruby
belongs_to :organization
belongs_to :owner, serializer: :user  # Use UserSerializer
```

Output:

```json
{
  "relationships": {
    "organization": {
      "data": { "type": "organizations", "id": "5" }
    }
  }
}
```

### Has Many

```ruby
has_many :tasks
has_many :team_members, serializer: :user
```

Output:

```json
{
  "relationships": {
    "tasks": {
      "data": [
        { "type": "tasks", "id": "10" },
        { "type": "tasks", "id": "11" }
      ]
    }
  }
}
```

### Conditional Relationships

```ruby
has_many :tasks, if: Proc.new { |record, params|
  params && params[:include_tasks]
}
```

### Polymorphic Relationships

```ruby
belongs_to :assignable, polymorphic: true
```

Ensure `assignable_type` is set correctly on the model.

## Nested Serializers

Reference other serializers for relationships:

```ruby
class ProjectSerializer
  include JSONAPI::Serializer

  attributes :name
  has_many :tasks, serializer: :task
end

class TaskSerializer
  include JSONAPI::Serializer

  attributes :title, :status
  belongs_to :project
end
```

## Collection Serialization

Serialize arrays:

```ruby
ProjectSerializer.new(projects).serializable_hash
# => { data: [ { id: '1', type: 'projects', ... }, { id: '2', ... } ] }
```

Empty collections:

```ruby
ProjectSerializer.new([]).serializable_hash
# => { data: [] }
```

## Meta Information

Add metadata to response:

```ruby
ProjectSerializer.new(
  projects,
  meta: {
    total_count: 100,
    page: 1,
    per_page: 25
  }
).serializable_hash
```

Output:

```json
{
  "data": [ /* ... */ ],
  "meta": {
    "total_count": 100,
    "page": 1,
    "per_page": 25
  }
}
```

## Links Generation

### Self Links

```ruby
link :self do |project|
  "/api/v1/projects/#{project.id}"
end
```

### Related Links

```ruby
link :tasks do |project|
  "/api/v1/projects/#{project.id}/tasks"
end
```

### Relationship Links

```ruby
belongs_to :organization do |project|
  link :related do |project|
    "/api/v1/organizations/#{project.organization_id}"
  end
end
```

## Sparse Fieldsets

Allow clients to request only specific attributes:

```
GET /api/v1/projects?fields[projects]=name,status
```

Controller:

```ruby
def index
  projects = Project.all
  render json: ProjectSerializer.new(
    projects,
    fields: params[:fields]
  ).serializable_hash
end
```

The `fields` param structure:

```ruby
params[:fields] = {
  projects: 'name,status',
  organizations: 'name'
}
```

## Compound Documents (Included Resources)

Sideload related resources to reduce API calls:

```
GET /api/v1/projects?include=organization,tasks
```

Controller:

```ruby
def index
  includes = params[:include]&.split(',') || []
  projects = Project.includes(includes.map(&:to_sym))

  render json: ProjectSerializer.new(
    projects,
    include: includes
  ).serializable_hash
end
```

Output includes both primary data and related resources:

```json
{
  "data": [
    {
      "id": "1",
      "type": "projects",
      "attributes": { "name": "Project A" },
      "relationships": {
        "organization": {
          "data": { "type": "organizations", "id": "5" }
        }
      }
    }
  ],
  "included": [
    {
      "id": "5",
      "type": "organizations",
      "attributes": { "name": "ACME Corp" }
    }
  ]
}
```

## Passing Parameters to Serializers

Pass custom data to serializers for conditional logic:

```ruby
ProjectSerializer.new(
  project,
  params: {
    current_user: current_user,
    include_internal: true
  }
).serializable_hash
```

Access in serializer:

```ruby
attribute :internal_notes, if: Proc.new { |record, params|
  params[:include_internal]
}

attribute :can_edit do |project, params|
  params[:current_user]&.can_edit?(project)
end
```

## Serializer Inheritance

Share common attributes across serializers:

```ruby
class BaseSerializer
  include JSONAPI::Serializer

  attributes :created_at, :updated_at
end

class ProjectSerializer < BaseSerializer
  attributes :name, :status
end
```

## Handling Nil Resources

Single resource:

```ruby
ProjectSerializer.new(nil).serializable_hash
# => { data: nil }
```

Return 404 in controller instead:

```ruby
def show
  project = Project.find_by(id: params[:id])

  if project
    render json: ProjectSerializer.new(project).serializable_hash
  else
    render json: { errors: [{ status: '404', title: 'Not found' }] }, status: :not_found
  end
end
```

## Cache Key

Optimize serialization with caching:

```ruby
class ProjectSerializer
  include JSONAPI::Serializer

  cache_options store: Rails.cache, namespace: 'jsonapi-serializer', expires_in: 1.hour

  attributes :name, :status
end
```

## Type Customization

Override default type naming:

```ruby
class TaskListSerializer
  include JSONAPI::Serializer

  set_type :task_lists  # Instead of default 'task_list'
end
```

## ID Customization

Use different attribute as ID:

```ruby
class ProjectSerializer
  include JSONAPI::Serializer

  set_id :uuid  # Use uuid instead of id

  attributes :name
end
```

## Complex Relationship Example

Full-featured relationship with links and meta:

```ruby
has_many :tasks do |project|
  link :self do
    "/api/v1/projects/#{project.id}/relationships/tasks"
  end

  link :related do
    "/api/v1/projects/#{project.id}/tasks"
  end

  meta do
    {
      count: project.tasks.count,
      completed: project.tasks.completed.count
    }
  end
end
```

## Multiple Resource Types in Response

When serializing polymorphic collections, ensure each type has a serializer:

```ruby
def index
  activities = Activity.all  # Mix of ProjectActivity, TaskActivity

  render json: ActivitySerializer.new(
    activities,
    is_collection: true
  ).serializable_hash
end
```

Define serializer per type or use a shared base.
