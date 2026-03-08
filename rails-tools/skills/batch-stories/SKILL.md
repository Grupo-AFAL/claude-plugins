---
name: batch-stories
description: This skill should be used when the user asks to "implement multiple stories", "batch stories", "run autopilot on several stories", "implement these stories", "batch autopilot", "run stories in parallel", "implement 5 stories", or wants to run the autopilot workflow on more than one SmartSuite story. Orchestrates parallel story implementation using isolated git worktrees with post-implementation quality passes.
argument-hint: "[story-codes...]"
disable-model-invocation: true
---

# Batch Stories - Parallel Autonomous Implementation

Implement multiple SmartSuite stories in parallel, each in an isolated git worktree with its own branch and PR. Each story runs the full `/omc-rails-autopilot` workflow independently.

## Usage

```
/batch-stories GC-FND-002-US01 GC-FND-002-US02 GC-FND-003-US01
```

Or fetch the next N stories from the backlog:

```
/batch-stories next 5
```

## Workflow

### Step 1: Resolve Stories

Based on the arguments:

1. **Explicit codes:** Validate each story code exists in SmartSuite and is in `backlog` status
2. **`next N`:** Query SmartSuite for the top N `backlog` stories scoped to this project's Necesidad de Software ID

Report the stories that will be implemented:

```
Stories to implement:
  1. GC-FND-002-US01 - User registration flow
  2. GC-FND-002-US02 - Password reset
  3. GC-FND-003-US01 - Role management
```

### Step 2: Launch Parallel Agents

For each story, spawn an agent using the Agent tool with `isolation: worktree`:

```
Agent(
  description: "Autopilot: GC-FND-002-US01",
  prompt: "Run /omc-rails-autopilot GC-FND-002-US01 — complete all 10 phases autonomously.",
  isolation: "worktree",
  run_in_background: true
)
```

Launch ALL agents in a single message so they run concurrently. Each agent:
- Gets its own git worktree (isolated copy of the repo)
- Runs the full 10-phase autopilot workflow
- Creates its own branch and PR
- Updates SmartSuite status independently

### Step 3: Monitor Progress

After launching, use `/loop` to monitor progress:

```
/loop 15m check the status of all batch-stories agents and report: which are still running, which completed, and any that failed
```

Report a summary table as agents complete:

```
Batch Progress:
  | Story | Status | Branch | PR |
  |-------|--------|--------|----|
  | GC-FND-002-US01 | Complete | feature/GC-FND-002-US01 | #42 |
  | GC-FND-002-US02 | Phase 5 (DHH review) | feature/GC-FND-002-US02 | — |
  | GC-FND-003-US01 | Complete | feature/GC-FND-003-US01 | #43 |
```

### Step 4: Post-Batch Quality Pass (Optional)

After all stories complete, run a forked quality review on each PR:

```
For each completed PR:
  1. /dhh-review --branch  (runs in forked context — fresh analysis)
  2. /bali-view-audit      (runs in forked context — fresh scan)
```

This catches issues the individual autopilot runs may have missed due to context pressure.

## Manual Testing Guide

Each story runs in its own git worktree. Here's how to test them:

### Listing Active Worktrees

```bash
git worktree list
```

Output:
```
/Users/you/code/afal/project           abc1234 [main]
/Users/you/code/afal/worktrees/feature/GC-FND-002-US01  def5678 [feature/GC-FND-002-US01]
/Users/you/code/afal/worktrees/feature/GC-FND-002-US02  ghi9012 [feature/GC-FND-002-US02]
```

### Option A: Test Directly in the Worktree (Recommended)

Navigate to the worktree directory. It's a full copy of the repo with its own branch checked out:

```bash
# Go to the story's worktree
cd ../worktrees/feature/GC-FND-002-US01

# Install dependencies (if needed)
bundle install
bin/rails db:migrate

# Run the app
bin/rails server -p 3001

# Run tests
bin/rails test

# Run quality checks
bin/rubocop
bin/brakeman --no-pager -q
```

Each worktree is independent — you can run multiple servers on different ports to test multiple stories simultaneously:

```bash
# Terminal 1: Story US01 on port 3001
cd ../worktrees/feature/GC-FND-002-US01 && bin/rails server -p 3001

# Terminal 2: Story US02 on port 3002
cd ../worktrees/feature/GC-FND-002-US02 && bin/rails server -p 3002
```

### Option B: Check Out the Branch in Your Main Repo

If you prefer working in your main repo directory:

```bash
# From your main project directory
git checkout feature/GC-FND-002-US01

# Test normally
bin/rails test
bin/rails server

# Switch to next story
git checkout feature/GC-FND-002-US02
```

**Note:** You must stash or commit any local changes before switching branches.

### Option C: Review on GitHub

Each story creates a PR. Review the diff, CI results, and screenshots directly on GitHub:

```bash
# List all open PRs from batch
gh pr list --label batch-stories

# View a specific PR
gh pr view 42

# Check CI status
gh pr checks 42
```

### Cleaning Up Worktrees

After testing and merging PRs, clean up the worktrees:

```bash
# Remove a specific worktree
git worktree remove ../worktrees/feature/GC-FND-002-US01

# Remove all batch worktrees at once
git worktree list | grep worktrees/feature | awk '{print $1}' | xargs -I{} git worktree remove {}

# Prune stale worktree references
git worktree prune

# Delete merged remote branches
git fetch --prune
```

### Testing Checklist Per Story

For each story PR, verify:

- [ ] `bin/rails test` passes (all tests green)
- [ ] `bin/rubocop` clean (no offenses)
- [ ] `bin/brakeman --no-pager -q` clean (no warnings)
- [ ] Feature is accessible from the UI (not just by URL)
- [ ] Bali components used correctly (no raw HTML for available components)
- [ ] Authorization gates in place (Pundit policies)
- [ ] Screenshots in `docs/src/assets/screenshots/<story-id>/` look correct
- [ ] CHANGELOG.md entry present
- [ ] Documentation updated (if docs site exists)

## Limitations

- **Resource intensive:** Each parallel agent consumes its own context window and API tokens. Limit to 3-5 concurrent stories for best results.
- **Database contention:** All worktrees share the same development database. Stories that modify the same tables may conflict during migrations. Run `bin/rails db:migrate` in each worktree if needed.
- **Session-scoped:** The batch and monitoring loop only run while Claude Code is open. If the session ends, in-progress agents may be interrupted (but their worktrees and any committed work persist).

## Integration

| Command | When to Use |
|---------|-------------|
| `/batch-stories` | Implement multiple stories in parallel (this skill) |
| `/omc-rails-autopilot` | Implement a single story autonomously |
| `/dhh-review` | Ad-hoc code review (used in post-batch quality pass) |
| `/bali-view-audit` | Audit views for component adoption (used in post-batch quality pass) |
