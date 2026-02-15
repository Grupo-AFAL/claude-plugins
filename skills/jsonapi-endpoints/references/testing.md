# Testing JSON:API Endpoints

Comprehensive testing patterns for JSON:API endpoints using Minitest and fixtures.

## Test File Structure

Place API tests in `test/integration/api/v1/`:

```
test/
  integration/
    api/
      v1/
        projects_test.rb
        tasks_test.rb
        organizations_test.rb
```

## Basic Test Setup

```ruby
require 'test_helper'

class Api::V1::ProjectsTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:alice)
    @organization = organizations(:acme)
    @user.update(organization: @organization)
    sign_in @user

    @project = projects(:website_redesign)
    @headers = {
      'Content-Type' => 'application/vnd.api+json',
      'Accept' => 'application/vnd.api+json'
    }
  end

  # Tests go here
end
```

## Helper Methods

Add to `test/test_helper.rb`:

```ruby
class ActionDispatch::IntegrationTest
  def json_response
    JSON.parse(response.body)
  end

  def jsonapi_headers
    {
      'Content-Type' => 'application/vnd.api+json',
      'Accept' => 'application/vnd.api+json'
    }
  end

  def jsonapi_request_body(type:, attributes:, relationships: {})
    {
      data: {
        type: type,
        attributes: attributes,
        relationships: relationships
      }
    }
  end

  def assert_jsonapi_response
    assert_equal 'application/vnd.api+json', response.content_type
  end

  def assert_jsonapi_resource(resource, type:, id: nil, attributes: {})
    assert_equal type, resource['type']
    assert_equal id.to_s, resource['id'] if id

    attributes.each do |key, value|
      assert_equal value, resource.dig('attributes', key.to_s),
        "Expected #{key} to be #{value}, got #{resource.dig('attributes', key.to_s)}"
    end
  end

  def assert_jsonapi_error(status:, title: nil)
    errors = json_response['errors']
    assert errors.present?, 'Expected errors in response'

    error = errors.first
    assert_equal status.to_s, error['status']
    assert_equal title, error['title'] if title
  end
end
```

## Testing Index Action

```ruby
test 'GET /api/v1/projects returns paginated projects' do
  get api_v1_projects_url, headers: @headers

  assert_response :success
  assert_jsonapi_response

  data = json_response['data']
  assert_instance_of Array, data
  assert data.any?

  # Verify resource structure
  project = data.first
  assert_jsonapi_resource project, type: 'projects'
  assert project['attributes']['name'].present?

  # Verify pagination meta
  meta = json_response['meta']
  assert meta['page'].present?
  assert meta['total_count'].present?

  # Verify pagination links
  links = json_response['links']
  assert links['self'].present?
  assert links['first'].present?
end

test 'GET /api/v1/projects filters by status' do
  get api_v1_projects_url,
      params: { filter: { status: 'active' } },
      headers: @headers

  assert_response :success

  data = json_response['data']
  data.each do |project|
    assert_equal 'active', project.dig('attributes', 'status')
  end
end

test 'GET /api/v1/projects sorts by name descending' do
  get api_v1_projects_url,
      params: { sort: '-name' },
      headers: @headers

  assert_response :success

  names = json_response['data'].map { |p| p.dig('attributes', 'name') }
  assert_equal names.sort.reverse, names
end

test 'GET /api/v1/projects paginates with custom page size' do
  get api_v1_projects_url,
      params: { page: { number: 1, size: 10 } },
      headers: @headers

  assert_response :success

  meta = json_response['meta']
  assert_equal 10, meta['per_page']
end
```

## Testing Show Action

```ruby
test 'GET /api/v1/projects/:id returns project' do
  get api_v1_project_url(@project), headers: @headers

  assert_response :success
  assert_jsonapi_response

  data = json_response['data']
  assert_jsonapi_resource data,
    type: 'projects',
    id: @project.id,
    attributes: { 'name' => @project.name }

  # Verify relationships
  assert data['relationships'].present?
  assert data['relationships']['organization'].present?
end

test 'GET /api/v1/projects/:id with invalid id returns 404' do
  get api_v1_project_url(id: 'nonexistent'), headers: @headers

  assert_response :not_found
  assert_jsonapi_error status: 404, title: 'Not Found'
end

test 'GET /api/v1/projects/:id includes related resources' do
  get api_v1_project_url(@project),
      params: { include: 'organization,tasks' },
      headers: @headers

  assert_response :success

  # Verify included section
  included = json_response['included']
  assert included.present?

  types = included.map { |r| r['type'] }.uniq
  assert_includes types, 'organizations'
  assert_includes types, 'tasks'
end

test 'GET /api/v1/projects/:id with sparse fieldsets returns only requested fields' do
  get api_v1_project_url(@project),
      params: { fields: { projects: 'name,status' } },
      headers: @headers

  assert_response :success

  attributes = json_response.dig('data', 'attributes')
  assert attributes.key?('name')
  assert attributes.key?('status')
  assert_not attributes.key?('description')
end
```

