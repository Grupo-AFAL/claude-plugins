# Example Autopilot Session

Complete walkthrough of the omc-rails-autopilot workflow processing a SmartSuite story.

## Full Session: Department Hierarchy Management

```
User: /omc-rails-autopilot: GC-FND-002-US01

=== Phase 0: Story Setup ===

Agent: Reading Necesidad de Software ID from CLAUDE.md...
       Project: Gobierno Corporativo (6972b393cbbe389c07f41770)

Agent: Fetching story GC-FND-002-US01 from SmartSuite...
       Title: Add department hierarchy management
       Module: Foundation (GC-FND)
       Necesidad de Software: Gobierno Corporativo (matches project)
       Status: backlog -> in_progress

Agent: Creating worktree at ../worktrees/feature/GC-FND-002-US01
       Generating .claude/TASK.md with story details

=== Phase 0.5: TDD Red Phase ===

Agent: Writing tests first...
       - test/models/department_test.rb
         * requires name (validation)
         * belongs to legal entity (association)
         * can have nested children via ancestry (business logic)
         * active scope excludes deactivated (scope)
       - test/controllers/departments_controller_test.rb
         * index lists departments (happy path)
         * create with valid params (happy path)
         * unauthorized user cannot create (authorization)
         * create with invalid params re-renders form (edge case)
       - test/fixtures/departments.yml (test data)

Agent: Running tests to confirm RED state...
       12 tests, 12 failures (expected - no implementation yet)

=== Phase 1: TDD Green Phase (OMC Autopilot) ===

Agent: Implementing to make tests pass...
       - Using ancestry gem for hierarchy
       - Creating Department model with OwnedByOrganization
       - Adding DepartmentsController with Pundit
       - Creating views with Bali ViewComponents

Agent: Running tests...
       12 tests, 0 failures (GREEN)

=== Phase 2: TDD Refactor Phase (AI DHH Reviews) ===

Agent: Invoking dhh-code-reviewer for Pass 1...
DHH Review: "DepartmentService is unnecessary. Move logic to concern.
            Also, the boolean 'is_active' should be a separate record."

Agent: Applying feedback...
       - Created Department::Hierarchical concern
       - Refactored to has_one :deactivation
       - Updated tests for new pattern
       Running tests... 14 tests, 0 failures (still GREEN)

Agent: Invoking dhh-code-reviewer for Pass 2...
DHH Review: "The concern looks good. But the controller has too many
            instance variables. Use a presenter or scope the queries."

Agent: Applying feedback...
       - Simplified controller with scoped queries
       Running tests... 14 tests, 0 failures (still GREEN)

Agent: Invoking dhh-code-reviewer for Pass 3...
DHH Review: "Rails-worthy. Clean use of ancestry and concerns.
            The scoped queries in the controller are idiomatic."

=== Phase 2.5: Visual Verification ===

Agent: Starting dev server for E2E browser testing...
       bin/rails server -p 3001 -e development -d --pid tmp/pids/server-e2e.pid
       Checking for auth bypass... found BYPASS_AUTH=true in .env.development
       BYPASS_AUTH=true bin/rails server -p 3001 -e development -d --pid tmp/pids/server-e2e.pid
       Server ready at http://localhost:3001

Agent: Running E2E user flow with agent-browser...

       Step 1 - Navigate from root
       agent-browser open http://localhost:3001/
       agent-browser snapshot -i
       # Found: "Departments" link in sidebar under Organization
       agent-browser find text "Departments" click
       agent-browser wait --load networkidle
       agent-browser screenshot --full tmp/screenshots/e2e-01-index-empty.png

       Step 2 - Create a department
       agent-browser find role button click --name "New Department"
       agent-browser wait --load networkidle
       agent-browser screenshot tmp/screenshots/e2e-02-new-form.png
       agent-browser snapshot -i
       # @e1 = name field, @e2 = parent dropdown, @e3 = Save button
       agent-browser fill @e1 "Engineering"
       agent-browser click @e3
       agent-browser wait --load networkidle
       agent-browser screenshot tmp/screenshots/e2e-03-after-create.png
       # Verified: "Department was successfully created" flash visible

       Step 3 - Show page
       agent-browser find text "Engineering" click
       agent-browser wait --load networkidle
       agent-browser screenshot --full tmp/screenshots/e2e-04-show-page.png

       Step 4 - Edit
       agent-browser find text "Edit" click
       agent-browser wait --load networkidle
       agent-browser snapshot -i
       agent-browser fill @e1 "Engineering & Product"
       agent-browser find role button click --name "Save"
       agent-browser wait --load networkidle
       agent-browser screenshot tmp/screenshots/e2e-05-after-update.png
       # Verified: name updated in page header

Agent: E2E flows passed. All screenshots captured.

Agent: Running bali-view-audit on modified views...
       app/views/departments/, app/components/department_*.rb
       Finding: Index uses raw <table> -- should use Bali::DataTableComponent
       Applying fix...

Agent: Invoking frontend-ui-ux with screenshots and view files...
       Screenshots: tmp/screenshots/e2e-*.png
       Views: app/views/departments/, app/components/department_header_component.rb
       Feedback: "Form fields need more vertical spacing. Department name field
                  should use Bali::FormComponent. Empty state on index lacks
                  an icon and call-to-action text."
       Applying improvements...
       Running tests... 14 tests, 0 failures (still GREEN)

Agent: Stopping dev server and cleaning up screenshots...
       kill $(cat tmp/pids/server-e2e.pid)
       rm -rf tmp/screenshots/e2e-*.png
       Phase 2.5 complete. Visual review approved.

=== Phase 3: Quality Gates ===

Agent: Running quality gates...
       - bin/rails test: 156 passed, 0 failed
       - bin/rubocop: 0 offenses
       - bin/brakeman: 0 warnings
       All gates passed.

=== Phase 4: Commit & PR ===

Agent: Creating commit...
       feat(GC-FND-002-US01): Add department hierarchy management

Agent: Pushing and creating PR...
       PR #12: feat(GC-FND-002-US01): Add department hierarchy management
       https://github.com/Grupo-AFAL/gobierno-corporativo/pull/12

Agent: Updating SmartSuite...
       Status: in_progress -> ready_for_review
       PR URL: linked

Agent: Done. Story GC-FND-002-US01 complete.
```

## Session with `next` Command

```
User: /omc-rails-autopilot: next

Agent: Reading Necesidad de Software ID from CLAUDE.md...
       Project: Gobierno Corporativo (6972b393cbbe389c07f41770)

Agent: Querying SmartSuite for next backlog story in this project...
       Filter: status=backlog AND necesidad_software=6972b393cbbe389c07f41770
       Found: GC-HRM-001-US03 - Employee onboarding checklist
       Status: backlog -> in_progress

       [Proceeds with same Phase 0-4 workflow]
```

## Escalation Example

```
Agent: Invoking dhh-code-reviewer for Pass 5...
DHH Review: "The polymorphic association here needs a fundamental
            rethink. This pattern doesn't fit Rails conventions."

Agent: 5 review passes exhausted without approval.
       Escalating...

       Created GitHub issue #45: "GC-FND-002-US01: Unresolved DHH feedback"
       - What was attempted: polymorphic Evidenceable concern
       - Unresolved feedback: association pattern needs rethink
       - Files needing human review: app/models/concerns/evidenceable.rb

       Adding comment to SmartSuite story...
       "Autopilot escalation: DHH review failed after 5 passes.
        See GitHub issue: https://github.com/Grupo-AFAL/gobierno-corporativo/issues/45"
       Status remains: in_progress

Agent: Story escalated. Human review needed.
```
