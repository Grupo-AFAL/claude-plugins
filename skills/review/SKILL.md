---
name: review
description: This skill should be used when the user asks to "review code", "review this file", "check code quality", "DHH review", "review my changes", "review staged changes", "review branch", or invokes /review with a file path, directory, glob pattern, --staged, or --branch. Runs automated checks and invokes the dhh-code-reviewer agent for Rails-worthiness evaluation.
---

# Review Code for Quality Issues

Review existing code against 37signals/DHH standards and identify improvements.

## Usage

```
/review <target>
```

Where `<target>` is:
- A file path (e.g., `app/models/card.rb`)
- A directory (e.g., `app/models/`)
- A glob pattern (e.g., `app/controllers/**/*.rb`)
- `--staged` to review staged git changes
- `--branch` to review all changes on current branch vs main

## Workflow

### Step 1: Identify Files to Review

Based on the argument:

1. **Single file**: Review that file
2. **Directory**: Review all Ruby/JS/ERB files in directory
3. **Glob pattern**: Review matching files
4. **`--staged`**: Get files from `git diff --staged --name-only`
5. **`--branch`**: Get files from `git diff main...HEAD --name-only`

### Step 2: Pre-Analysis

Run automated checks first:

```bash
# Run Rubocop on the files
bin/rubocop --format json [files]

# Run Brakeman for security
bin/brakeman --only-files [files] --format json
```

Collect any issues found.

### Step 3: Invoke DHH Reviewer

For each file or logical group of files, invoke the `dhh-code-reviewer` agent:

- Pass the file contents
- Pass any Rubocop/Brakeman issues found
- Request structured feedback

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
[List any offenses]

### Brakeman
[List any security warnings]

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

### Step 5: Offer to Apply Fixes

Ask the user:

> I found X issues. Would you like me to:
> 1. **Apply auto-fixes** (Rubocop -a, simple refactors)
> 2. **Generate refactored code** for critical issues
> 3. **Just provide the report** (no changes)

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
| `/review` | Ad-hoc code review (this skill) |
| `/architecture` | Generate and refine spec with DHH reviews |
| `/implement` | Structured implementation from approved spec |
| `/omc-rails-autopilot` | Full autonomous flow with SmartSuite tracking |