## Testing Create Action

```ruby
test 'POST /api/v1/projects creates project' do
  attributes = {
    name: 'New Project',
    description: 'Project description',
    status: 'active'
  }

  body = jsonapi_request_body(
    type: 'projects',
    attributes: attributes
  )

  assert_difference 'Project.count', 1 do
    post api_v1_projects_url,
         params: body.to_json,
         headers: @headers
  end

  assert_response :created
  assert_jsonapi_response

  # Verify Location header
  assert response.headers['Location'].present?

  data = json_response['data']
  assert_jsonapi_resource data,
    type: 'projects',
    attributes: { 'name' => 'New Project' }

  # Verify record created
  project = Project.last
  assert_equal 'New Project', project.name
  assert_equal @organization, project.organization
end

test 'POST /api/v1/projects with invalid data returns errors' do
  body = jsonapi_request_body(
    type: 'projects',
    attributes: { name: '' }  # Name is required
  )

  assert_no_difference 'Project.count' do
    post api_v1_projects_url,
         params: body.to_json,
         headers: @headers
  end

  assert_response :unprocessable_entity

  errors = json_response['errors']
  assert errors.present?

  error = errors.first
  assert_equal '422', error['status']
  assert_equal 'Validation failed', error['title']
  assert error['detail'].include?("can't be blank")
  assert_equal '/data/attributes/name', error.dig('source', 'pointer')
end

test 'POST /api/v1/projects with relationships creates associations' do
  body = jsonapi_request_body(
    type: 'projects',
    attributes: { name: 'Project with Owner' },
    relationships: {
      owner: {
        data: { type: 'users', id: @user.id }
      }
    }
  )

  post api_v1_projects_url,
       params: body.to_json,
       headers: @headers

  assert_response :created

  project = Project.last
  assert_equal @user, project.owner
end
```

## Testing Update Action

```ruby
test 'PATCH /api/v1/projects/:id updates project' do
  body = jsonapi_request_body(
    type: 'projects',
    attributes: { name: 'Updated Name' }
  )

  patch api_v1_project_url(@project),
        params: body.to_json,
        headers: @headers

  assert_response :success
  assert_jsonapi_response

  data = json_response['data']
  assert_equal 'Updated Name', data.dig('attributes', 'name')

  @project.reload
  assert_equal 'Updated Name', @project.name
end

test 'PATCH /api/v1/projects/:id with invalid data returns errors' do
  body = jsonapi_request_body(
    type: 'projects',
    attributes: { name: '' }
  )

  patch api_v1_project_url(@project),
        params: body.to_json,
        headers: @headers

  assert_response :unprocessable_entity
  assert_jsonapi_error status: 422
end
```

## Testing Destroy Action

```ruby
test 'DELETE /api/v1/projects/:id destroys project' do
  assert_difference 'Project.count', -1 do
    delete api_v1_project_url(@project), headers: @headers
  end

  assert_response :no_content
  assert response.body.blank?
end

test 'DELETE /api/v1/projects/:id with invalid id returns 404' do
  delete api_v1_project_url(id: 'nonexistent'), headers: @headers

  assert_response :not_found
end
```

## Testing Authorization

```ruby
test 'GET /api/v1/projects requires authentication' do
  sign_out @user

  get api_v1_projects_url, headers: @headers

  assert_response :unauthorized
end

test 'GET /api/v1/projects/:id from different organization returns forbidden' do
  other_org = organizations(:other_company)
  other_project = projects(:other_project)
  other_project.update(organization: other_org)

  get api_v1_project_url(other_project), headers: @headers

  assert_response :forbidden
  assert_jsonapi_error status: 403, title: 'Forbidden'
end

test 'POST /api/v1/projects as non-admin returns forbidden' do
  @user.update(role: 'member')

  body = jsonapi_request_body(
    type: 'projects',
    attributes: { name: 'New Project' }
  )

  post api_v1_projects_url,
       params: body.to_json,
       headers: @headers

  assert_response :forbidden
end

test 'DELETE /api/v1/projects/:id owned by different org returns forbidden' do
  other_project = projects(:other_org_project)

  delete api_v1_project_url(other_project), headers: @headers

  assert_response :forbidden
end
```

