---
name: sentry-fix
description: Use when fixing Sentry issues, production errors, or when given Sentry issue IDs/URLs. Covers the full workflow from issue discovery through PR creation with code review.
---

# Sentry Issue Fix Skill

Fix production errors reported in Sentry with a systematic workflow that creates isolated worktrees, implements fixes, and submits reviewed PRs.

## When to Use

**Use when:**
- User provides Sentry issue IDs (e.g., `PROJECT-123`)
- User shares Sentry issue URLs
- User asks to "fix Sentry issues" or "fix production errors"
- User mentions error messages from Sentry

**Do NOT use for:**
- Local development errors (not in Sentry)
- Writing new features
- General debugging without Sentry context

## Workflow Overview

```
┌─────────────────┐
│ 1. DISCOVER     │ Find org, project, list issues
└────────┬────────┘
         ▼
┌─────────────────┐
│ 2. ANALYZE      │ Get issue details, stacktrace, context
└────────┬────────┘
         ▼
┌─────────────────┐
│ 3. ISOLATE      │ Create git worktree for the fix
└────────┬────────┘
         ▼
┌─────────────────┐
│ 4. FIX          │ Implement the solution
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. REVIEW       │ Run dhh-code-reviewer
└────────┬────────┘
         ▼
┌─────────────────┐
│ 6. VERIFY       │ Fix rubocop + ensure tests pass
└────────┬────────┘
         ▼
┌─────────────────┐
│ 7. VERSION      │ Bump version + add changelog entry
└────────┬────────┘
         ▼
┌─────────────────┐
│ 8. COMMIT & PR  │ Commit with issue ref, create PR
└─────────────────┘
```

## Step 1: Discover Issues

### Find Organization and Project

```bash
# Use Sentry MCP tools
mcp__sentry__find_organizations()
mcp__sentry__find_projects(organizationSlug='org-name')
```

### List Issues

```bash
# Search for issues in production
mcp__sentry__search_issues(
  organizationSlug='org-name',
  projectSlugOrId='project-name',
  naturalLanguageQuery='issues in production environment',
  limit=25
)
```

### Filter Options

| Filter | Example Query |
|--------|---------------|
| Environment | `issues in production environment` |
| Status | `unresolved issues` |
| Time | `issues from last 24 hours` |
| Impact | `issues affecting more than 100 users` |

## Step 2: Analyze Issue Details

### Get Full Issue Details

```bash
mcp__sentry__get_issue_details(
  organizationSlug='org-name',
  issueId='PROJECT-123',
  regionUrl='https://us.sentry.io'
)
```

### Key Information to Extract

| Field | What to Look For |
|-------|------------------|
| **Error Message** | The actual exception/error |
| **Culprit** | Controller#action or file causing error |
| **Stacktrace** | First-party code frames (ignore gems) |
| **Tags** | Environment, release, browser |
| **Request URL** | What endpoint was hit |
| **Occurrences** | How often it happens |

### Identify Root Cause

Focus on **first-party code** in the stacktrace:
- `app/` files are your code
- Gem/library frames show the call path but aren't the fix location

## Step 3: Create Isolated Worktree

### Worktree Setup

```bash
cd /path/to/repository
git worktree add /path/to/worktrees/fix-issue-name -b fix/issue-name-description main
```

### Naming Conventions

| Component | Format | Example |
|-----------|--------|---------|
| Branch | `fix/<issue-id>-<brief-description>` | `fix/project-123-route-error` |
| Worktree | `fix-<issue-id>` | `fix-project-123` |

### Multi-Repository Issues

If the culprit is in a different repo than where Sentry is configured:
1. Identify the correct repository from the stacktrace path
2. Create worktree in that repository
3. Note the relationship in the PR description

## Step 4: Implement the Fix

### Common Error Patterns

#### NameError: Uninitialized Constant

```ruby
# Problem: Class no longer exists (removed/renamed)
# Solution: Handle missing class gracefully

# Before
transaction.source.try(:name)

# After
def safe_polymorphic_name(record, association)
  type_value = record.public_send("#{association}_type")
  return if type_value.blank? || type_value.safe_constantize.nil?
  record.public_send(association)&.name
rescue NameError
  nil
end
```

#### ActionView::Template::Error: No route matches

```ruby
# Problem: Missing required route parameters
# Solution: Pass all required parameters to route helper

# Before (missing editable_version)
new_tenant_recipe_ingredient_path(@tenant, recipe)

# After
new_tenant_recipe_editable_version_ingredient_path(@tenant, recipe, editable_version)
```

#### UncaughtThrowError: uncaught throw :warden

```ruby
# Problem: Devise throws :warden in ActionCable where it can't be caught
# Solution: Rescue the throw in connection.rb

# Before
def connect
  self.current_user = env['warden'].user
end

# After
def connect
  self.current_user = find_verified_user
end

private

def find_verified_user
  env['warden'].user || reject_unauthorized_connection
rescue UncaughtThrowError
  reject_unauthorized_connection
end
```

#### Prawn::Errors::IncompatibleStringEncoding

