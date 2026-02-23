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
Phase 1.5: UI integration -- ensure new pages are reachable from the UI
Phase 2:   Iterative AI DHH reviews with auto-applied feedback (refactor phase)
Phase 2.5: Visual Verification -- E2E browser flows + documentation screenshots + visual quality review
Phase 3:   Quality gates (tests, rubocop, brakeman)
Phase 4:   Update CHANGELOG, commit, create PR, update SmartSuite status
Phase 4.5: Update documentation -- sync docs site with new feature, include screenshots
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

## Phase 1.5: UI Integration

Ensure new functionality is reachable from the application UI -- do not leave features accessible only by typing URLs manually.

1. Check if the story adds new routes with user-facing pages (index, show, or dedicated views)
2. If yes, find the project's navigation structure (sidebar partial, nav menu, parent show page) and add a link
3. Gate visibility behind authorization (e.g., `policy(:resource).index?` or role checks consistent with the project's Pundit policies)
4. For nested resources, link from the parent's show page rather than the global nav
5. Run tests to confirm nothing broke

**Exit criteria:** New pages are reachable from the UI without knowing the URL.

## Phase 2: Iterative AI Review (Refactor Phase)

Use the `dhh-code-reviewer` agent for the TDD refactor phase:

| Pass | Action |
|------|--------|
| Pass 1 | Initial review -- identify all violations, auto-apply ALL feedback |
| Pass 2 | Second review -- verify fixes, catch new issues, auto-apply feedback |
| Pass 3 | Third review -- re-examine patterns, ensure consistency |
| Pass 4 | Fourth review -- address any remaining subtle issues |
| Pass 5 | Fifth review -- approaching "Rails-worthy" target |
| Pass 6 | Sixth review -- must receive "Rails-worthy" verdict |
| Pass 7 | Final review -- escalate if still not approved |
| After 7 | Escalate -- do NOT commit unapproved code |

After each feedback application, run tests to confirm GREEN state is maintained.

## Phase 2.5: Visual Verification

Verify the feature works as a real user would experience it, then review and improve the visual quality of all new or modified interfaces. This phase combines E2E browser testing with UI quality review into a single visual pass.

See **`references/e2e-browser-testing.md`** for detailed patterns, authentication handling, and Turbo-specific guidance.

### 2.5.1 Server Setup

Start the development server for browser testing:

```bash
bin/rails server -p 3001 -e development -d --pid tmp/pids/server-e2e.pid
timeout 30 bash -c 'until curl -sf http://localhost:3001/up > /dev/null 2>&1; do sleep 1; done'
```

Check for a dev auth bypass if the app requires authentication -- see **`references/e2e-browser-testing.md`** for AFAL OmniAuth patterns.

### 2.5.2 E2E User Flow Testing

Use `agent-browser` to simulate the complete user journey from the story. Navigate from the application root, not by typing the URL directly.

**Before navigating:** Ensure the database has realistic sample data so screenshots reflect daily usage, not empty states. Create seed data via the Rails console or a targeted seed script:

```bash
bin/rails runner "
  # Create enough records to show the feature in realistic use
  # e.g. 3-5 representative records covering common variations
  # Scope to the test organization/user used in the browser session
"
```

Only skip seeding if the explicit purpose of a screenshot is to document the empty state (e.g. onboarding flow, zero-records message).

1. Navigate to the feature via the UI (sidebar, parent page, or nav link added in Phase 1.5)
2. Exercise all primary CRUD flows the story introduces:
   - **Create:** fill and submit the form, verify success feedback and data persisted
   - **Read:** verify index (including empty state) and show pages display correctly
   - **Update:** edit a record, verify changes reflected
   - **Delete:** if applicable, verify deletion and any confirmation dialogs
3. Take a screenshot at each major step:
   ```bash
   agent-browser screenshot --full tmp/screenshots/e2e-01-index.png
   agent-browser screenshot tmp/screenshots/e2e-02-new-form.png
   # ... continue per step
   ```
4. Re-snapshot after every Turbo navigation (refs are invalidated on page change):
   ```bash
   agent-browser wait --load networkidle
   agent-browser snapshot -i  # Always re-snapshot after navigation
   ```
5. Save documentation screenshots — select 2-4 key screens that best represent the feature for end users:
   ```bash
   mkdir -p docs/src/assets/screenshots/<story-id>
   cp tmp/screenshots/e2e-01-index.png docs/src/assets/screenshots/<story-id>/index.png
   cp tmp/screenshots/e2e-02-new-form.png docs/src/assets/screenshots/<story-id>/new-form.png
   # Choose the screens that show: list view, detail view, form, key interaction
   ```
   These are committed to the repo (not temp files) and will be included in the docs site during Phase 4.5.

**Exit criteria:** All primary user flows complete without errors; screenshots captured for every major screen; documentation screenshots saved to `docs/src/assets/screenshots/<story-id>/`.

### 2.5.3 Visual Quality Review

With screenshots and view files in hand, run a combined visual audit:

1. Run `/bali-view-audit` on all modified views -- apply all findings immediately
2. Invoke `/oh-my-claudecode:frontend-ui-ux` with the screenshots and view file paths:
   - Pass screenshot paths (e.g., `tmp/screenshots/e2e-*.png`) for visual context
   - Pass view file paths (e.g., `app/views/[resource]/`, `app/components/`) for code review
   - Review focus: layout/spacing, Bali component usage, empty states, form layout, responsive behavior
3. Apply all identified improvements, prioritizing Bali components and DaisyUI patterns

### 2.5.4 Teardown and Verification

```bash
# Stop dev server
kill $(cat tmp/pids/server-e2e.pid 2>/dev/null) 2>/dev/null || true
rm -f tmp/pids/server-e2e.pid

# Clean up screenshots (do not commit them)
rm -rf tmp/screenshots/e2e-*.png
```

Run tests to confirm GREEN state is maintained after UI improvements.

**Exit criteria:** All E2E flows pass without errors, visual review approved, Bali components used consistently, tests green.

## Phase 3: Quality Gates

Run ALL checks before committing. Pre-commit hooks enforce these:

```bash
bin/rails test              # All tests must pass
bin/rubocop -a              # Auto-fix, must be clean
bin/brakeman --no-pager -q  # No security warnings
```

All three gates must pass. If any fails, fix the issue and re-run.

## Phase 4: Commit & PR

1. **Update CHANGELOG.md** under `## [Unreleased]` (create the file if it doesn't exist):
   - Add a concise entry under the appropriate heading (`### Added`, `### Changed`, `### Fixed`)
   - Include the story ID in the entry
   - Follow the existing format if the file already has entries
   - Example: `- Roles and permissions system with JSONB-based access control (GC-FND-004-US02)`

2. **Commit** with conventional format:
   ```bash
   git commit -m "feat(STORY_ID): description

   Implements STORY_ID

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

3. **Push and create PR:**
   ```bash
   git push -u origin feature/STORY_ID
   gh pr create --title "feat(STORY_ID): title" --body "..."
   ```

**Do NOT update SmartSuite yet.** That happens after Phase 4.5 documentation is complete.

## Phase 4.5: Documentation Update

Update the project's Astro Starlight docs site to reflect the new feature. Skip this phase if `docs/astro.config.mjs` does not exist.

1. **Check for docs site:**
   ```bash
   ls docs/astro.config.mjs 2>/dev/null && echo "docs present" || echo "no docs — skip phase"
   ```

2. **Invoke `/update-docs`** — detects changed files from the branch, maps code areas to doc pages, reads actual source for accuracy, and updates or creates MDX pages in Spanish.

3. **Include screenshots** — if `docs/src/assets/screenshots/<story-id>/` was populated in Phase 2.5, reference the images in the relevant MDX pages:
   ```mdx
   ![Vista del listado](../../../assets/screenshots/gc-fnd-002-us01/index.png)

   ![Formulario de creación](../../../assets/screenshots/gc-fnd-002-us01/new-form.png)
   ```
   Place screenshots after the prose description of each screen, not at the top of the page. Use descriptive Spanish alt text.

4. **Verify build:**
   ```bash
   cd docs && bun run build
   ```
   Fix any errors before proceeding. Zero errors required.

5. **Commit docs separately** on the same feature branch:
   ```bash
   git add docs/
   git commit -m "docs(STORY_ID): update documentation with new feature"
   ```

6. **Update SmartSuite to `ready_for_review`** with the PR link — this is the FINAL step of the entire run and only happens here, after documentation is complete.

The docs commit is included in the same PR as the feature. Reviewers can see both the implementation and its documentation in a single review.

---

## ⛔ Mandatory Completion Checklist

**The run is NOT complete until every item below is checked. Do not declare done, do not stop, do not respond to the user with a summary until this checklist is fully verified.**

### Implementation
- [ ] Phase 0: Story fetched, status set to `in_progress`, git worktree created
- [ ] Phase 0.5: Failing tests written and confirmed RED
- [ ] Phase 1: All tests passing GREEN
- [ ] Phase 1.5: New pages reachable from the UI (not just by URL)
- [ ] Phase 2: DHH review completed, "Rails-worthy" verdict received
- [ ] Phase 2.5: E2E flows tested, documentation screenshots saved to `docs/src/assets/screenshots/<story-id>/`
- [ ] Phase 3: `bin/rails test` passes, rubocop clean, brakeman clean

### Delivery
- [ ] Phase 4: CHANGELOG updated, feature committed, PR created
- [ ] Phase 4.5: `/update-docs` run (or confirmed no `docs/` site exists), screenshots embedded, `bun run build` passes, docs committed
- [ ] Phase 4.5 final: SmartSuite updated to `ready_for_review` with PR link

**If any item is unchecked, return to that phase and complete it before proceeding.**

## Escalation

If after 7 review passes the code still is not approved:

1. Stop and document blockers
2. Create a GitHub issue with what was attempted, unresolved feedback, and files needing human review
3. Add a comment on the SmartSuite story with the escalation reason and GitHub issue link (there is no `blocked` status -- leave as `in_progress`)
4. Do NOT commit unapproved code

## Integration with Existing Commands

| Command | When to Use |
|---------|-------------|
| `/architecture` | Generate and refine spec with iterative DHH reviews |
| `/implement` | Structured implementation from approved spec |
| `/dhh-review` | Ad-hoc code review against DHH standards |
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
- **`references/e2e-browser-testing.md`** -- Server setup/teardown, OmniAuth bypass patterns, CRUD flow examples, screenshot workflow, and frontend-ui-ux integration guide
