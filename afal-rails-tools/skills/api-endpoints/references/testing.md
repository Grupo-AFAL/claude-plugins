# API Testing Patterns

Integration test patterns for AFAL Rails API endpoints using Minitest and fixtures.

## Test File Organization

```
test/
  integration/
    api/
      v1/
        projects_controller_test.rb
        tasks_controller_test.rb
  fixtures/
    users.yml
    projects.yml
```

## Base Test Setup

```ruby
# test/test_helper.rb
class ActionDispatch::IntegrationTest
  include Pagy::Backend

  def api_headers(user = nil)
    headers = {
      "Content-Type" => "application/json",
      "Accept" => "application/json"
    }
    headers["Authorization"] = "Bearer #{user.api_token}" if user
    headers
  end

  def parsed_response
    JSON.parse(response.body)
  end

  def response_data
    parsed_response["data"]
  end

  def response_pagination
    parsed_response["pagination"]
  end

  def response_error
    parsed_response["error"]
  end
end
```

## CRUD Test Pattern

```ruby
# test/integration/api/v1/projects_controller_test.rb
class Api::V1::ProjectsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:alice)
    @project = projects(:alpha)
    @headers = api_headers(@user)
  end

  # === INDEX ===

  test "GET index returns paginated projects" do
    get api_v1_projects_path, headers: @headers

    assert_response :ok
    assert response_data.is_a?(Array)
    assert_not_nil response_pagination
    assert_equal 1, response_pagination["current_page"]
  end

  test "GET index filters by name" do
    get api_v1_projects_path,
      params: { q: { name_cont: "alpha" } },
      headers: @headers

    assert_response :ok
    assert response_data.all? { |p| p["name"].downcase.include?("alpha") }
  end

  test "GET index paginates results" do
    get api_v1_projects_path,
      params: { page: 1, per_page: 2 },
      headers: @headers

    assert_response :ok
    assert_equal 2, response_pagination["per_page"]
  end

  test "GET index scopes to user organization" do
    get api_v1_projects_path, headers: @headers

    assert_response :ok
    # Should not include projects from other organizations
    other_org_project = projects(:other_org_project)
    refute response_data.any? { |p| p["id"] == other_org_project.id }
  end

  # === SHOW ===

  test "GET show returns project details" do
    get api_v1_project_path(@project), headers: @headers

    assert_response :ok
    assert_equal @project.id, response_data["id"]
    assert_equal @project.name, response_data["name"]
  end

  test "GET show returns 404 for missing project" do
    get api_v1_project_path(id: 999999), headers: @headers

    assert_response :not_found
    assert_equal "not_found", response_error["code"]
  end

  # === CREATE ===

  test "POST create creates project" do
    assert_difference "Project.count" do
      post api_v1_projects_path,
        params: { project: { name: "New Project", status: "draft" } }.to_json,
        headers: @headers
    end

    assert_response :created
    assert_equal "New Project", response_data["name"]
  end

  test "POST create assigns user organization" do
    post api_v1_projects_path,
      params: { project: { name: "Org Project" } }.to_json,
      headers: @headers

    assert_response :created
    project = Project.find(response_data["id"])
    assert_equal @user.organization, project.organization
  end

  test "POST create returns validation errors" do
    post api_v1_projects_path,
      params: { project: { name: "" } }.to_json,
      headers: @headers

    assert_response :unprocessable_entity
    assert_equal "validation_error", response_error["code"]
    assert response_error["details"].any? { |d| d["field"] == "name" }
  end

  # === UPDATE ===

  test "PATCH update updates project" do
    patch api_v1_project_path(@project),
      params: { project: { name: "Updated Name" } }.to_json,
      headers: @headers

    assert_response :ok
    assert_equal "Updated Name", response_data["name"]
    assert_equal "Updated Name", @project.reload.name
  end

  # === DESTROY ===

  test "DELETE destroy removes project" do
    assert_difference "Project.count", -1 do
      delete api_v1_project_path(@project), headers: @headers
    end

    assert_response :no_content
  end

  # === AUTHENTICATION ===

  test "returns 401 without token" do
    get api_v1_projects_path

    assert_response :unauthorized
  end

  test "returns 401 with invalid token" do
    get api_v1_projects_path,
      headers: api_headers.merge("Authorization" => "Bearer invalid")

    assert_response :unauthorized
  end

  # === AUTHORIZATION ===

  test "returns 403 when unauthorized" do
    viewer = users(:viewer)  # User without create permission

    post api_v1_projects_path,
      params: { project: { name: "Unauthorized" } }.to_json,
      headers: api_headers(viewer)

    assert_response :forbidden
  end

  test "cannot access other organization projects" do
    other_project = projects(:other_org_project)

    get api_v1_project_path(other_project), headers: @headers

    assert_response :not_found  # Scoped query returns 404, not 403
  end
end
```