## Testing Content Type Validation

```ruby
test 'POST with wrong content type returns 415' do
  post api_v1_projects_url,
       params: { name: 'Test' }.to_json,
       headers: { 'Content-Type' => 'application/json' }

  assert_response :unsupported_media_type
  assert_jsonapi_error status: 415
end

test 'GET accepts requests without JSON:API content type' do
  get api_v1_projects_url,
      headers: { 'Accept' => 'application/vnd.api+json' }

  assert_response :success
end
```

## Fixture Setup for API Tests

Create fixtures in `test/fixtures/`:

```yaml
# projects.yml
website_redesign:
  name: Website Redesign
  status: active
  description: Redesign company website
  organization: acme
  owner: alice

mobile_app:
  name: Mobile App
  status: planning
  organization: acme
  owner: bob

other_org_project:
  name: Other Project
  status: active
  organization: other_company
  owner: charlie

# organizations.yml
acme:
  name: ACME Corp

other_company:
  name: Other Company

# users.yml
alice:
  email: alice@example.com
  role: admin
  organization: acme

bob:
  email: bob@example.com
  role: member
  organization: acme

charlie:
  email: charlie@example.com
  role: admin
  organization: other_company
```

## Testing Nested Resources

```ruby
class Api::V1::TasksTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:alice)
    @project = projects(:website_redesign)
    sign_in @user
    @headers = jsonapi_headers
  end

  test 'GET /api/v1/projects/:project_id/tasks returns project tasks' do
    get api_v1_project_tasks_url(@project), headers: @headers

    assert_response :success

    data = json_response['data']
    data.each do |task|
      # Verify all tasks belong to the project
      assert_equal @project.id.to_s,
        task.dig('relationships', 'project', 'data', 'id')
    end
  end

  test 'POST /api/v1/projects/:project_id/tasks creates task' do
    body = jsonapi_request_body(
      type: 'tasks',
      attributes: { title: 'New Task' }
    )

    assert_difference '@project.tasks.count', 1 do
      post api_v1_project_tasks_url(@project),
           params: body.to_json,
           headers: @headers
    end

    assert_response :created

    task = @project.tasks.last
    assert_equal 'New Task', task.title
  end
end
```

## Testing Pagination Edge Cases

```ruby
test 'GET /api/v1/projects with page beyond total returns empty array' do
  get api_v1_projects_url,
      params: { page: { number: 999 } },
      headers: @headers

  assert_response :success
  assert_equal [], json_response['data']
end

test 'GET /api/v1/projects caps page size at maximum' do
  get api_v1_projects_url,
      params: { page: { size: 999 } },
      headers: @headers

  assert_response :success

  # Assuming max is 100
  assert json_response['data'].length <= 100
end
```

## Testing Error Scenarios

```ruby
test 'handles internal server errors gracefully' do
  # Stub to raise error
  Project.stub :all, -> { raise StandardError.new('Database error') } do
    get api_v1_projects_url, headers: @headers

    assert_response :internal_server_error
    assert_jsonapi_error status: 500
  end
end

test 'validates required attributes' do
  body = jsonapi_request_body(type: 'projects', attributes: {})

  post api_v1_projects_url,
       params: body.to_json,
       headers: @headers

  assert_response :unprocessable_entity

  errors = json_response['errors']
  assert errors.any? { |e| e['detail'].include?('Name') }
end
```

## Performance Testing

```ruby
test 'index action avoids N+1 queries' do
  # Create multiple projects with associations
  5.times { projects(:website_redesign).dup.save! }

  # Should not exceed certain number of queries
  assert_queries_count(3) do  # Adjust based on includes
    get api_v1_projects_url,
        params: { include: 'organization' },
        headers: @headers
  end
end
```

## Custom Assertions

Add to `test/test_helper.rb`:

```ruby
def assert_queries_count(count, &block)
  queries = []
  counter = ->(*, **) { queries << 1 }

  ActiveSupport::Notifications.subscribed(counter, 'sql.active_record', &block)

  assert_equal count, queries.size,
    "Expected #{count} queries, got #{queries.size}"
end
```
