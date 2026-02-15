---
name: jsonapi-endpoints
description: This skill should be used when the user asks to create an API endpoint, add JSON API functionality, build an API, add an API controller, serialize to JSON API format, handle API response format, add includes for compound documents, implement sparse fieldsets, add API pagination, add API filtering, or implement API sorting.
---

# JSON:API Endpoints for AFAL Rails Applications

Build spec-compliant JSON:API endpoints in AFAL Rails applications.

## JSON:API Document Structure

Every JSON:API response follows this structure:

```json
{
  "data": { /* resource object or array */ },
  "included": [ /* related resources */ ],
  "meta": { /* pagination, counts */ },
  "links": { /* pagination, self */ }
}
```

Resource objects contain:
- `id` - string identifier
- `type` - resource type (plural, dasherized)
- `attributes` - resource attributes (no id, type, or foreign keys)
- `relationships` - links to related resources
- `links` - self link

## Controller Pattern

API controllers follow this inheritance chain:

```
ApplicationController
  └── Api::V1::BaseController (authentication, error handling, content type)
      └── Api::V1::ResourcesController (CRUD actions)
```

Place controllers in `app/controllers/api/v1/`. Use the `Api::V1` namespace for versioning.

Standard CRUD actions return:
- `index` - collection with pagination
- `show` - single resource
- `create` - created resource (201 status)
- `update` - updated resource
- `destroy` - 204 No Content

## Serializer Pattern

Use `jsonapi-serializer` gem (fast, simple). Place serializers in `app/serializers/`.

```ruby
class ProjectSerializer
  include JSONAPI::Serializer

  attributes :name, :status, :created_at

  belongs_to :organization
  has_many :tasks

  attribute :computed_field do |project|
    project.some_method
  end
end
```

Serialize with `ProjectSerializer.new(project).serializable_hash`.

## Request/Response Formats

### Create/Update Request Body

```json
{
  "data": {
    "type": "projects",
    "attributes": {
      "name": "New Project",
      "status": "active"
    },
    "relationships": {
      "organization": {
        "data": { "type": "organizations", "id": "1" }
      }
    }
  }
}
```

### Success Response

```json
{
  "data": {
    "id": "42",
    "type": "projects",
    "attributes": {
      "name": "New Project",
      "status": "active",
      "created_at": "2026-02-14T10:00:00Z"
    },
    "relationships": {
      "organization": {
        "data": { "type": "organizations", "id": "1" }
      },
      "tasks": {
        "data": []
      }
    },
    "links": {
      "self": "/api/v1/projects/42"
    }
  }
}
```

### Error Response

```json
{
  "errors": [
    {
      "status": "422",
      "title": "Validation failed",
      "detail": "Name can't be blank",
      "source": { "pointer": "/data/attributes/name" }
    }
  ]
}
```

## Pagination

Use `page[number]` and `page[size]` query parameters with Pagy:

```ruby
pagy, records = pagy(scope, items: params.dig(:page, :size) || 25)
```

Include pagination meta and links:

```json
{
  "data": [ /* resources */ ],
  "meta": {
    "page": 1,
    "per_page": 25,
    "total_pages": 4,
    "total_count": 100
  },
  "links": {
    "self": "/api/v1/projects?page[number]=1",
    "first": "/api/v1/projects?page[number]=1",
    "next": "/api/v1/projects?page[number]=2",
    "last": "/api/v1/projects?page[number]=4"
  }
}
```

## Filtering

Accept `filter[attribute]=value` query parameters:

```ruby
scope = scope.where(status: params.dig(:filter, :status)) if params.dig(:filter, :status)
```

For complex filtering, use Ransack or scopes.

## Sorting

Accept `sort` parameter with comma-separated attributes. Prefix with `-` for descending:

```
GET /api/v1/projects?sort=-created_at,name
```

```ruby
if params[:sort].present?
  order_clauses = params[:sort].split(',').map do |attr|
    if attr.start_with?('-')
      "#{attr[1..]} DESC"
    else
      "#{attr} ASC"
    end
  end
  scope = scope.order(order_clauses.join(', '))
end
```

## Sparse Fieldsets

Accept `fields[type]=attr1,attr2` to return only requested attributes:

```
GET /api/v1/projects?fields[projects]=name,status
```

Pass to serializer:

```ruby
ProjectSerializer.new(projects, fields: params[:fields]).serializable_hash
```

## Compound Documents (Includes)

Accept `include` parameter to sideload related resources:

```
GET /api/v1/projects?include=organization,tasks
```

```ruby
scope = scope.includes(params[:include].split(',')) if params[:include].present?
ProjectSerializer.new(projects, include: params[:include]&.split(',')).serializable_hash
```

## Common Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Wrong Content-Type header | Always `application/vnd.api+json` for requests and responses |
| Missing `type` in resource objects | Always include `type` field matching resource name (plural, dasherized) |
| Foreign keys in attributes | Move to `relationships`, not `attributes` |
| Wrong error format | Use JSON:API error objects with `status`, `title`, `detail`, `source` |
| Inconsistent pluralization | Use plural dasherized names (e.g., `task-lists`, not `task_list`) |
| Missing pagination links | Always include `links` with `self`, `first`, `next`, `last` |
| Returning 200 for create | Return 201 Created with `Location` header |
| Returning body for destroy | Return 204 No Content with empty body |

## Authorization

Apply Pundit policies in API controllers. Scope collections by organization:

```ruby
def index
  authorize Project
  scope = policy_scope(Project).where(organization: current_organization)
  # ... pagination, filtering, sorting
end
```

## Testing

Write integration tests in `test/integration/api/v1/` using Minitest. Set headers:

```ruby
headers = {
  'Content-Type' => 'application/vnd.api+json',
  'Accept' => 'application/vnd.api+json'
}
```

Parse responses and assert structure:

```ruby
response_body = JSON.parse(response.body)
assert_equal 'projects', response_body['data']['type']
assert_equal project.id.to_s, response_body['data']['id']
```

## References

- **serialization.md** - Detailed serializer patterns, relationships, computed attributes, sparse fieldsets, compound documents
- **controllers.md** - Base controller setup, CRUD actions, error handling, filtering, sorting, authorization
- **testing.md** - Integration test patterns, fixtures, helper methods, authorization testing

## Quick Start

1. Add `jsonapi-serializer` to Gemfile
2. Create `Api::V1::BaseController` with authentication and error handling
3. Create resource controller inheriting from base
4. Create serializer with attributes and relationships
5. Add routes under `namespace :api, defaults: { format: :json }`
6. Write integration tests with JSON:API assertions
7. Test pagination, filtering, sorting, includes
8. Test authorization (authenticated, unauthorized, wrong org)
