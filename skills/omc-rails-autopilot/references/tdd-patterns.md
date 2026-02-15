# TDD Patterns for AFAL Rails Projects

Test-Driven Development patterns and conventions for the autopilot workflow. Tests are written BEFORE implementation code -- this is mandatory, not optional.

## Test File Conventions

```
test/models/{model}_test.rb
test/controllers/{resource}_controller_test.rb
test/system/{feature}_test.rb
test/fixtures/{table_name}.yml
```

## What to Test by Layer

### Model Tests

Extract testable behaviors from story requirements:

```ruby
# test/models/department_test.rb
class DepartmentTest < ActiveSupport::TestCase
  # Validations
  test "requires name" do
    department = Department.new(name: nil)
    assert_not department.valid?
  end

  # Associations
  test "belongs to legal entity" do
    assert_respond_to departments(:engineering), :legal_entity
  end

  # Business logic (from story requirements)
  test "can have nested children via ancestry" do
    parent = departments(:engineering)
    child = Department.create!(
      name: "Backend",
      parent: parent,
      legal_entity: parent.legal_entity
    )
    assert_includes parent.children, child
  end

  # Scopes
  test "active scope excludes deactivated" do
    assert_not_includes Department.active, departments(:archived)
  end
end
```

### Controller Tests

Test CRUD operations, authorization, and edge cases:

```ruby
# test/controllers/departments_controller_test.rb
class DepartmentsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in users(:admin)
    @department = departments(:engineering)
  end

  # Happy path
  test "index lists departments" do
    get departments_path
    assert_response :success
  end

  test "create with valid params" do
    assert_difference("Department.count") do
      post departments_path, params: {
        department: { name: "New Dept", legal_entity_id: legal_entities(:acme).id }
      }
    end
    assert_redirected_to department_path(Department.last)
  end

  # Authorization (Pundit)
  test "unauthorized user cannot create" do
    sign_in users(:viewer)
    post departments_path, params: { department: { name: "Test" } }
    assert_response :forbidden
  end

  # Edge cases
  test "create with invalid params re-renders form" do
    post departments_path, params: { department: { name: "" } }
    assert_response :unprocessable_entity
  end
end
```

### System Tests

Only for critical user flows -- not every CRUD action needs a system test:

```ruby
# test/system/department_management_test.rb
class DepartmentManagementTest < ApplicationSystemTestCase
  test "admin creates a department with hierarchy" do
    sign_in users(:admin)
    visit departments_path

    click_on "New Department"
    fill_in "Name", with: "Engineering"
    select "ACME Corp", from: "Legal Entity"
    click_on "Create"

    assert_text "Department was successfully created"
    assert_text "Engineering"
  end
end
```

## Fixture Conventions

Use fixtures (not factories). Keep them minimal and meaningful:

```yaml
# test/fixtures/departments.yml
engineering:
  name: Engineering
  legal_entity: acme

archived:
  name: Old Department
  legal_entity: acme
  # deactivated via association or flag
```

## TDD Cycle in Autopilot

### Red Phase (Phase 0.5)
1. Analyze story requirements -- extract testable behaviors
2. Write model tests -- validations, associations, scopes, business logic
3. Write controller tests -- happy path, edge cases, authorization
4. Write system tests -- critical user flows only (if applicable)
5. Create fixtures for test data
6. Run tests -- confirm ALL new tests fail (RED state)

### Green Phase (Phase 1)
7. Implement minimum code to make all tests pass
8. Run tests -- confirm GREEN state

### Refactor Phase (Phase 2)
9. AI DHH review identifies improvements
10. Apply feedback, run tests after each change -- must stay GREEN
11. Repeat until review passes

## Exit Criteria

- **Red phase complete:** All tests written and failing
- **Green phase complete:** All tests passing with minimum implementation
- **Refactor phase complete:** DHH review approved, all tests still passing
