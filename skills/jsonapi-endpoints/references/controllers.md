# JSON:API Controller Patterns

Detailed patterns for building API controllers following JSON:API specification.

## Base API Controller

Create `app/controllers/api/v1/base_controller.rb`:

```ruby
module Api
  module V1
    class BaseController < ApplicationController
      # Skip CSRF for API requests
      skip_before_action :verify_authenticity_token

      # Ensure JSON:API content type
      before_action :verify_jsonapi_content_type
      before_action :authenticate_user!

      # Rescue from common errors
      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
      rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity
      rescue_from Pundit::NotAuthorizedError, with: :render_forbidden

      private

      def verify_jsonapi_content_type
        return if request.content_type == 'application/vnd.api+json'
        return if request.get? || request.delete?

        render_error(
          status: 415,
          title: 'Unsupported Media Type',
          detail: 'Content-Type must be application/vnd.api+json'
        )
      end

      def render_not_found(exception)
        render_error(
          status: 404,
          title: 'Not Found',
          detail: exception.message
        )
      end

      def render_unprocessable_entity(exception)
        errors = exception.record.errors.map do |error|
          {
            status: '422',
            title: 'Validation failed',
            detail: error.full_message,
            source: { pointer: "/data/attributes/#{error.attribute}" }
          }
        end

        render json: { errors: errors }, status: :unprocessable_entity
      end

      def render_forbidden
        render_error(
          status: 403,
          title: 'Forbidden',
          detail: 'You are not authorized to perform this action'
        )
      end

      def render_error(status:, title:, detail:, source: nil)
        error = {
          status: status.to_s,
          title: title,
          detail: detail
        }
        error[:source] = source if source

        render json: { errors: [error] }, status: status
      end

      # Always return JSON:API content type
      def render(options = {})
        options[:content_type] ||= 'application/vnd.api+json'
        super(options)
      end
    end
  end
end
```

## Resource Controller Structure

Create `app/controllers/api/v1/projects_controller.rb`:

