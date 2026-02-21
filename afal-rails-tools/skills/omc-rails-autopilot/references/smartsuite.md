# SmartSuite Integration

Integration details for fetching stories from SmartSuite and tracking status through the development lifecycle.

## Project Configuration

Each AFAL project must declare its SmartSuite project ID in CLAUDE.md so the autopilot can filter stories to the current repo:

```markdown
## SmartSuite

- Necesidad de Software ID: `6972b393cbbe389c07f41770`
```

The ID is the SmartSuite record ID from the "Necesidades de software" table. Find it by listing projects:

```
mcp__smartsuite__list_records(
  table_id: "66ba6d1f38d7d8c8b11d403b",
  fields: ["title"]
)
```

Current projects include:

| Project | Record ID |
|---------|-----------|
| Gobierno Corporativo | `6972b393cbbe389c07f41770` |
| Botón de emergencia familiar | `68546dda7e74a1084daf91cb` |
| Transport Management System | `67cb2cbec37a64005826b02c` |

(22 projects total -- query the table for the full list)

## Tables

| Table | ID | Solution |
|-------|----|----------|
| Historias de Usuario | `697d2c6ff917d0e2b5cd6271` | Requerimientos de Sistemas |
| Necesidades de software | `66ba6d1f38d7d8c8b11d403b` | Requerimientos de Sistemas |

## Key Fields (Historias de Usuario)

| Slug | Label | Type | Notes |
|------|-------|------|-------|
| `title` | Title | recordtitlefield | Primary field |
| `code` | Código | textfield | Story ID (e.g., `GC-FND-002-US01`), required, unique |
| `status` | Status | statusfield | `backlog`, `in_progress`, `ready_for_review`, `complete` |
| `priority` | Priority | singleselectfield | `urgent`, `high`, `normal`, `low` |
| `module` | Módulo | singleselectfield | `gc-fnd`, `gc-pro`, `gc-ini`, etc. |
| `phase` | Fase | singleselectfield | `phase-0` through `phase-5` |
| `story_text` | Historia de Usuario | textareafield | The user story text, required |
| `acceptance_criteria` | Criterios de Aceptación | textareafield | Required |
| `technical_notes` | Notas Técnicas | textareafield | Optional implementation notes |
| `complexity` | Complejidad | singleselectfield | `small`, `medium`, `large`, `xlarge` |
| `necesidad_software` | Necesidad de Software | linkedrecordfield | Links to project in Necesidades table |
| `pr_link` | Pull Request | linkfield | PR URL |
| `branch_name` | Branch | textfield | Git branch name |
| `assigned_to` | Assigned To | userfield | Single user |

## Story Status Flow

| Status | Value | When | Who Sets It |
|--------|-------|------|-------------|
| Backlog | `backlog` | Story is ready to be picked up | Product/manual |
| In Process | `in_progress` | Autopilot starts work | Autopilot (Phase 0) |
| Ready for Review | `ready_for_review` | PR created and linked | Autopilot (Phase 4) |
| Complete | `complete` | PR merged | Manual/CI |

**NOTE:** There is no `blocked` status. If escalation is needed, add a comment to the story and leave status as `in_progress`.

## MCP Calls

### Fetch Story by Code

Stories are identified by their `code` field (e.g., `GC-FND-002-US01`), not the SmartSuite record ID. Use `list_records` with a filter:

```
mcp__smartsuite__list_records(
  table_id: "697d2c6ff917d0e2b5cd6271",
  fields: ["title", "code", "status", "priority", "story_text",
           "acceptance_criteria", "technical_notes", "complexity",
           "necesidad_software", "module"],
  filter: {
    "operator": "and",
    "fields": [
      { "field": "code", "comparison": "is", "value": "GC-FND-002-US01" }
    ]
  },
  limit: 1
)
```

### Fetch Next Ready Story (Project-Scoped)

Query for the highest-priority `backlog` story **filtered to the current project**. Read the Necesidad de Software ID from the project's CLAUDE.md:

```
mcp__smartsuite__list_records(
  table_id: "697d2c6ff917d0e2b5cd6271",
  fields: ["title", "code", "status", "priority", "story_text",
           "acceptance_criteria", "technical_notes", "complexity"],
  filter: {
    "operator": "and",
    "fields": [
      { "field": "status", "comparison": "is", "value": "backlog" },
      { "field": "necesidad_software", "comparison": "is", "value": "NECESIDAD_ID_FROM_CLAUDE_MD" }
    ]
  },
  sort: [{ "field": "priority", "direction": "asc" }],
  limit: 1
)
```

**IMPORTANT:** Always include the `necesidad_software` filter. Without it, the query returns stories from ALL projects across the organization.

If the project's CLAUDE.md does not declare a Necesidad de Software ID, stop and ask the user to configure it.

### Update Status to In Progress

```
mcp__smartsuite__update_record(
  table_id: "697d2c6ff917d0e2b5cd6271",
  record_id: RECORD_ID,
  fields: { "status": "in_progress", "branch_name": "feature/GC-FND-002-US01" }
)
```

Note: `record_id` is the SmartSuite hex ID (from the list_records response), NOT the story code.

### Update Status to Ready for Review

```
mcp__smartsuite__update_record(
  table_id: "697d2c6ff917d0e2b5cd6271",
  record_id: RECORD_ID,
  fields: { "status": "ready_for_review", "pr_link": PR_URL }
)
```

### Add Comment (for Escalation)

Since there is no `blocked` status, use comments for escalation:

```
mcp__smartsuite__add_comment(
  table_id: "697d2c6ff917d0e2b5cd6271",
  record_id: RECORD_ID,
  content: "Autopilot escalation: [reason]. See GitHub issue: [URL]"
)
```

## Story ID Format

Story IDs follow the pattern: `{MODULE}-{AREA}-{NUMBER}-US{SEQUENCE}`

Examples:
- `GC-FND-002-US01` -- Gobierno Corporativo, Foundation module, story 2, user story 1
- `GC-HRM-001-US03` -- Gobierno Corporativo, HRM module, story 1, user story 3

The story code is stored in the `code` field and is unique across the table.

## Error Handling

- **Story not found:** If `list_records` with code filter returns 0 records, report the error and stop
- **Wrong status:** If the story status is not `backlog`, report that another process may be working on it and stop
- **No project ID configured:** If CLAUDE.md lacks a Necesidad de Software ID, stop and ask the user to add it
- **SmartSuite MCP unavailable:** Proceed without status tracking but warn the user
- **Story belongs to different project:** If a specific story code is given but its `necesidad_software` does not match the project's CLAUDE.md, warn the user and ask for confirmation before proceeding
