# SmartSuite Integration

Integration details for fetching stories from SmartSuite and tracking status through the development lifecycle.

## Story Configuration

| Field | Value |
|-------|-------|
| Solution | Requerimientos de Sistemas |
| Table | Historias de Usuario |
| Table ID | `697d2c6ff917d0e2b5cd6271` |

## Story Status Flow

| Status | When | Who Sets It |
|--------|------|-------------|
| `backlog` | Story is ready to be picked up | Product/manual |
| `in_progress` | Autopilot starts work | Autopilot (Phase 0) |
| `ready_for_review` | PR created and linked | Autopilot (Phase 4) |
| `blocked` | Escalation after failed reviews | Autopilot (escalation) |
| `complete` | PR merged | Manual/CI |

## MCP Calls

### Fetch a Story

```
mcp: smartsuite.get_record(
  table: "697d2c6ff917d0e2b5cd6271",
  id: STORY_ID
)
```

### Fetch Next Ready Story

Query the table for stories with `backlog` status, ordered by priority:

```
mcp: smartsuite.list_records(
  table: "697d2c6ff917d0e2b5cd6271",
  filter: { status: "backlog" },
  sort: { priority: "asc" },
  limit: 1
)
```

### Update Status to In Progress

```
mcp: smartsuite.update_record(
  table: "697d2c6ff917d0e2b5cd6271",
  id: STORY_ID,
  data: { status: "in_progress" }
)
```

### Update Status to Ready for Review

```
mcp: smartsuite.update_record(
  table: "697d2c6ff917d0e2b5cd6271",
  id: STORY_ID,
  data: { status: "ready_for_review", pr_url: PR_URL }
)
```

### Update Status to Blocked

```
mcp: smartsuite.update_record(
  table: "697d2c6ff917d0e2b5cd6271",
  id: STORY_ID,
  data: { status: "blocked", blocked_reason: REASON }
)
```

## Story ID Format

Story IDs follow the pattern: `{MODULE}-{AREA}-{NUMBER}-US{SEQUENCE}`

Examples:
- `GC-FND-002-US01` -- Gobierno Corporativo, Foundation module, story 2, user story 1
- `GC-HRM-001-US03` -- Gobierno Corporativo, HRM module, story 1, user story 3

The module prefix determines the git branch name and commit prefix.

## Error Handling

- If the story is not found, report the error and stop
- If the story status is not `backlog`, report that another process may be working on it and stop
- If SmartSuite MCP is unavailable, proceed without status tracking but warn the user
