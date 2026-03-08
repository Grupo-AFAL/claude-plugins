---
name: batch-stories
description: This skill should be used when the user asks to "implement multiple stories", "batch stories", "run autopilot on several stories", "implement these stories", "batch autopilot", "run stories in parallel", "implement 5 stories", or wants to run the autopilot workflow on more than one SmartSuite story. Orchestrates parallel story implementation using Claude Code teams with post-implementation quality passes.
argument-hint: "[story-codes...]"
---

# Batch Stories - Parallel Autonomous Implementation

Implement multiple SmartSuite stories in parallel using Claude Code native teams. Each team member is a full Claude Code session that runs the complete `/omc-rails-autopilot` workflow independently — all hooks, skills, MCP tools, and enforcement mechanisms work identically to a direct user invocation.

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

### Step 2: Create Team and Tasks

Create a team and one task per story. Skip the team-plan/team-prd stages — each story is a self-contained unit that runs its own 10-phase pipeline internally.

```
TeamCreate(team_name: "batch-stories-YYYYMMDD-HHMM")

For each story:
  TaskCreate(
    subject: "GC-FND-002-US01 - User registration flow",
    description: "Run /omc-rails-autopilot GC-FND-002-US01. Complete all 10 phases autonomously."
  )
  TaskUpdate(taskId: "N", owner: "story-worker-N")
```

### Step 3: Spawn Team Members

Spawn one team member per story. Each member is a full Claude Code session with access to all installed plugins, skills, MCP servers, and hooks — the autopilot behaves exactly as when run directly.

```
For each story, spawn in parallel:
  Task(
    subagent_type: "oh-my-claudecode:deep-executor",
    team_name: "batch-stories-YYYYMMDD-HHMM",
    name: "story-worker-1",
    prompt: "<WORKER_PREAMBLE>"
  )
```

Use `deep-executor` (Opus) because each worker runs the full 10-phase autopilot which requires strong reasoning for architecture, TDD, and iterative DHH reviews.

**Spawn ALL team members in a single message** so they start concurrently.

#### Worker Preamble

Each worker receives this preamble customized with their story code and task ID:

```
You are a TEAM WORKER in team "{team_name}". Your name is "{worker_name}".
You report to the team lead ("team-lead").

== YOUR TASK ==

Run /omc-rails-autopilot {STORY_CODE} and complete ALL 10 phases:
- Phase 1: Story setup + worktree creation
- Phase 2: TDD red phase (write failing tests)
- Phase 3: Implementation (make tests pass) + early push
- Phase 4: UI integration (pages reachable from navigation)
- Phase 5: Iterative DHH review (until "Rails-worthy")
- Phase 6: Visual verification (E2E browser flows + screenshots)
- Phase 7: Quality gates (tests, rubocop, brakeman)
- Phase 8: CHANGELOG + commit + PR
- Phase 9: Documentation + SmartSuite update
- Phase 10: Final DHH review of ALL branch changes

Every phase is mandatory. Do NOT skip any phase. Do NOT declare done until Phase 10 is complete.

== WORK PROTOCOL ==

1. CLAIM: Call TaskUpdate to set your task to in_progress:
   {"taskId": "{TASK_ID}", "status": "in_progress", "owner": "{worker_name}"}

2. WORK: Invoke /omc-rails-autopilot {STORY_CODE} and let it run all 10 phases.
   You ARE allowed to invoke skills and spawn sub-agents (dhh-code-reviewer, etc.).

3. COMPLETE: When all 10 phases are done, mark the task completed:
   {"taskId": "{TASK_ID}", "status": "completed"}

4. REPORT: Notify the lead via SendMessage:
   {"type": "message", "recipient": "team-lead",
    "content": "Completed {STORY_CODE}: PR #XX, all 10 phases done, tests green.",
    "summary": "{STORY_CODE} complete"}

== ERRORS ==
If you cannot complete the story, report the failure to the lead:
{"type": "message", "recipient": "team-lead",
 "content": "FAILED {STORY_CODE}: <reason>", "summary": "{STORY_CODE} failed"}

== SHUTDOWN ==
When you receive a shutdown_request, respond with:
{"type": "shutdown_response", "request_id": "<from the request>", "approve": true}
```

### Step 4: Monitor Progress

The lead monitors via two channels:

1. **Inbound messages** — team members send `SendMessage` when they complete or fail. These arrive automatically.
2. **TaskList polling** — periodically check overall progress.

Report a summary table as members complete:

```
Batch Progress:
  | Story | Status | Branch | PR |
  |-------|--------|--------|----|
  | GC-FND-002-US01 | Complete | feature/GC-FND-002-US01 | #42 |
  | GC-FND-002-US02 | Phase 5 (DHH review) | feature/GC-FND-002-US02 | — |
  | GC-FND-003-US01 | Complete | feature/GC-FND-003-US01 | #43 |
```

### Step 5: Shutdown and Cleanup

When all tasks are completed or failed:

1. Send `shutdown_request` to each team member
2. Wait for `shutdown_response` from each (30s timeout)
3. Call `TeamDelete` to clean up team and task files
4. Report final summary to user

### Step 6: Post-Batch Quality Pass (Optional)

After all stories complete, offer to run a forked quality review on each PR:

```
For each completed PR:
  1. /dhh-review --branch  (runs in forked context — fresh analysis)
  2. /bali-view-audit      (runs in forked context — fresh scan)
```

This catches issues the individual autopilot runs may have missed due to context pressure.

## Manual Testing Guide

Each story runs in its own git worktree. Three options for testing:

1. **Test in worktree (recommended):** `cd .worktrees/feature/STORY-ID` — run the app on a different port, run tests, run quality checks. Multiple worktrees can run servers simultaneously on different ports.
2. **Check out branch:** `git checkout feature/STORY-ID` from the main repo directory.
3. **Review on GitHub:** `gh pr view N` to review diff, CI, and screenshots.

For detailed commands, cleanup instructions, and a per-story testing checklist, consult **`references/testing-worktrees.md`**.

## Post-Batch Workflow

After the batch completes, each story's worktree persists at `.worktrees/feature/STORY-ID`. This enables manual testing and follow-up changes:

1. **Test:** `cd .worktrees/feature/STORY-ID` — run the app, inspect the UI, run tests
2. **Fix issues:** Make changes directly in the worktree and commit
3. **Resume autopilot:** Run `/omc-rails-autopilot STORY-ID` from inside the worktree to re-run reviews or later phases
4. **Clean up** (only after PR is merged):
   ```bash
   git worktree remove .worktrees/feature/STORY-ID
   ```

**If a session dies mid-execution**, the worktrees and any committed work persist on disk. Check SmartSuite for story status — stories marked `in_progress` were started but may not have completed all phases. Resume from the worktree directory.

## Limitations

- **Resource intensive:** Each team member is a full Claude Code session consuming its own context window and API tokens. Limit to 3-5 concurrent stories for best results.
- **Database contention:** All worktrees share the same development database. Stories that modify the same tables may conflict during migrations. Run `bin/rails db:migrate` in each worktree if needed.
- **Session-scoped:** The team and monitoring loop only run while Claude Code is open. If the session ends, in-progress members may be interrupted. Completed work is preserved on the remote (branches and PRs) thanks to the early push in Phase 3.

## Integration

| Command | When to Use |
|---------|-------------|
| `/batch-stories` | Implement multiple stories in parallel (this skill) |
| `/omc-rails-autopilot` | Implement a single story autonomously |
| `/dhh-review` | Ad-hoc code review (used in post-batch quality pass) |
| `/bali-view-audit` | Audit views for component adoption (used in post-batch quality pass) |