```ruby
# Problem: UTF-8 characters can't be encoded to Windows-1252 (Prawn built-in fonts)
# Solution: Sanitize text before rendering

def sanitize_for_pdf(text)
  return '' if text.nil?

  # Replace known problematic characters
  text.to_s
    .gsub(/[\u2070-\u2079]/) { |c| c.ord - 0x2070 + 48 } # Superscripts
    .gsub(/[\u2080-\u2089]/) { |c| c.ord - 0x2080 + 48 } # Subscripts
    .encode('Windows-1252', invalid: :replace, undef: :replace, replace: '?')
    .encode('UTF-8')
end
```

## Step 5: Code Review

After implementing the fix, run the DHH code reviewer:

```bash
# Use the dhh-code-reviewer agent
Task(subagent_type='dhh-code-reviewer', prompt='Review the code changes in /path/to/worktree')
```

Address any feedback from the review before proceeding to version bump.

## Step 6: Verify Code Quality

**Always required before version bump:**

### Run Rubocop

```bash
# Run rubocop on changed files
bundle exec rubocop path/to/changed/files

# Auto-fix safe offenses
bundle exec rubocop -a path/to/changed/files

# If worktree bundle isn't set up, run from main repo
cd /path/to/main/repo && bundle exec rubocop /path/to/worktree/changed/files
```

Fix all rubocop offenses before proceeding. Common issues:
- Line length > 100 characters (break into multiple lines)
- Missing frozen string literal comment
- Trailing whitespace

### Run Tests

```bash
# Run relevant test files
bundle exec rspec spec/path/to/relevant_spec.rb

# Or run full test suite if changes are broad
bundle exec rspec
```

Ensure all tests pass before proceeding. If tests fail:
1. Fix the failing tests
2. Re-run rubocop (fixes may introduce new offenses)
3. Re-run tests to confirm

## Step 7: Version Bump and Changelog

**Always required before committing:**

### Bump Version

```ruby
# Find and update version file (common locations)
# lib/gem_name/version.rb
# config/initializers/version.rb
# VERSION file

# Increment patch version for bug fixes
# Before: 1.2.3
# After:  1.2.4
```

### Add Changelog Entry

Add entry to `CHANGELOG.md` under `[Unreleased]` or create new version section:

```markdown
## [Unreleased]

### Fixed
- Fix [brief description] ([PROJECT-123](https://sentry.io/issues/PROJECT-123))
```

**Changelog format:**
- Use [Keep a Changelog](https://keepachangelog.com) format
- Categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`
- Include Sentry issue link for traceability
- Keep entries concise but descriptive

## Step 8: Commit and Create PR

### Commit Message Format

```bash
git commit -m "$(cat <<'EOF'
Fix [brief description of the fix]

Fixes PROJECT-123

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### PR Body Template

```markdown
## Summary
[1-3 bullet points describing the bug and its impact on users]

## Error Explanation
[What was causing the error - include the actual error message]

**Error:** `ErrorClass: error message`

**Root Cause:** [Technical explanation of why this was happening]

## Solution
[How the fix addresses the root cause]

- [Change 1]
- [Change 2]

## Test Plan
- [ ] [How to verify the fix works]
- [ ] [Edge cases to check]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### Create PR

```bash
gh pr create --title "Fix [brief description]" --body "$(cat <<'EOF'
[PR body from template above]
EOF
)"
```

## Parallel Processing

When fixing multiple issues:

1. **Group by repository** - Issues in the same repo can share discovery
2. **Create worktrees in parallel** - Each issue gets its own worktree
3. **Dispatch parallel agents** - One agent per issue for independent fixes
4. **Review in parallel** - Run code reviewers concurrently

```
Issues:
├── Repo A
│   ├── ISSUE-1 → Worktree A1 → Agent 1
│   └── ISSUE-2 → Worktree A2 → Agent 2
└── Repo B
    └── ISSUE-3 → Worktree B1 → Agent 3
```

## Quick Reference

| Step | Tool/Command | Purpose |
|------|--------------|---------|
| Find orgs | `mcp__sentry__find_organizations` | List accessible orgs |
| Find projects | `mcp__sentry__find_projects` | List projects in org |
| List issues | `mcp__sentry__search_issues` | Find issues to fix |
| Get details | `mcp__sentry__get_issue_details` | Stacktrace, context |
| Create worktree | `git worktree add` | Isolate fix |
| Review | `dhh-code-reviewer` agent | Quality check before commit |
| Run rubocop | `bundle exec rubocop` | Fix linting offenses |
| Run tests | `bundle exec rspec` | Ensure tests pass |
| Bump version | Edit `version.rb` or `VERSION` | Increment patch version |
| Add changelog | Edit `CHANGELOG.md` | Document the fix |
| Create PR | `gh pr create` | Submit fix |

## Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Fixing in main branch | Always create worktree first |
| Skipping code review | Always run dhh-code-reviewer before verification |
| Skipping rubocop | Always run rubocop and fix all offenses |
| Skipping tests | Always run tests and ensure they pass |
| Missing version bump | Always increment patch version before commit |
| Missing changelog entry | Always add entry under `### Fixed` section |
| Missing issue reference | Include `Fixes PROJECT-123` in commit |
| Incomplete PR description | Use the template with error explanation |
| Not checking stacktrace | Focus on first-party `app/` frames |
| Generic fix | Address the specific root cause |

## Cleanup

After PR is merged:

```bash
# Remove worktree
git worktree remove /path/to/worktrees/fix-issue-name

# Delete local branch (if not auto-deleted)
git branch -d fix/issue-name-description
```
