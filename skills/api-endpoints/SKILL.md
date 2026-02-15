---
name: api-endpoints
description: This skill should be used when the user asks to create an API endpoint, build an API, add an API controller, serialize to JSON, add API pagination, add API filtering, implement API sorting, create a blueprint, use Blueprinter, or build a RESTful API in AFAL Rails applications.
---

# API Endpoints for AFAL Rails Applications

Build RESTful API endpoints using Blueprinter serialization, Pagy pagination, and Ransack filtering.

## CRITICAL Constraints

- **Blueprinter** for serialization (NOT jsonapi-serializer, jbuilder, or active_model_serializers)
- **Pagy** for pagination (NOT kaminari or will_paginate)
- **Ransack** for filtering (NOT custom query parsing)
- **Plain JSON** responses (NOT JSON:API spec format)
- **Minitest** for testing (NOT RSpec)

## Response Format

All API responses follow this structure:

**Single resource:**
```json
{
  "data": {
    "id": 1,
    "name": "Project Alpha",
    "status": "active",
    "created_at": "2026-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2026-02-14T15:30:00Z"
  }
}
```

**Collection:**
```json
{
  "data": [
    { "id": 1, "name": "Project Alpha", "status": "active" }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 98,
    "per_page": 20,
    "next_page": 2,
    "prev_page": null
  },
  "meta": {
    "timestamp": "2026-02-14T15:30:00Z"
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "validation_error",
    "message": "The request could not be processed",
    "details": [
      { "field": "name", "message": "can't be blank" }
    ],
    "request_id": "abc-123-def"
  }
}
```

## Blueprint Pattern

Place blueprints in `app/blueprints/`. Use composable views for different detail levels:

```ruby
class ProjectBlueprint < Blueprinter::Base
  identifier :id

  # Default view - minimal fields
  fields :name, :status, :created_at, :updated_at

  # List view - for index actions
  view :list do
    field :task_count do |project|
      project.tasks.size
    end
  end

  # Full view - for show actions
  view :full do
    fields :description, :notes

    field :organization do |project|
      { id: project.organization_id, name: project.organization.name }
    end

    association :tasks, blueprint: TaskBlueprint, view: :list
  end
end
```

Render in controllers:

```ruby
# Single resource
render json: { data: ProjectBlueprint.render_as_hash(project, view: :full) }

# Collection with pagination
render_collection(projects, pagy, ProjectBlueprint, view: :list)
```

## Controller Pattern

API controllers follow this inheritance:

```
ApplicationController
  └── Api::V1::BaseController (auth, error handling, pagination helpers)
      └── Api::V1::ResourcesController (CRUD actions)
```

### Base Controller

```ruby
class Api::V1::BaseController < ActionController::API
  include Pagy::Backend
  include Authentication
  include ApiErrorHandling

  before_action :authenticate_user!

  private

  def render_resource(resource, blueprint, view: :full, status: :ok)
    render json: {
      data: blueprint.render_as_hash(resource, view: view),
      meta: { timestamp: Time.current.iso8601 }
    }, status: status
  end

  def render_collection(records, pagy, blueprint, view: :list)
    render json: {
      data: blueprint.render_as_hash(records, view: view),
      pagination: pagination_meta(pagy),
      meta: { timestamp: Time.current.iso8601 }
    }
  end

  def pagination_meta(pagy)
    {
      current_page: pagy.page,
      total_pages: pagy.pages,
      total_count: pagy.count,
      per_page: pagy.items,
      next_page: pagy.next,
      prev_page: pagy.prev
    }
  end
end
```

### Resource Controller

```ruby
class Api::V1::ProjectsController < Api::V1::BaseController
  def index
    authorize Project
    scope = policy_scope(Project)
    scope = scope.ransack(params[:q]).result if params[:q].present?
    pagy, records = pagy(scope, items: params[:per_page]&.to_i || 20)

    render_collection(records, pagy, ProjectBlueprint, view: :list)
  end

  def show
    project = Project.find(params[:id])
    authorize project
    render_resource(project, ProjectBlueprint, view: :full)
  end

  def create
    project = Project.new(project_params)
    project.organization = current_user.organization
    authorize project

    project.save!
    render_resource(project, ProjectBlueprint, view: :full, status: :created)
  end

  def update
    project = Project.find(params[:id])
    authorize project

    project.update!(project_params)
    render_resource(project, ProjectBlueprint, view: :full)
  end

  def destroy
    project = Project.find(params[:id])
    authorize project
    project.destroy!

    head :no_content
  end

  private

  def project_params
    params.require(:project).permit(:name, :status, :description)
  end
end
```

## Filtering with Ransack

Accept `q` parameter with Ransack predicates:

```
GET /api/v1/projects?q[name_cont]=alpha&q[status_eq]=active
```

**CRITICAL**: Whitelist ransackable attributes on models:

```ruby
class Project < ApplicationRecord
  def self.ransackable_attributes(_auth_object = nil)
    %w[name status created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[organization tasks]
  end
end
```

## Sorting

Accept `sort` and `sort_direction` params, or use Ransack sorts:

```
GET /api/v1/projects?q[s]=created_at+desc
```

## Request Format

Create/update requests use standard Rails params:

```json
{
  "project": {
    "name": "New Project",
    "status": "active",
    "description": "Project description"
  }
}
```

NOT the JSON:API `data/type/attributes` format.

## Common Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Using jsonapi-serializer or jbuilder | Use Blueprinter gem |
| JSON:API spec format (`data.type`, `data.attributes`) | Plain JSON with `data` wrapper |
| `Content-Type: application/vnd.api+json` | Use `application/json` |
| Forgetting ransackable whitelist | Always define `ransackable_attributes` |
| Passing AR objects in blueprint associations | Use `includes()` to prevent N+1 |
| Missing Pundit authorization | Use `authorize` and `policy_scope` |
| Not converting `per_page` to integer | Params are strings, use `.to_i` |

## References

- **blueprints.md** - Blueprint views, associations, computed fields, inheritance
- **controllers.md** - Base controller setup, error handling, pagination, auth
- **testing.md** - Integration test patterns, helper methods, auth in tests

## Quick Start

1. Add `blueprinter` and `pagy` to Gemfile
2. Create `Api::V1::BaseController` with render helpers and error handling
3. Create resource controller inheriting from base
4. Create blueprint with `:list` and `:full` views
5. Add routes under `namespace :api` with `defaults: { format: :json }`
6. Define `ransackable_attributes` on models
7. Write integration tests with JSON assertions
8. Test pagination, filtering, authorization
