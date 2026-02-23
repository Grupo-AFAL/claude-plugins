---
name: docs-review
description: This skill should be used when the user asks to "review the docs", "check documentation quality", "are the docs accurate", "review docs before release", "docs quality check", "verify documentation", or invokes /docs-review. Reviews existing documentation for accuracy against the codebase, audience appropriateness, and structural correctness.
---

# Documentation Review

Review the existing Astro Starlight documentation site for quality, accuracy, and audience appropriateness. Use before releases or when the docs site has grown and needs a health check.

## Scope

Run a full review by default. Narrow to a specific section if the user specifies one (e.g. "review only the authentication docs").

## Review Process

### 1. Inventory existing pages

```bash
find docs/src/content/docs -name "*.mdx" -o -name "*.md" | sort
```

List all pages and their sidebar positions. Note which are in the end-user sections vs. the technical reference section.

### 2. Review each page against the checklist

Work through `references/review-checklist.md` for each page. Do not read all pages into context at once — review one section at a time.

For each page:
1. Read the MDX source
2. Read the corresponding source code (controller, model, or lib file) to verify accuracy
3. Apply the checklist
4. Note issues

### 3. Produce a review report

Group findings by severity:

```
## Documentation Review Report

### Critical (inaccurate or misleading)
- <page> — <issue> — <suggested fix>

### Important (audience mismatch, structure problems)
- <page> — <issue>

### Minor (style, formatting, completeness gaps)
- <page> — <issue>

### Passed
- ✓ <page>
```

### 4. Fix or propose fixes

For critical and important issues: fix immediately if straightforward, or describe what needs to change if it requires significant rewriting.

For minor issues: list them and ask the user whether to address them now or defer.

Always run `cd docs && bun run build` after making any changes to confirm zero errors.

## Additional Resources

- **`references/review-checklist.md`** — Full per-page review criteria across accuracy, audience, structure, and MDX validity
