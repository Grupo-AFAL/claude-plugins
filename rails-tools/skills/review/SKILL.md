---
name: dhh-review
description: This skill should be used when the user asks to "review code", "review this file", "check code quality", "DHH review", "review my changes", "review staged changes", "review branch", "is this code Rails-worthy", "check for anti-patterns", "review my PR", "code review this", "check conventions", or invokes /dhh-review with a file path, directory, glob pattern, --staged, or --branch. Runs automated checks and invokes the dhh-code-reviewer agent for Rails-worthiness evaluation.
context: fork
argument-hint: "[file|directory|glob|--staged|--branch]"
---

# Review Code for Quality Issues

Review existing code against 37signals/DHH standards and identify improvements.

## Persistence Mandate

**Never abandon this workflow mid-review.** Complete all steps in order. If a step fails or a tool is unavailable, document it in the report and continue to the next step. Do not stop until the final report has been presented to the user. Individual failures (missing tools, unreadable files, agent errors) are not reasons to halt — they are items to note.

## Usage

```
/dhh-review [target]
```

Where `[target]` is optional:
- **No argument (default):** Reviews all changes on current branch vs main (same as `--branch`)
- A file path (e.g., `app/models/card.rb`)
- A directory (e.g., `app/models/`)
- A glob pattern (e.g., `app/controllers/**/*.rb`)
- `--staged` to review staged git changes
- `--branch` to review all changes on current branch vs main (explicit)

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

Based on the argument (default is `--branch` when no argument provided):

1. **No argument or `--branch`**: Get files from `git diff main...HEAD --name-only`
2. **Single file**: Review that file
3. **Directory**: Review all Ruby/JS/ERB files in directory
4. **Glob pattern**: Review matching files
5. **`--staged`**: Get files from `git diff --staged --name-only`

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

### Step 3: Iterative Review-Fix Loop

This step repeats until the code receives a "Rails-worthy" verdict with zero Critical or Major issues, or the maximum pass count is reached.

#### Pass Structure

| Pass | Action |
|------|--------|
| Pass 1 | Initial review — identify all issues, auto-apply ALL Critical and Major fixes |
| Pass 2 | Re-review — verify fixes, catch new issues introduced by fixes, auto-apply |
| Pass 3 | Third review — deeper pattern analysis, consistency checks, auto-apply |
| Pass 4+ | Continue until "Rails-worthy" with zero Critical/Major issues |
| Pass 7 | Maximum — stop and report remaining issues |

#### Each Pass

1. **Invoke the `dhh-code-reviewer` agent** on the target files:
   - Pass the file contents (re-read files each pass to see latest state)
   - Pass any Rubocop/Brakeman issues from Step 2 (first pass only)
   - Request structured feedback with severity levels (Critical/Major/Minor/Info)
   - If the agent fails or returns an error: note the failure and continue

2. **Check verdict:**
   - If "Rails-worthy" with zero Critical and zero Major issues → exit loop, go to Step 4
   - If issues found → continue to fix phase

3. **Auto-apply all Critical and Major fixes:**
   - Apply refactored code for each issue the reviewer identified
   - Run Rubocop auto-fix on modified files:
     ```bash
     bin/rubocop -a [files]
     ```

4. **Verify fixes:**
   - Run tests to confirm nothing broke:
     ```bash
     bin/rails test
     ```
   - If a fix breaks tests, **revert that specific fix** and note it as "Fix reverted — breaks tests"

5. **Log the pass:**
   - Record: pass number, issues found, issues fixed, issues reverted, verdict
   - Proceed to next pass

#### Exit Conditions

- **Clean exit:** "Rails-worthy" verdict with zero Critical/Major issues → success
- **Max passes reached (7):** Stop iterating. Report remaining unfixed issues with explanation of why they persist (e.g., "reverted because it breaks tests", "requires architectural change beyond review scope")

### Step 4: Generate Final Report

Create a structured report covering ALL passes:

```markdown
# Code Review: [Scope]

## Summary
- Files reviewed: X
- Review passes: N
- Final verdict: [Rails-worthy / Needs work]
- Issues found (total): X
- Issues fixed: X
- Issues remaining: X

## Pass History

### Pass 1
- Issues found: X (Y Critical, Z Major, W Minor)
- Fixes applied: X
- Fixes reverted: X
- Verdict: [Needs work]

### Pass 2
- Issues found: X
- Fixes applied: X
- Verdict: [Needs work / Rails-worthy]

... (one section per pass)

## Automated Checks

### Rubocop
[List any offenses, or "Clean"]

### Brakeman
[List any security warnings, or "Clean"]

## Applied Fixes (Cumulative)
1. [File: description of fix] — Pass N
2. [File: description of fix] — Pass N
...

## Remaining Issues (if any)
[Issues that could not be auto-fixed, with explanation]

## What Works Well
[Positive observations from the reviewer]
```

### Step 5: Cleanup

Clear the state file:

```bash
rm -f .omc/state/dhh-review-state.json
```

**Done when**: Iterative loop complete (Rails-worthy or max passes), report generated, state file deleted. Review is complete.

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
- Uses Bali page components for full page layouts (IndexPage, ShowPage, FormPage, DashboardPage)
- Uses AppLayout in layout files for admin sidebar structure
- Uses Bali ViewComponents for UI elements (Card, DataTable, etc.)
- DaisyUI semantic classes via Bali (not raw HTML)
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
