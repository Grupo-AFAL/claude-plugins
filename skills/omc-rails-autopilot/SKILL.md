---
name: omc-rails-autopilot
description: Autonomous Rails development combining OMC orchestration with iterative AI DHH reviews and SmartSuite story tracking. Works alongside existing /architecture, /implement, /review commands.
---

# OMC Rails Autopilot

Fully autonomous development combining Oh-My-ClaudeCode orchestration with iterative AI code reviews and SmartSuite backlog integration.

**This skill extends (not replaces) the existing OMC setup and custom commands.**

## Workflow

```
SmartSuite: Fetch story (status = backlog)
     ↓
SmartSuite: Update status → in_progress
     ↓
Git: Create worktree for isolation
     ↓
TDD: Write failing tests FIRST (red phase)
     ↓
OMC autopilot: implement to make tests pass (green phase)
     ↓
AI DHH Review Pass 1 → auto-apply feedback (refactor phase)
     ↓
AI DHH Review Pass 2 → auto-apply feedback
     ↓
AI DHH Review Pass 3 → must pass or escalate
     ↓
Quality gates (tests, rubocop, brakeman)
     ↓
Git: Commit with proper message
     ↓
GitHub: Create PR
     ↓
SmartSuite: Update status → ready_for_review + link PR
```

## Activation

**With SmartSuite story:**
```
/omc-rails-autopilot: GC-FND-002-US01
```

**Fetch next ready story:**
```
/omc-rails-autopilot: next
```

**Combines with existing commands:**
```
# Use /architecture for spec, then autopilot for implementation
/architecture docs/requirements/feature.md
# After spec approved:
autopilot: implement from docs/plans/260131-feature-spec.md --with-reviews
```

## SmartSuite Integration

### Story Configuration

| Field | Value |
|-------|-------|
| Solution | Requerimientos de Sistemas |
| Table | Historias de Usuario |
| Table ID | `697d2c6ff917d0e2b5cd6271` |

### Story Status Flow

| Status | When |
|--------|------|
| `backlog` | Story is ready to be picked up |
| `in_progress` | Set when starting work |
| `ready_for_review` | Set after PR is created |
| `complete` | Set after PR is merged |

### MCP Calls

```
# Fetch story
mcp: smartsuite.get_record(table: "697d2c6ff917d0e2b5cd6271", id: STORY_ID)

# Update to in_progress
mcp: smartsuite.update_record(table: "697d2c6ff917d0e2b5cd6271", id: STORY_ID,
     data: {status: "in_progress"})

# Update to ready_for_review
mcp: smartsuite.update_record(table: "697d2c6ff917d0e2b5cd6271", id: STORY_ID,
     data: {status: "ready_for_review", pr_url: PR_URL})
```

## Process

### Phase 0: Story Setup

If a story ID is provided (e.g., `GC-FND-002-US01`):

1. **Fetch story from SmartSuite**
2. **Validate status is `backlog`**
3. **Update status to `in_progress`**
4. **Create git worktree:**
   ```bash
   git worktree add ../worktrees/feature/GC-FND-002-US01
   ```
5. **Generate `.claude/TASK.md`** with story details

### Phase 0.5: TDD - Write Tests First (Red Phase)

**MANDATORY: Tests are written BEFORE implementation code.**

Invoke `/oh-my-claudecode:tdd` or delegate to `tdd-guide` agent:

1. **Analyze story requirements** - Extract testable behaviors
2. **Write model tests** - Validations, associations, scopes, business logic
3. **Write controller tests** - Happy path, edge cases, authorization
4. **Write system tests** - Critical user flows (if applicable)
5. **Verify tests fail** - All new tests must be RED before proceeding

**Test file conventions:**
```
test/models/{model}_test.rb
test/controllers/{resource}_controller_test.rb
test/system/{feature}_test.rb
```

**Example test structure:**
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
    child = Department.create!(name: "Backend", parent: parent, legal_entity: parent.legal_entity)
    assert_includes parent.children, child
  end
end
```

**Exit criteria:** All tests written and failing (RED state confirmed).

### Phase 1: Implementation (OMC Autopilot - Green Phase)

Let Oh-My-ClaudeCode handle implementation **to make the tests pass**. The existing OMC-CLAUDE.md protocols apply:
- Delegation-first (RULE 1-5)
- Documentation-first development
- Verification-before-completion

**Goal:** Write the minimum code to make all tests GREEN.

### Phase 2: Iterative AI Review (Refactor Phase - 3+ Passes)

Use the existing `dhh-code-reviewer` agent for the TDD "refactor" phase:

**Pass 1:** Initial review - identify all violations, apply ALL feedback
**Pass 2:** Second review - verify fixes, catch new issues, apply feedback
**Pass 3:** Final review - must receive "Rails-worthy" verdict

If not approved after Pass 3, continue until Pass 5 max, then escalate.

### Phase 3: Quality Gates

Run ALL checks (pre-commit hook enforces this):

```bash
bin/rails test              # All tests must pass
bin/rubocop -a              # Auto-fix, must be clean
bin/brakeman --no-pager -q  # No security warnings
```

### Phase 4: Commit & PR

1. **Commit:**
```bash
git commit -m "feat(GC-FND-002-US01): description

