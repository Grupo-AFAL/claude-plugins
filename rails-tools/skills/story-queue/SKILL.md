---
name: story-queue
description: This skill should be used when the user asks to "run stories sequentially", "queue stories", "implement stories one by one", "story queue", "run autopilot on stories in order", "sequential autopilot", or wants to implement multiple SmartSuite stories one at a time instead of in parallel. Orchestrates sequential story implementation where each story completes before the next begins.
argument-hint: "[story-codes... | next N] [--stop-on-failure]"
---

# Story Queue - Sequential Autonomous Implementation

Implement multiple SmartSuite stories sequentially using Claude Code native teams. Each story runs the complete `/omc-rails-autopilot` workflow in a full Claude Code session — one at a time, waiting for completion before starting the next.

Use this instead of `/batch-stories` when:
- Stories must run in a specific order (dependencies between them)
- Resource constraints prevent parallel execution
- Stories share database migrations or schema changes
- You want to monitor each story's outcome before proceeding

## Usage

```
/story-queue GC-FND-002-US01 GC-FND-002-US02 GC-FND-003-US01
```

Fetch the next N stories from the backlog (executed in priority order):

```
/story-queue next 5
```

Stop the queue if any story fails:

```
/story-queue GC-FND-002-US01 GC-FND-002-US02 --stop-on-failure
```

## Workflow

### Step 1: Resolve Stories

Based on the arguments:

1. **Explicit codes:** Validate each story code exists in SmartSuite and is in `backlog` status
2. **`next N`:** Query SmartSuite for the top N `backlog` stories scoped to this project's Necesidad de Software ID

Parse flags:
- `--stop-on-failure` — halt the queue if a story fails (default: skip and continue)

Report the queue:

```
Story Queue (sequential):
  1. GC-FND-002-US01 - User registration flow
  2. GC-FND-002-US02 - Password reset
  3. GC-FND-003-US01 - Role management

Mode: continue on failure (use --stop-on-failure to change)
```

### Step 2: Create Team and Tasks

Create a team and one task per story upfront. All tasks start as `pending` — only the current story moves to `in_progress`.

```
TeamCreate(team_name: "story-queue-YYYYMMDD-HHMM")

For each story:
  TaskCreate(
    subject: "GC-FND-002-US01 - User registration flow",
    description: "Run /omc-rails-autopilot GC-FND-002-US01. Complete all 10 phases autonomously."
  )
```

### Step 3: Execute Stories Sequentially

For each story in order:

#### 3a. Spawn Worker

Spawn ONE team member for the current story:

```
Agent(
  subagent_type: "oh-my-claudecode:deep-executor",
  team_name: "story-queue-YYYYMMDD-HHMM",
  name: "story-worker",
  prompt: "<WORKER_PREAMBLE for current story>"
)
```

Use `deep-executor` (Opus) because each worker runs the full 10-phase autopilot which requires strong reasoning for architecture, TDD, and iterative DHH reviews.

**Important:** Spawn the worker and wait for it to complete before proceeding. Do NOT spawn the next worker until the current one finishes.

#### 3b. Monitor Current Story

While the worker is active:

1. **Inbound messages** — the worker sends phase updates (`PHASE N/10 ...`) and completion/failure reports via `SendMessage`
2. **TaskList polling** — periodically check the task status

Display live progress for the current story:

```
Queue Progress [2/5]:
  | # | Story           | Phase  | Status                 | Branch                  | PR  |
  |---|-----------------|--------|------------------------|-------------------------|-----|
  | 1 | GC-FND-002-US01 | 10/10  | Completed              | feature/GC-FND-002-US01 | #42 |
  | 2 | GC-FND-002-US02 |  5/10  | DHH review (iterative) | feature/GC-FND-002-US02 | --  |
  | 3 | GC-FND-003-US01 |  --    | Pending                | --                      | --  |
```

#### 3c. Handle Completion or Failure