## Testing Nested Resources

```ruby
class Api::V1::IngredientsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:chef)
    @recipe = recipes(:carbonara)
    @ingredient = ingredients(:spaghetti)
    @headers = api_headers(@user)
  end

  test "GET index returns recipe ingredients" do
    get api_v1_recipe_ingredients_path(@recipe), headers: @headers

    assert_response :ok
    assert response_data.is_a?(Array)
  end

  test "GET index filters by group" do
    group = ingredients_groups(:main)

    get api_v1_recipe_ingredients_path(@recipe),
      params: { ingredients_group_id: group.id },
      headers: @headers

    assert_response :ok
    assert response_data.all? { |i| i["ingredients_group_id"] == group.id }
  end

  test "POST create adds ingredient to recipe" do
    item = items(:flour)

    assert_difference "@recipe.ingredients.count" do
      post api_v1_recipe_ingredients_path(@recipe),
        params: {
          ingredient: {
            ingredient_type: "Item",
            ingredient_id: item.id,
            gross_quantity_value: "500",
            gross_quantity_unit: "g"
          }
        }.to_json,
        headers: @headers
    end

    assert_response :created
  end
end
```

## Testing Sorting and Filtering

```ruby
test "GET index sorts by created_at desc" do
  get api_v1_projects_path,
    params: { q: { s: "created_at desc" } },
    headers: @headers

  assert_response :ok
  dates = response_data.map { |p| p["created_at"] }
  assert_equal dates, dates.sort.reverse
end

test "GET index filters by status" do
  get api_v1_projects_path,
    params: { q: { status_eq: "active" } },
    headers: @headers

  assert_response :ok
  assert response_data.all? { |p| p["status"] == "active" }
end

test "GET index combines filters" do
  get api_v1_projects_path,
    params: { q: { status_eq: "active", name_cont: "alpha" } },
    headers: @headers

  assert_response :ok
  response_data.each do |project|
    assert_equal "active", project["status"]
    assert_includes project["name"].downcase, "alpha"
  end
end
```

## Testing Response Structure

```ruby
test "index response has correct structure" do
  get api_v1_projects_path, headers: @headers

  assert_response :ok
  body = parsed_response

  # Top-level keys
  assert body.key?("data"), "Missing 'data' key"
  assert body.key?("pagination"), "Missing 'pagination' key"
  assert body.key?("meta"), "Missing 'meta' key"

  # Pagination keys
  pagination = body["pagination"]
  %w[current_page total_pages total_count per_page next_page prev_page].each do |key|
    assert pagination.key?(key), "Missing pagination key: #{key}"
  end

  # Meta keys
  assert body["meta"].key?("timestamp")
end

test "show response has correct structure" do
  get api_v1_project_path(@project), headers: @headers

  assert_response :ok
  body = parsed_response

  assert body.key?("data")
  assert body.key?("meta")
  refute body.key?("pagination")  # No pagination for single resource
end

test "error response has correct structure" do
  get api_v1_project_path(id: 0), headers: @headers

  assert_response :not_found
  error = response_error

  assert error.key?("code")
  assert error.key?("message")
  assert error.key?("request_id")
end
```

## Fixtures for API Tests

```yaml
# test/fixtures/users.yml
alice:
  email: alice@example.com
  name: Alice
  organization: acme
  api_token: <%= SecureRandom.hex(32) %>
  role: admin

viewer:
  email: viewer@example.com
  name: Viewer
  organization: acme
  api_token: <%= SecureRandom.hex(32) %>
  role: viewer

# test/fixtures/projects.yml
alpha:
  name: Project Alpha
  status: active
  organization: acme

other_org_project:
  name: Other Org Project
  status: active
  organization: other_co
```
