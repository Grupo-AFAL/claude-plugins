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

== MANDATORY FIRST ACTION ==

Before doing ANYTHING else, call TaskUpdate NOW:
  TaskUpdate(taskId: "{TASK_ID}", status: "in_progress", owner: "{worker_name}")

This is non-negotiable. Do it before reading files, before invoking skills, before any work.

== YOUR TASK ==

Run /omc-rails-autopilot {STORY_CODE} and complete ALL 10 phases.
Every phase is mandatory. Do NOT skip any phase. Do NOT declare done until Phase 10 is complete.

== PHASE REPORTING (MANDATORY) ==

You MUST send a progress message to the lead at the START of each phase.
Use this exact format — the lead parses these to build a progress table:

  SendMessage(recipient: "team-lead", content: "PHASE {N}/10 {STORY_CODE}: {phase_name}", summary: "{STORY_CODE} phase {N}")

The 10 phases and their names:
  PHASE 1/10: Story setup + worktree creation
  PHASE 2/10: TDD red phase (failing tests)
  PHASE 3/10: Implementation + early push
  PHASE 4/10: UI integration
  PHASE 5/10: DHH review (iterative)
  PHASE 6/10: Visual verification
  PHASE 7/10: Quality gates
  PHASE 8/10: CHANGELOG + commit + PR
  PHASE 9/10: Documentation + SmartSuite update
  PHASE 10/10: Final DHH review

Example: SendMessage(recipient: "team-lead", content: "PHASE 5/10 GC-FND-002-US01: DHH review (iterative)", summary: "GC-FND-002-US01 phase 5")

If a phase is blocked or skipped (e.g. docs build fails due to no network), report it:
  SendMessage(recipient: "team-lead", content: "PHASE 9/10 {STORY_CODE}: SKIPPED - no network for docs build", summary: "{STORY_CODE} phase 9 skipped")

== WORK ==

Invoke /omc-rails-autopilot {STORY_CODE} and let it run all 10 phases.
You ARE allowed to invoke skills and spawn sub-agents (dhh-code-reviewer, etc.).

== COMPLETION REPORT (MANDATORY) ==

When all 10 phases are done, send a structured completion report AND update the task:

  TaskUpdate(taskId: "{TASK_ID}", status: "completed")

  SendMessage(recipient: "team-lead", content: """
  COMPLETED {STORY_CODE}
  Branch: feature/{STORY_CODE}
  PR: #XX
  Tests: XX passed, 0 failed
  Rubocop: clean | N offenses
  Brakeman: clean | N warnings
  DHH verdict: <final verdict from Phase 10>
  Phases skipped: none | <list>
  """, summary: "{STORY_CODE} complete")

== FAILURE REPORT ==

If you cannot complete the story:

  TaskUpdate(taskId: "{TASK_ID}", status: "failed")

  SendMessage(recipient: "team-lead", content: """
  FAILED {STORY_CODE}
  Failed at: Phase N - {phase_name}
  Reason: <what went wrong>
  Branch: feature/{STORY_CODE} (partial work committed: yes/no)
  """, summary: "{STORY_CODE} failed at phase N")

== SHUTDOWN ==
When you receive a shutdown_request, respond with:
{"type": "shutdown_response", "request_id": "<from the request>", "approve": true}
```

### Step 4: Monitor Progress

The lead monitors via two channels:

1. **Inbound messages** — workers send phase updates (`PHASE N/10 ...`) and completion/failure reports via `SendMessage`. These arrive automatically and provide real-time progress.
2. **TaskList polling** — periodically check overall task status (pending/in_progress/completed/failed).

Parse the `PHASE N/10` messages to maintain a live progress table. Update and display it as messages arrive:

```
Batch Progress:
  | Story           | Phase | Status                | Branch                  | PR  |
  |-----------------|-------|-----------------------|-------------------------|-----|
  | GC-FND-002-US01 | 10/10 | Complete              | feature/GC-FND-002-US01 | #42 |
  | GC-FND-002-US02 |  5/10 | DHH review (iterative)| feature/GC-FND-002-US02 | —   |
  | GC-FND-003-US01 |  9/10 | Phase 9 SKIPPED       | feature/GC-FND-003-US01 | #43 |
```

If a worker hasn't sent a phase update in >10 minutes, check its task status via TaskList.

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
- **Sandbox network restrictions:** When running in a sandboxed environment, workers cannot install npm packages or reach external services. Phase 9 (Documentation) may fail if it requires `npm run docs:build`. Workers are instructed to report skipped phases — review the final summary for any `SKIPPED` entries.
- **Session-scoped:** The team and monitoring loop only run while Claude Code is open. If the session ends, in-progress members may be interrupted. Completed work is preserved on the remote (branches and PRs) thanks to the early push in Phase 3.

## Integration

| Command | When to Use |
|---------|-------------|
| `/batch-stories` | Implement multiple stories in parallel (this skill) |
| `/omc-rails-autopilot` | Implement a single story autonomously |
| `/dhh-review` | Ad-hoc code review (used in post-batch quality pass) |
| `/bali-view-audit` | Audit views for component adoption (used in post-batch quality pass) |
