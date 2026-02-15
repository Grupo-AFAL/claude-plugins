---
name: bali-view-audit
description: This skill should be used when the user asks to "audit views for Bali components", "find raw HTML to replace with ViewComponents", "review views for component adoption", "check view component coverage", "find missing Bali components", "migrate views to Bali", or mentions auditing, reviewing, or scanning Rails views for Bali/ViewComponent opportunities.
---

# Bali View Audit

Systematic review of Rails views to maximize Bali ViewComponent usage, catch incorrect API usage, and identify patterns that should become new components.

**CRITICAL:** Always verify component APIs before suggesting changes. Use the `bali-components` skill for API reference -- it has per-component reference files for all 50+ components.

## Audit Workflow

### Step 1: Scope the Audit

Determine the scope before scanning:
- **Single file:** Audit one specific view
- **Feature area:** Audit all views under a controller/namespace
- **Full project:** Scan `app/views/` and `app/components/` comprehensively

### Step 2: Scan for Anti-Patterns First

Check for incorrect usage of existing Bali components. These are the highest-value fixes because they indicate bugs or deprecated code.

Run these scans across the view files:

| What to Find | How to Detect |
|--------------|---------------|
| Forms without FormBuilder | `form_with` calls missing `builder: Bali::FormBuilder` |
| Deprecated `type:` on Link | `Link::Component.new` with `type:` instead of `variant:` |
| Wrong Card slots | `with_body`, `with_footer` (Card has neither) |
| Wrong Modal slots | `with_footer` (should be `with_actions`) |
| Wrong Card title | `with_title { block }` (takes string arg, not block) |
| Wrong Modal header | `with_header { block }` (takes `title:` keyword) |
| Wrong Tooltip API | `Tooltip.new(content:)` (no such param) |
| Deprecated Tag light | `Tag.new(light: true)` (use `style: :outline`) |
| Manual Stimulus wiring in forms | `data-controller="slim-select"` etc. inside forms |

Consult **`references/patterns.md`** for the full anti-pattern list with grep commands.

### Step 3: Detect Raw HTML Replacements

Scan for raw HTML that has a Bali component equivalent. Prioritize by impact:

**HIGH priority** (structural -- fix first):
- `<table>` -> `Bali::Table::Component` or `Bali::DataTable::Component`
- `<dl>` definition lists -> `Bali::PropertiesTable::Component`
- Page headers (h1 + actions) -> `Bali::PageHeader::Component`
- `form_with` without builder -> Add `Bali::FormBuilder`
- `<div class="card">` -> `Bali::Card::Component`
- `<div class="modal">` -> `Bali::Modal::Component`

**MEDIUM priority** (repeated UI patterns):
- Styled lists -> `Bali::List::Component`
- Tab navigation -> `Bali::Tabs::Component`
- Breadcrumbs -> `Bali::Breadcrumb::Component`
- Dropdowns/menus -> `Bali::Dropdown::Component` or `Bali::ActionsDropdown::Component`
- Grid layouts -> `Bali::Columns::Component`
- Badges -> `Bali::Tag::Component`
- Alert boxes -> `Bali::Message::Component`

**LOW priority** (specialized):
- Star ratings, charts, calendars, carousels, maps, heatmaps, Gantt charts
- These are lower priority but still valuable if raw HTML is found

Consult **`references/patterns.md`** for the complete pattern-to-component mapping across all 50+ components.

### Step 4: Verify APIs Before Suggesting

**Before suggesting ANY component replacement**, verify the API:

1. Invoke the `bali-components` skill -- it has per-component reference files with correct parameters, slots, and examples
2. If the bali-components skill is unavailable, read the component source directly at the gem's installed location

Never guess slot names or parameters. The most common audit mistakes come from suggesting replacements with incorrect APIs.

### Step 5: Report Findings

For each finding, use this format:

```markdown
### [HIGH/MEDIUM/LOW] Description

**File:** `path/to/view.html.erb` (lines X-Y)

**Current:**
\```erb
[current code]
\```

**Suggested:**
\```erb
[replacement using Bali component with verified API]
\```

**Component reference:** See `bali-components` skill, `references/[component].md`
```

## Suggesting New Bali Components

Only suggest new components when ALL of these criteria are met:
1. Pattern appears 3+ times across views
2. Pattern has clear abstraction (not project-specific logic)
3. Pattern would benefit other AFAL projects

Format for new component suggestions:

```markdown
### NEW COMPONENT: Bali::[Name]::Component

**Pattern found in:**
- `app/views/foo/index.html.erb` (lines 10-20)
- `app/views/bar/show.html.erb` (lines 5-15)
- `app/views/baz/index.html.erb` (lines 30-40)

**Proposed API:**
\```ruby
Bali::[Name]::Component.new(param1:, param2:)
\```

**Rationale:** [Why this deserves to be a shared component]
```

## Priority Levels

| Priority | Criteria | Action |
|----------|----------|--------|
| **HIGH** | Structural (tables, forms, page layout) or incorrect API usage | Fix immediately |
| **MEDIUM** | Repeated UI patterns (lists, cards, badges, navs) | Fix in current PR |
| **LOW** | Cosmetic or specialized components | Track for later |

## Red Flags -- Stop and Verify

These thoughts indicate a likely mistake:

| Thought | Reality |
|---------|---------|
| "This component probably has X slot" | Read the reference. Probably is not definitely. |
| "The API is similar to DaisyUI" | Bali wraps DaisyUI but has its own API. |
| "I'll suggest the obvious replacement" | Obvious replacements often use wrong APIs. |
| "Card has a body slot" | It does NOT. Content goes directly in the block. |
| "Modal footer for buttons" | It is `with_actions`, not `with_footer`. |
| "Forms use ViewComponents" | Forms use `Bali::FormBuilder`, not ViewComponents. |

## Reference Files

- **`references/patterns.md`** -- Complete pattern-to-component mapping for all 50+ Bali components, anti-pattern detection list, and grep commands for scanning projects