When the worker finishes:

**If completed:**
1. Record the result (branch, PR, test counts, DHH verdict)
2. Update the progress table
3. Proceed to next story

**If failed:**
1. Record the failure (phase, reason, partial branch)
2. Update the progress table
3. Check `--stop-on-failure`:
   - **If set:** Stop the queue, report summary, skip to Step 5
   - **If not set (default):** Log the failure, proceed to next story

#### Worker Preamble

Each worker receives this preamble customized with their story code and task ID:

```
You are a TEAM WORKER in team "{team_name}". Your name is "story-worker".
You report to the team lead ("team-lead").

== MANDATORY FIRST ACTION ==

Before doing ANYTHING else, call TaskUpdate NOW:
  TaskUpdate(taskId: "{TASK_ID}", status: "in_progress", owner: "story-worker")

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

### Step 4: Between Stories

After each story completes (success or failure), before spawning the next worker:

1. Display the updated progress table
2. Verify the worktree from the completed story is not conflicting with the next story's potential changes
3. If the completed story created migrations, note this for awareness (the next story's worktree will inherit them from the shared dev database)

### Step 5: Shutdown and Cleanup

When all stories are processed (or queue stopped due to `--stop-on-failure`):

1. Send `shutdown_request` to the current worker if still active
2. Wait for `shutdown_response` (30s timeout)
3. Call `TeamDelete` to clean up team and task files
4. Report final summary

### Final Summary

```
Story Queue Complete:
  | # | Story           | Result    | Branch                  | PR  | DHH Verdict     |
  |---|-----------------|-----------|-------------------------|-----|-----------------|
  | 1 | GC-FND-002-US01 | Completed | feature/GC-FND-002-US01 | #42 | Rails-worthy    |
  | 2 | GC-FND-002-US02 | Failed    | feature/GC-FND-002-US02 | --  | (phase 3)       |
  | 3 | GC-FND-003-US01 | Completed | feature/GC-FND-003-US01 | #43 | Rails-worthy    |

Completed: 2/3
Failed: 1/3 (GC-FND-002-US02 at Phase 3 - Implementation)
Skipped: 0/3
```

### Step 6: Post-Queue Quality Pass (Optional)

After all stories complete, offer to run a forked quality review on each completed PR:

```
For each completed PR:
  1. /dhh-review --branch  (runs in forked context)
  2. /bali-view-audit      (runs in forked context)
```

## Manual Testing Guide

Each story runs in its own git worktree. Since stories execute sequentially, you can test each one as it completes:

1. **Test in worktree:** `cd .worktrees/feature/STORY-ID`
2. **Check out branch:** `git checkout feature/STORY-ID`
3. **Review on GitHub:** `gh pr view N`

For detailed commands, cleanup instructions, and a per-story testing checklist, consult **`references/testing-worktrees.md`** (shared with batch-stories).

## Advantages Over `/batch-stories`

| Aspect | `/story-queue` | `/batch-stories` |
|--------|----------------|-------------------|
| Execution | Sequential (1 at a time) | Parallel (all at once) |
| Resources | Light (1 session) | Heavy (N sessions) |
| DB contention | None | Possible with shared tables |
| Migration safety | Each story sees prior migrations | Concurrent migrations may conflict |
| Failure control | `--stop-on-failure` option | Independent (all run regardless) |
| Speed | Slower (sum of all stories) | Faster (max of all stories) |
| Monitoring | Simple (one active story) | Complex (N active stories) |

## Integration

| Command | When to Use |
|---------|-------------|
| `/story-queue` | Implement multiple stories sequentially (this skill) |
| `/batch-stories` | Implement multiple stories in parallel |
| `/omc-rails-autopilot` | Implement a single story autonomously |
| `/dhh-review` | Ad-hoc code review (used in post-queue quality pass) |
| `/bali-view-audit` | Audit views for component adoption (used in post-queue quality pass) |