```ruby
module Api
  module V1
    class ProjectsController < BaseController
      before_action :set_project, only: [:show, :update, :destroy]

      def index
        authorize Project

        scope = policy_scope(Project).where(organization: current_organization)
        scope = apply_filters(scope)
        scope = apply_sorting(scope)

        pagy, projects = pagy(scope, items: page_size)

        render json: ProjectSerializer.new(
          projects,
          include: includes,
          fields: fields,
          meta: pagination_meta(pagy),
          links: pagination_links(pagy, request.original_url)
        ).serializable_hash
      end

      def show
        authorize @project

        render json: ProjectSerializer.new(
          @project,
          include: includes,
          fields: fields
        ).serializable_hash
      end

      def create
        @project = Project.new(project_params)
        @project.organization = current_organization
        authorize @project

        if @project.save
          render json: ProjectSerializer.new(@project).serializable_hash,
                 status: :created,
                 location: api_v1_project_url(@project)
        else
          render json: { errors: format_errors(@project.errors) },
                 status: :unprocessable_entity
        end
      end

      def update
        authorize @project

        if @project.update(project_params)
          render json: ProjectSerializer.new(@project).serializable_hash
        else
          render json: { errors: format_errors(@project.errors) },
                 status: :unprocessable_entity
        end
      end

      def destroy
        authorize @project
        @project.destroy
        head :no_content
      end

      private

      def set_project
        @project = Project.find(params[:id])
      end

      def project_params
        # JSON:API format: { data: { attributes: { ... }, relationships: { ... } } }
        attributes = params.dig(:data, :attributes) || {}
        relationships = params.dig(:data, :relationships) || {}

        permitted = attributes.permit(:name, :description, :status, :due_date)

        # Extract relationship IDs
        if relationships[:organization].present?
          permitted[:organization_id] = relationships.dig(:organization, :data, :id)
        end

        permitted
      end

      def apply_filters(scope)
        return scope unless params[:filter].present?

        filter_params = params[:filter].permit(:status, :search)

        scope = scope.where(status: filter_params[:status]) if filter_params[:status]
        scope = scope.where('name ILIKE ?', "%#{filter_params[:search]}%") if filter_params[:search]

        scope
      end

      def apply_sorting(scope)
        return scope.order(created_at: :desc) unless params[:sort].present?

        allowed_sorts = %w[name status created_at updated_at]

        order_clauses = params[:sort].split(',').filter_map do |attr|
          if attr.start_with?('-')
            field = attr[1..]
            "#{field} DESC" if allowed_sorts.include?(field)
          else
            "#{attr} ASC" if allowed_sorts.include?(attr)
          end
        end

        order_clauses.any? ? scope.order(order_clauses.join(', ')) : scope
      end

      def includes
        return [] unless params[:include].present?

        allowed_includes = %w[organization tasks owner]
        requested = params[:include].split(',')

        requested & allowed_includes
      end

      def fields
        params[:fields]
      end

      def page_size
        size = params.dig(:page, :size)&.to_i || 25
        [size, 100].min  # Cap at 100
      end

      def pagination_meta(pagy)
        {
          page: pagy.page,
          per_page: pagy.items,
          total_pages: pagy.pages,
          total_count: pagy.count
        }
      end

      def pagination_links(pagy, base_url)
        base_url = base_url.split('?').first

        {
          self: page_url(base_url, pagy.page),
          first: page_url(base_url, 1),
          last: page_url(base_url, pagy.pages)
        }.tap do |links|
          links[:prev] = page_url(base_url, pagy.prev) if pagy.prev
          links[:next] = page_url(base_url, pagy.next) if pagy.next
        end
      end

      def page_url(base, page_num)
        query = request.query_parameters.merge(page: { number: page_num, size: page_size })
        "#{base}?#{query.to_query}"
      end

      def format_errors(errors)
        errors.map do |error|
          {
            status: '422',
            title: 'Validation failed',
            detail: error.full_message,
            source: { pointer: "/data/attributes/#{error.attribute}" }
          }
        end
      end
    end
  end
end
```

## Routes Configuration

In `config/routes.rb`:

```ruby
namespace :api, defaults: { format: :json } do
  namespace :v1 do
    resources :projects do
      resources :tasks  # Nested resources
    end
    resources :organizations, only: [:index, :show]
  end
end
```

## Strong Parameters for JSON:API

JSON:API sends data in nested format. Extract correctly:

```ruby
# Request body:
# {
#   "data": {
#     "type": "projects",
#     "attributes": {
#       "name": "New Project",
#       "status": "active"
#     },
#     "relationships": {
#       "organization": {
#         "data": { "type": "organizations", "id": "5" }
#       }
#     }
#   }
# }

def project_params
  attributes = params.require(:data).require(:attributes).permit(:name, :description, :status)

  # Add relationship IDs
  if params.dig(:data, :relationships, :organization, :data, :id).present?
    attributes[:organization_id] = params.dig(:data, :relationships, :organization, :data, :id)
  end

  attributes
end
```

## Error Response Format

Always use JSON:API error format:

```ruby
def render_validation_errors(record)
  errors = record.errors.map do |error|
    {
      status: '422',
      title: 'Validation failed',
      detail: error.full_message,
      source: { pointer: "/data/attributes/#{error.attribute}" }
    }
  end

  render json: { errors: errors }, status: :unprocessable_entity
end
```

Error object structure:
- `status` - HTTP status code as string
- `title` - Short, human-readable summary
- `detail` - Specific error message
- `source` - Object with `pointer` (JSON pointer to error location) or `parameter` (query param name)

## Pagination with Pagy

Add Pagy to `Gemfile`:

```ruby
gem 'pagy'
```

Include in base controller:

```ruby
include Pagy::Backend
```

Use in index actions:

