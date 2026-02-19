---
name: dhh-review
description: This skill should be used when the user asks to "review code", "review this file", "check code quality", "DHH review", "review my changes", "review staged changes", "review branch", "is this code Rails-worthy", "check for anti-patterns", "review my PR", "code review this", "check conventions", or invokes /dhh-review with a file path, directory, glob pattern, --staged, or --branch. Runs automated checks and invokes the dhh-code-reviewer agent for Rails-worthiness evaluation.
---

# Review Code for Quality Issues

Review existing code against 37signals/DHH standards and identify improvements.

## Persistence Mandate

**Never abandon this workflow mid-review.** Complete all steps in order. If a step fails or a tool is unavailable, document it in the report and continue to the next step. Do not stop until the final report has been presented to the user. Individual failures (missing tools, unreadable files, agent errors) are not reasons to halt — they are items to note.

## Usage

```
/dhh-review <target>
```

Where `<target>` is:
- A file path (e.g., `app/models/card.rb`)
- A directory (e.g., `app/models/`)
- A glob pattern (e.g., `app/controllers/**/*.rb`)
- `--staged` to review staged git changes
- `--branch` to review all changes on current branch vs main

## Workflow

### Step 0: Activate Persistence

Run this immediately to create the state file that prevents the session from closing mid-review:

```bash
node -e "
const fs = require('fs');
fs.mkdirSync('.omc/state', { recursive: true });
fs.writeFileSync('.omc/state/dhh-review-state.json', JSON.stringify({
  active: true,
  started_at: new Date().toISOString(),
  target: process.argv[1],
  reinforcement_count: 0,
  last_checked_at: new Date().toISOString()
}, null, 2));
" -- "<TARGET>"
```

Replace `<TARGET>` with the actual review target (file path, `--staged`, `--branch`, etc.).

**Done when**: State file exists at `.omc/state/dhh-review-state.json`.

### Step 1: Identify Files to Review

Based on the argument:

1. **Single file**: Review that file
2. **Directory**: Review all Ruby/JS/ERB files in directory
3. **Glob pattern**: Review matching files
4. **`--staged`**: Get files from `git diff --staged --name-only`
5. **`--branch`**: Get files from `git diff main...HEAD --name-only`

**Done when**: You have a list of files to review. If no files match, report "No files found for target" and stop — this is the only valid early exit.

### Step 2: Pre-Analysis

Run automated checks. **If a tool is not installed or fails, skip it and note "tool unavailable" in the report — do not stop.**

```bash
# Run Rubocop on the files (skip if bin/rubocop not found)
bin/rubocop --format json [files]

# Run Brakeman for security (skip if bin/brakeman not found)
bin/brakeman --only-files [files] --format json
```

**Fallbacks:**
- `bin/rubocop` not found → try `bundle exec rubocop` → if still unavailable, note "Rubocop not configured" and continue
- `bin/brakeman` not found → try `bundle exec brakeman` → if still unavailable, note "Brakeman not configured" and continue
- Command exits with error → capture the error output, include it in the report, continue

**Done when**: Automated check results (or unavailability notes) are collected.

### Step 3: Invoke DHH Reviewer

For each file or logical group of files, invoke the `dhh-code-reviewer` agent:

- Pass the file contents
- Pass any Rubocop/Brakeman issues found
- Request structured feedback

**If the agent fails or returns an error**: Note the failure in the report, move to the next file. Do not abandon the entire review because one file's agent call failed.

**Done when**: All files have been reviewed by the agent (or have a documented failure note).

### Step 4: Generate Review Report

Create a structured report:

```markdown
# Code Review: [Scope]

## Summary
- Files reviewed: X
- Critical issues: X
- Improvements suggested: X
- Overall verdict: [Rails-worthy / Needs work / Major refactor needed]

## Automated Checks

### Rubocop
[List any offenses, or "Not configured / unavailable"]

### Brakeman
[List any security warnings, or "Not configured / unavailable"]

## DHH Review

### Critical Issues
[Issues that must be fixed]

### Suggested Improvements
[Enhancements for Rails-worthiness]

### What Works Well
[Positive observations]

## Specific File Feedback

### [filename]
[Detailed feedback for each file]

## Recommended Actions
1. [First priority fix]
2. [Second priority fix]
...
```

**Done when**: The report is fully written and presented to the user.

### Step 5: Offer to Apply Fixes

Ask the user:

> I found X issues. Would you like me to:
> 1. **Apply auto-fixes** (Rubocop -a, simple refactors)
> 2. **Generate refactored code** for critical issues
> 3. **Just provide the report** (no changes)

Wait for the user's response. Apply or skip fixes based on their answer.

Once the user's request is handled (fixes applied or declined), clear the state file:

```bash
rm -f .omc/state/dhh-review-state.json
```

**Done when**: User's fix preference handled and state file deleted. Review is complete.

## Review Categories

### Models
- Uses concerns for shared behavior
- Rich domain logic (not anemic)
- Proper scopes defined
- Callbacks are appropriate (data integrity only)
- No service object patterns
- State changes use separate records

### Controllers
- Thin controllers (< 10 lines per action)
- CRUD only (no custom actions)
- Proper authorization (Pundit)
- Uses Current attributes
- Responds to turbo_stream format

### Views/Components
- Uses Bali ViewComponents for complex UI
- DaisyUI semantic classes
- Proper Turbo Frame usage
- No inline JavaScript
- Accessible markup

### JavaScript
- Stimulus controllers focused
- Uses Values API
- Uses Targets API
- No jQuery patterns
- Proper event handling

### Tests
- Uses fixtures (not factories)
- Tests business logic
- Doesn't test framework
- Proper setup/teardown
- Current attributes set

## Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| **Critical** | Violates core principles | Must fix before merge |
| **Major** | Not Rails-worthy | Should fix |
| **Minor** | Could be improved | Nice to have |
| **Info** | Suggestions | Optional |

## Integration

Works with the full AFAL development workflow:

| Command | When to Use |
|---------|-------------|
| `/dhh-review` | Ad-hoc code review (this skill) |
| `/architecture` | Generate and refine spec with DHH reviews |
| `/implement` | Structured implementation from approved spec |
| `/omc-rails-autopilot` | Full autonomous flow with SmartSuite tracking |
