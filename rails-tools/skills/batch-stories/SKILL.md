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

Each story runs in its own git worktree. Three options for testing:

1. **Test in worktree (recommended):** `cd ../worktrees/feature/STORY-ID` — run the app on a different port, run tests, run quality checks. Multiple worktrees can run servers simultaneously on different ports.
2. **Check out branch:** `git checkout feature/STORY-ID` from the main repo directory.
3. **Review on GitHub:** `gh pr view N` to review diff, CI, and screenshots.

For detailed commands, cleanup instructions, and a per-story testing checklist, consult **`references/testing-worktrees.md`**.

## Sandbox and Session Recovery

When agents run inside a Docker sandbox or isolated environment, **worktrees inside the container are lost when the sandbox closes**. The autopilot's early push (Phase 3) mitigates this — each story's branch is pushed to the remote as soon as tests pass, before review and polish phases.

**If a sandbox dies mid-execution:**

1. Check which branches were pushed: `git branch -r | grep feature/`
2. Check out any pushed branch locally: `git fetch && git checkout feature/STORY-ID`
3. Check SmartSuite for story status — stories marked `in_progress` were started but may not be complete
4. Resume with `/omc-rails-autopilot STORY-ID` to pick up from where the agent left off

**If a branch was NOT pushed** (agent died before Phase 3 completed), the work is lost. Re-run the story with `/omc-rails-autopilot STORY-ID`.

## Limitations

- **Resource intensive:** Each parallel agent consumes its own context window and API tokens. Limit to 3-5 concurrent stories for best results.
- **Database contention:** All worktrees share the same development database. Stories that modify the same tables may conflict during migrations. Run `bin/rails db:migrate` in each worktree if needed.
- **Session-scoped:** The batch and monitoring loop only run while Claude Code is open. If the session ends, in-progress agents may be interrupted. Completed work is preserved on the remote (branches and PRs) thanks to the early push in Phase 3.

## Integration

| Command | When to Use |
|---------|-------------|
| `/batch-stories` | Implement multiple stories in parallel (this skill) |
| `/omc-rails-autopilot` | Implement a single story autonomously |
| `/dhh-review` | Ad-hoc code review (used in post-batch quality pass) |
| `/bali-view-audit` | Audit views for component adoption (used in post-batch quality pass) |
