---
name: implement
description: This skill should be used when the user asks to "implement a spec", "implement from spec", "build from architecture", "execute the plan", "implement feature from", or invokes /implement with a path to an approved architecture specification. Follows a structured phase-based approach with verification and DHH code review.
---

# Implement Feature from Specification

Implement a feature from an approved architecture specification with full verification.

## Usage

```
/implement <path-to-spec>
```

Where the argument is the path to an approved spec (e.g., `docs/plans/260110-01c-user-notifications.md`).

## Prerequisites

Before starting:

- Specification has been reviewed and approved
- Tests currently pass (`bin/rails test`)
- No uncommitted changes in working directory

Verify prerequisites before proceeding. If any fails, stop and inform the user.

## Workflow

### Phase 1: Setup

1. **Read the specification** thoroughly
2. **Create a todo list** with all implementation steps extracted from the spec
3. **Create a feature branch** if not already on one:
   ```bash
   git checkout -b feature/<feature-name>
   ```

### Phase 2: Implementation

For each todo item:

1. **Mark as in_progress**
2. **Implement the change**
3. **Run relevant tests** (`bin/rails test test/models/<model>_test.rb`)
4. **Fix any failures** (max 3 attempts per issue)
5. **Mark as completed**
6. **Commit the change** with descriptive message

### Phase 3: Verification

After all implementation complete:

```bash
bin/rails test              # All tests
bin/rails test:system       # System tests (if applicable)
bin/rubocop -a              # Lint with auto-fix
bin/brakeman --no-pager -q  # Security scan
```

All must pass before proceeding.

### Phase 4: Code Review

Invoke the `dhh-code-reviewer` agent on the implementation:

- Review all new/modified files
- Apply feedback
- Re-run verification suite

### Phase 5: Finalization

1. **Update CHANGELOG.md** with new feature (if project maintains one)
2. **Update relevant documentation** if needed
3. **Create PR summary** with:
   - What was implemented
   - Files changed
   - Verification results
   - DHH review status

## Failure Handling

### If Tests Fail

1. Analyze the failure
2. Attempt fix (max 3 attempts)
3. If still failing after 3 attempts:
   - Revert to last working state
   - Document the issue
   - Pause and ask the user for guidance

### If Rubocop Fails

1. Run `bin/rubocop -a` for auto-fix
2. Manually fix remaining issues
3. Re-run verification

### If Brakeman Finds Issues

1. Review each warning
2. Fix security issues (high priority)
3. Document any false positives with comments
4. Re-run verification

## Commit Strategy

Make small, focused commits:

```bash
# Good: Focused commits
git commit -m "Add Notification model with Notifiable concern"
git commit -m "Add NotificationsController with CRUD actions"
git commit -m "Add notification views and Turbo Streams"
git commit -m "Add tests for notification system"

# Bad: One giant commit
git commit -m "Add notification system"
```

## Safety Rules

1. **Never skip tests** -- Always verify after each step
2. **Never force push** -- Keep git history clean
3. **Never suppress errors** -- Fix them or escalate
4. **Never commit secrets** -- Check for .env files, credentials
5. **Always revert on failure** -- Don't leave broken state

## Integration

| Command | When to Use |
|---------|-------------|
| `/architecture` | Generate and refine spec with DHH reviews |
| `/implement` | Structured implementation from approved spec (this skill) |
| `/review` | Ad-hoc code review against DHH standards |
| `/omc-rails-autopilot` | Full autonomous flow with SmartSuite tracking |
