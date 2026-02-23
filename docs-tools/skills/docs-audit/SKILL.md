---
name: docs-audit
description: This skill should be used when the user asks to "audit the docs", "find documentation gaps", "what's not documented", "check docs coverage", "identify missing docs", "what features are undocumented", or invokes /docs-audit. Scans the Rails codebase to identify controllers, models, and routes that lack documentation pages.
---

# Documentation Audit

Identify what is missing from the documentation by comparing the codebase to the existing docs site.

## Workflow

### 1. Run the resource inventory script

From the Rails project root:

```bash
bash .claude/plugins/docs-tools/scripts/list-resources.sh
```

This outputs four lists: controllers, models, routes, and existing doc pages.

If the script path is not available, run each section manually:

```bash
# Controllers
find app/controllers -name "*.rb" -not -name "application_controller.rb" -not -path "*/concerns/*" | sort

# Models
find app/models -name "*.rb" -not -name "application_record.rb" -not -path "*/concerns/*" | sort

# Routes (resource declarations)
grep -E "^\s*(resources|resource|namespace|scope)\b" config/routes.rb | sort

# Existing doc pages
find docs/src/content/docs -name "*.mdx" -o -name "*.md" 2>/dev/null | sort
```

### 2. Categorize what exists

Group the codebase resources by feature area (namespace or domain), then check which have corresponding doc pages.

### 3. Identify gaps

For each resource with no corresponding doc page, classify the gap:

| Gap type | Priority | Audience |
|----------|----------|---------|
| Feature used by end users daily | High | End-user guide needed |
| Feature used occasionally | Medium | End-user guide needed |
| Internal/admin only | Low | Technical reference sufficient |
| API endpoint or lib integration | Low | Technical reference |

Ignore: test files, concerns, mailers, jobs (not user-facing).

### 4. Produce a gap report

Output a prioritized list:

```
## Documentation Gaps

### High priority (end-user features, no docs)
- [ ] <Feature name> — <controller/model file> — suggest: docs/src/content/docs/<path>.mdx

### Medium priority
- [ ] ...

### Low priority (technical reference only)
- [ ] ...

### Already documented
- ✓ <Feature> → <doc file>
```

### 5. Propose next steps

Suggest which gaps to address first based on:
- Business impact (how many users rely on it)
- Documentation complexity (simple feature = quick win)

Ask the user to confirm priorities before creating any pages. Use `/update-docs` to write the actual pages once priorities are confirmed.

## Scope

Focus on `app/controllers/` as the primary signal — every controller namespace that end users interact with should have at least one doc page. Models and routes are secondary signals to cross-reference.

Exclude from the report:
- `ApplicationController`, `ApplicationRecord`
- Files in `concerns/`
- `*Mailer`, `*Job`, `*Channel` (not user-facing)
- Admin-only controllers (unless the user says otherwise)
