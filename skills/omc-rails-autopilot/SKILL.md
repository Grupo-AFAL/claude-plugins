---
name: omc-rails-autopilot
description: This skill should be used when the user asks to "start autopilot", "implement a story", "work on a SmartSuite story", "autonomous Rails development", "autopilot next story", or invokes /omc-rails-autopilot with a story ID or "next". Combines OMC orchestration with TDD, iterative AI reviews, and SmartSuite tracking.
---

# OMC Rails Autopilot

Fully autonomous Rails development workflow combining Oh-My-ClaudeCode orchestration with TDD, iterative AI code reviews, and SmartSuite backlog integration. This skill extends (not replaces) existing OMC setup and custom commands.

## Activation

**With a specific story:**
```
/omc-rails-autopilot: GC-FND-002-US01
```

**Fetch next ready story from backlog:**
```
/omc-rails-autopilot: next
```

**After architecture spec is approved:**
```
/omc-rails-autopilot: implement from docs/plans/260131-feature-spec.md
```

## Workflow Overview

```
Phase 0:   Fetch story from SmartSuite, update status, create git worktree
Phase 0.5: Write failing tests FIRST (TDD red phase) -- MANDATORY
Phase 1:   OMC autopilot implements to make tests pass (green phase)
Phase 2:   Iterative AI DHH reviews with auto-applied feedback (refactor phase)
Phase 3:   Quality gates (tests, rubocop, brakeman)
Phase 4:   Commit, create PR, update SmartSuite status
```

## Prerequisites

The project's CLAUDE.md must declare its SmartSuite project ID:

```markdown
## SmartSuite

- Necesidad de Software ID: `6972b393cbbe389c07f41770`
```

This scopes all story queries to the current project. Without it, the autopilot will stop and ask for configuration. See **`references/smartsuite.md`** for the full list of project IDs.

## Phase 0: Story Setup

If a story code is provided (e.g., `GC-FND-002-US01`):

1. Read the Necesidad de Software ID from the project's CLAUDE.md
2. Fetch story from SmartSuite by its `code` field -- see **`references/smartsuite.md`** for MCP calls
3. Verify the story belongs to this project (matching `necesidad_software`) -- warn if mismatched
4. Validate status is `backlog` -- stop if not
5. Update status to `in_progress` and set `branch_name`
6. Create git worktree for isolation:
   ```bash
   git worktree add ../worktrees/feature/GC-FND-002-US01
   ```
7. Generate `.claude/TASK.md` with story details in the worktree

If `next` is specified, query SmartSuite for the highest-priority `backlog` story **scoped to this project's Necesidad de Software** and proceed.

## Phase 0.5: TDD Red Phase (MANDATORY)

**Tests are written BEFORE implementation code. This is not optional.**

1. Analyze story requirements -- extract testable behaviors
2. Write model tests -- validations, associations, scopes, business logic
3. Write controller tests -- happy path, edge cases, authorization
4. Write system tests -- critical user flows only (if applicable)
5. Create fixtures for test data
6. Run tests -- confirm ALL new tests fail (RED state)

Invoke `/oh-my-claudecode:tdd` for test writing guidance. See **`references/tdd-patterns.md`** for AFAL-specific conventions and examples.

**Exit criteria:** All tests written and failing.

## Phase 1: Implementation (Green Phase)

Delegate to OMC autopilot to implement minimum code making all tests pass. Existing OMC-CLAUDE.md protocols apply (delegation-first, documentation-first, verification-before-completion).

**Goal:** Minimum code to reach GREEN state. Do not over-engineer.

## Phase 2: Iterative AI Review (Refactor Phase)

Use the `dhh-code-reviewer` agent for the TDD refactor phase:

| Pass | Action |
|------|--------|
| Pass 1 | Initial review -- identify all violations, auto-apply ALL feedback |
| Pass 2 | Second review -- verify fixes, catch new issues, auto-apply feedback |
| Pass 3 | Final review -- must receive "Rails-worthy" verdict |
| Pass 4-5 | If still not approved, continue applying feedback |
| After 5 | Escalate -- do NOT commit unapproved code |

After each feedback application, run tests to confirm GREEN state is maintained.

## Phase 3: Quality Gates

Run ALL checks before committing. Pre-commit hooks enforce these:

```bash
bin/rails test              # All tests must pass
bin/rubocop -a              # Auto-fix, must be clean
bin/brakeman --no-pager -q  # No security warnings
```

All three gates must pass. If any fails, fix the issue and re-run.

## Phase 4: Commit & PR

1. **Commit** with conventional format:
   ```bash
   git commit -m "feat(STORY_ID): description

   Implements STORY_ID

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

2. **Push and create PR:**
   ```bash
   git push -u origin feature/STORY_ID
   gh pr create --title "feat(STORY_ID): title" --body "..."
   ```

3. **Update SmartSuite** to `ready_for_review` with PR link

## Escalation

If after 5 review passes the code still is not approved:

1. Stop and document blockers
2. Create a GitHub issue with what was attempted, unresolved feedback, and files needing human review
3. Add a comment on the SmartSuite story with the escalation reason and GitHub issue link (there is no `blocked` status -- leave as `in_progress`)
4. Do NOT commit unapproved code

## Integration with Existing Commands

| Command | When to Use |
|---------|-------------|
| `/architecture` | Generate and refine spec with iterative DHH reviews |
| `/implement` | Structured implementation from approved spec |
| `/review` | Ad-hoc code review against DHH standards |
| `/omc-rails-autopilot` | Full autonomous flow with SmartSuite tracking |

Typical flow: `/architecture` to generate and refine a spec, then `/omc-rails-autopilot: STORY_ID` for autonomous implementation.

## AFAL Stack Constraints

Follow the project's CLAUDE.md constraints. Key rules:
- **Auth:** OmniAuth with AFAL IdP only (no Devise, no local passwords)
- **Stack:** Rails 8.1 + Hotwire, Solid Queue/Cache/Cable (not Redis), Minitest + Fixtures (not RSpec)
- **UI:** Bali ViewComponents (not raw ERB) -- use `bali-components` skill for API reference
- **Authorization:** Pundit with OwnedByOrganization scoping
- **Patterns:** CRUD resources, concerns for behavior, state as separate records

## Reference Files

- **`references/smartsuite.md`** -- SmartSuite MCP calls, table IDs, status flow, story ID format
- **`references/tdd-patterns.md`** -- Test writing conventions, model/controller/system test examples, fixture patterns
- **`references/example-session.md`** -- Complete walkthrough showing the full autopilot flow with a real story