```ruby
def index
  pagy, records = pagy(scope, items: params.dig(:page, :size) || 25)

  render json: ResourceSerializer.new(
    records,
    meta: {
      page: pagy.page,
      per_page: pagy.items,
      total_pages: pagy.pages,
      total_count: pagy.count
    }
  ).serializable_hash
end
```

## Filtering Patterns

### Simple Filters

```ruby
def apply_filters(scope)
  return scope unless params[:filter].present?

  scope = scope.where(status: params[:filter][:status]) if params[:filter][:status]
  scope = scope.where(priority: params[:filter][:priority]) if params[:filter][:priority]

  scope
end
```

### Ransack Integration

```ruby
def index
  @q = Project.ransack(params[:filter])
  scope = @q.result

  pagy, projects = pagy(scope)
  render json: ProjectSerializer.new(projects).serializable_hash
end
```

### Custom Scopes

```ruby
def apply_filters(scope)
  scope = scope.active if params.dig(:filter, :active) == 'true'
  scope = scope.overdue if params.dig(:filter, :overdue) == 'true'
  scope = scope.search(params.dig(:filter, :search)) if params.dig(:filter, :search)

  scope
end
```

## Sorting Implementation

```ruby
def apply_sorting(scope)
  return scope.order(created_at: :desc) unless params[:sort].present?

  # Whitelist allowed sort fields
  allowed_sorts = %w[name status created_at updated_at priority]

  sort_fields = params[:sort].split(',').filter_map do |field|
    if field.start_with?('-')
      attr = field[1..]
      { attr => :desc } if allowed_sorts.include?(attr)
    else
      { field => :asc } if allowed_sorts.include?(field)
    end
  end

  sort_fields.any? ? scope.order(sort_fields) : scope
end
```

## Authorization with Pundit

Apply policies to all actions:

```ruby
def index
  authorize Project  # Check if user can list projects
  scope = policy_scope(Project).where(organization: current_organization)
  # ...
end

def show
  authorize @project  # Check if user can view this specific project
  # ...
end

def create
  @project = Project.new(project_params)
  authorize @project  # Check if user can create projects
  # ...
end
```

Policy example:

```ruby
class ProjectPolicy < ApplicationPolicy
  def index?
    user.present?
  end

  def show?
    user.present? && record.organization == user.organization
  end

  def create?
    user.admin?
  end

  class Scope < Scope
    def resolve
      scope.where(organization: user.organization)
    end
  end
end
```

## Nested Resources

```ruby
module Api
  module V1
    class TasksController < BaseController
      before_action :set_project

      def index
        authorize @project, :show?
        tasks = @project.tasks

        render json: TaskSerializer.new(tasks).serializable_hash
      end

      def create
        @task = @project.tasks.build(task_params)
        authorize @task

        if @task.save
          render json: TaskSerializer.new(@task).serializable_hash, status: :created
        else
          render json: { errors: format_errors(@task.errors) }, status: :unprocessable_entity
        end
      end

      private

      def set_project
        @project = Project.find(params[:project_id])
      end
    end
  end
end
```

## Versioning Strategy

Use namespace versioning:

```
app/controllers/api/v1/projects_controller.rb
app/controllers/api/v2/projects_controller.rb
```

Route to correct version:

```ruby
namespace :api do
  namespace :v1 do
    resources :projects
  end

  namespace :v2 do
    resources :projects
  end
end
```

## Rate Limiting

Use Rack::Attack or similar. Add to `config/initializers/rack_attack.rb`:

```ruby
Rack::Attack.throttle('api/ip', limit: 300, period: 5.minutes) do |req|
  req.ip if req.path.start_with?('/api/')
end
```

## Content Negotiation

Ensure API only responds to JSON:API content type:

```ruby
before_action :ensure_json_request

def ensure_json_request
  return if request.format.json?

  render_error(
    status: 406,
    title: 'Not Acceptable',
    detail: 'API only supports application/vnd.api+json'
  )
end
```

## CORS Configuration

Add `rack-cors` gem and configure:

```ruby
# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins '*'
    resource '/api/*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options],
      expose: ['Location']
  end
end
```
