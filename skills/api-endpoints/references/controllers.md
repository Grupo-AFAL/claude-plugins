# API Controller Patterns

Detailed patterns for building API controllers in AFAL Rails applications.

## Base Controller

All API controllers inherit from a base that provides authentication, error handling, and rendering helpers:

```ruby
# app/controllers/api/v1/base_controller.rb
module Api
  module V1
    class BaseController < ActionController::API
      include Pagy::Backend
      include Pundit::Authorization
      include Authentication
      include ApiErrorHandling

      before_action :authenticate_user!

      after_action :verify_authorized, except: :index
      after_action :verify_policy_scoped, only: :index

      private

      def render_resource(resource, blueprint, view: :full, status: :ok)
        render json: {
          data: blueprint.render_as_hash(resource, view: view),
          meta: response_meta
        }, status: status
      end

      def render_collection(records, pagy, blueprint, view: :list)
        render json: {
          data: blueprint.render_as_hash(records, view: view),
          pagination: pagination_meta(pagy),
          meta: response_meta
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

      def response_meta
        { timestamp: Time.current.iso8601 }
      end
    end
  end
end
```

## Error Handling Concern

```ruby
# app/controllers/concerns/api_error_handling.rb
module ApiErrorHandling
  extend ActiveSupport::Concern

  included do
    rescue_from ActiveRecord::RecordNotFound, with: :not_found
    rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_content
    rescue_from ActionController::ParameterMissing, with: :bad_request
    rescue_from Pundit::NotAuthorizedError, with: :forbidden
  end

  private

  def not_found
    render json: {
      error: {
        code: "not_found",
        message: "Resource not found",
        request_id: request.request_id
      }
    }, status: :not_found
  end

  def unprocessable_content(exception)
    details = exception.record.errors.map do |error|
      { field: error.attribute.to_s, message: error.message }
    end

    render json: {
      error: {
        code: "validation_error",
        message: "The request could not be processed",
        details: details,
        request_id: request.request_id
      }
    }, status: :unprocessable_entity
  end

  def bad_request(exception)
    render json: {
      error: {
        code: "missing_parameter",
        message: "Required parameter missing: #{exception.param}",
        request_id: request.request_id
      }
    }, status: :bad_request
  end

  def forbidden
    render json: {
      error: {
        code: "forbidden",
        message: "You are not authorized to perform this action",
        request_id: request.request_id
      }
    }, status: :forbidden
  end
end
```

## CRUD Controller Pattern

Standard resource controller:

```ruby
# app/controllers/api/v1/projects_controller.rb
module Api
  module V1
    class ProjectsController < BaseController
      def index
        authorize Project
        scope = policy_scope(Project)
          .includes(:organization, :tasks)

        scope = scope.ransack(params[:q]).result if params[:q].present?
        scope = scope.order(created_at: :desc)

        pagy, records = pagy(scope, items: params[:per_page]&.to_i || 20)
        render_collection(records, pagy, ProjectBlueprint)
      end

      def show
        project = Project.find(params[:id])
        authorize project
        render_resource(project, ProjectBlueprint)
      end

      def create
        project = Project.new(project_params)
        project.organization = current_user.organization
        authorize project

        project.save!
        render_resource(project, ProjectBlueprint, status: :created)
      end

      def update
        project = Project.find(params[:id])
        authorize project

        project.update!(project_params)
        render_resource(project, ProjectBlueprint)
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
  end
end
```

## Nested Resource Controller

For resources nested under a parent:

```ruby
# app/controllers/api/v1/ingredients_controller.rb
module Api
  module V1
    class IngredientsController < BaseController
      before_action :set_recipe

      def index
        authorize @recipe, :show?
        scope = @recipe.ingredients.includes(:ingredient)

        if params[:ingredients_group_id]
          scope = scope.where(ingredients_group_id: params[:ingredients_group_id])
        end

        pagy, records = pagy(scope)
        render_collection(records, pagy, IngredientBlueprint)
      end

      def create
        ingredient = @recipe.ingredients.build(ingredient_params)
        authorize @recipe, :update?

        ingredient.save!
        render_resource(ingredient, IngredientBlueprint, status: :created)
      end

      private

      def set_recipe
        @recipe = Recipe.find(params[:recipe_id])
      end

      def ingredient_params
        params.require(:ingredient).permit(
          :ingredient_type, :ingredient_id,
          :gross_quantity_value, :gross_quantity_unit,
          :yield_percentage, :ingredients_group_id
        )
      end
    end
  end
end
```

## Route Configuration

```ruby
# config/routes.rb
namespace :api, defaults: { format: :json } do
  namespace :v1 do
    resources :projects
    resources :tasks

    resources :recipes do
      resources :ingredients
      resources :ingredients_groups
      resources :production_steps
    end
  end
end
```

## Rate Limiting

Use Rails built-in rate limiting:

```ruby
class Api::V1::BaseController < ActionController::API
  rate_limit to: 100, within: 1.minute,
    by: -> { current_user&.id || request.ip }
end
```

## Authentication for APIs

Token-based authentication for API endpoints:

```ruby
# app/controllers/concerns/api_authentication.rb
module ApiAuthentication
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_api_token!
  end

  private

  def authenticate_api_token!
    token = request.headers["Authorization"]&.remove("Bearer ")
    return head :unauthorized unless token

    @current_user = User.find_by(api_token: token)
    head :unauthorized unless @current_user
  end

  def current_user
    @current_user
  end
end
```

## Soft Delete Pattern

Archive instead of destroy:

```ruby
def destroy
  project = Project.find(params[:id])
  authorize project

  project.update!(archived_at: Time.current)
  head :no_content
end
```

## Sorting

Use Ransack sorts or explicit sort params:

```ruby
# Via Ransack: ?q[s]=created_at+desc
scope = scope.ransack(params[:q]).result

# Or explicit params: ?sort=created_at&sort_direction=desc
if params[:sort].present?
  direction = params[:sort_direction]&.downcase == "asc" ? :asc : :desc
  scope = scope.order(params[:sort] => direction)
end
```

## CORS Configuration

For external API clients:

```ruby
# Gemfile
gem 'rack-cors'

# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch("CORS_ORIGINS", "*")
    resource "/api/*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options],
      max_age: 3600
  end
end
```