Implements GC-FND-002-US01

Co-Authored-By: Claude <noreply@anthropic.com>"
```

2. **Push and create PR:**
```bash
git push -u origin feature/GC-FND-002-US01
gh pr create --title "feat(GC-FND-002-US01): title" --body "..."
```

3. **Update SmartSuite** to `ready_for_review` with PR link

## Integration with Existing Commands

This skill works alongside, not instead of, existing commands:

| Command | When to Use |
|---------|-------------|
| `/architecture` | Spec phase with DHH review iterations |
| `/implement` | Manual implementation from spec |
| `/review` | Ad-hoc code review |
| `/test` | Generate tests |
| `/omc-rails-autopilot` | Full autonomous flow with SmartSuite |

**Typical flow:**
1. `/architecture` - Generate and refine spec (if needed)
2. `/omc-rails-autopilot: STORY_ID` - Autonomous implementation

## Proyecto-Specific Constraints

These constraints from CLAUDE.md are MANDATORY:

### Authentication
- Use OmniAuth with AFAL IdP ONLY
- NO local password auth
- NO Devise

### Stack
| Use | Don't Use |
|-----|-----------|
| Rails 8.1 + Hotwire | SPAs |
| Solid Queue/Cache/Cable | Redis |
| Minitest + Fixtures | RSpec + FactoryBot |
| Pundit | CanCanCan |
| ViewComponent + Bali | Raw ERB partials |
| OmniAuth + IdP | Devise |

### Patterns
- CRUD resources for state changes
- Concerns for behavior (Evidenceable, Auditable, etc.)
- State as separate records
- OwnedByOrganization scoping

## Example Session

```
User: /omc-rails-autopilot: GC-FND-002-US01

Agent: Fetching story GC-FND-002-US01 from SmartSuite...
       Title: Add department hierarchy management
       Module: Foundation (GC-FND)
       Status: backlog → in_progress

Agent: Creating worktree at ../worktrees/feature/GC-FND-002-US01

Agent: [TDD RED PHASE] Writing tests first...
       - test/models/department_test.rb (validations, ancestry, scopes)
       - test/controllers/departments_controller_test.rb (CRUD, authorization)
       - test/fixtures/departments.yml (test data)

Agent: Running tests to confirm RED state...
       - 12 tests, 12 failures (expected - no implementation yet)

Agent: [TDD GREEN PHASE] Implementing to make tests pass...
       - Using ancestry gem for hierarchy
       - Creating Department model with OwnedByOrganization
       - Adding DepartmentsController with Pundit

Agent: Running tests...
       - 12 tests, 0 failures (GREEN)

Agent: [TDD REFACTOR PHASE] Invoking dhh-code-reviewer for Pass 1...
DHH Review: "DepartmentService is unnecessary. Move logic to concern."

Agent: [Applies feedback - creates Department::Hierarchical concern]
       Running tests... 12 tests, 0 failures (still GREEN)

Agent: Invoking dhh-code-reviewer for Pass 2...
DHH Review: "The boolean 'is_active' should be a separate record."

Agent: [Refactors to has_one :deactivation, updates tests]
       Running tests... 14 tests, 0 failures (still GREEN)

Agent: Invoking dhh-code-reviewer for Pass 3...
DHH Review: "Rails-worthy. Clean use of ancestry and concerns."

Agent: Running quality gates...
       - bin/rails test: 156 passed, 0 failed
       - bin/rubocop: 0 offenses
       - bin/brakeman: 0 warnings

Agent: Creating PR...
       PR #12: feat(GC-FND-002-US01): Add department hierarchy management
       https://github.com/Grupo-AFAL/gobierno-corporativo/pull/12

Agent: Updating SmartSuite...
       Status: in_progress → ready_for_review
       PR URL: linked

Agent: Done. Story GC-FND-002-US01 complete.
```

## Escalation

If after 5 review passes the code still isn't approved:

1. Stop and document blockers
2. Create GitHub issue with:
   - What was attempted
   - Unresolved DHH feedback
   - Files needing human review
3. Update SmartSuite status to `blocked`
4. Do NOT commit unapproved code
