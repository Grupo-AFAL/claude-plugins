---
name: update-docs
description: This skill should be used when the user asks to "update the docs", "sync documentation", "update documentation after changes", "keep docs in sync", "docs are outdated", "update docs to match code", or invokes /update-docs. Updates the Astro Starlight documentation site to reflect recent code changes by reading actual source files for accuracy.
---

# Update Documentation

Update the Astro Starlight documentation site (`docs/`) to reflect recent code changes.

## Instructions

### 1. Detect what changed

Use the user's description if provided. Otherwise, run the appropriate git command:

```bash
# Uncommitted local edits (most common — just made code changes):
git diff --name-only

# Staged changes:
git diff --cached --name-only

# Changes on current branch vs. main:
git diff main --name-only
```

### 2. Map code areas to doc files

First, check for a project-local mapping at `.claude/commands/update-docs.md`. If it exists, use its mapping instead of the generic table below.

If no project-local mapping exists, use the generic table and inspect `docs/src/content/docs/` to infer the actual structure:

Identify which documentation pages need updating based on what changed:

| Code area | Documentation to update |
|-----------|------------------------|
| `app/controllers/sessions_controller.rb`, auth concerns | Authentication docs |
| `app/models/<name>.rb` | Docs for that model's feature area |
| `app/controllers/<namespace>/` | Docs for that feature namespace |
| `lib/**/*.rb` (services, API clients) | Integration or API docs |
| `config/routes.rb` | Any page containing route tables |
| New controller or model | New MDX page + sidebar entry in `docs/astro.config.mjs` |

Check the project's existing `docs/src/content/docs/` structure to match code areas to specific files.

### 3. Read the actual source code

Read each changed source file before writing documentation. The code is always the source of truth — never guess or paraphrase from memory.

### 4. Update or create MDX pages

**Audience priority:** End-user pages (task guides for non-technical staff) take precedence over technical reference. When a code change affects both, update the end-user guide first and in more depth. Technical reference pages (API details, architecture notes) are secondary — update them but keep them in the collapsed "Referencia técnica" sidebar section.

- **Prefer diagrams over prose** for processes, flows, and relationships — use Mermaid fenced blocks (```mermaid) whenever a workflow, sequence, or system relationship is being documented
- Write all content in **Spanish**
- Match existing style: check other `.mdx` files in `docs/src/content/docs/` for formatting reference
- For end-user pages: write around tasks and outcomes, not internal mechanics — plain language, step-by-step
- For technical pages: accurate detail is fine, but keep them at the bottom of the sidebar (`collapsed: true`)
- Use Starlight components where appropriate: `Card`, `CardGrid`, `Tabs`, `Steps`
- Include code examples taken directly from the source
- Update parameter tables, route tables, and API endpoint details to reflect current code

MDX page structure:

```mdx
---
title: Page Title
description: Brief description for SEO/sidebar.
---

Content in Spanish.
```

Callout syntax:
- `:::note` — informational aside
- `:::caution` — warnings or gotchas
- `:::tip` — best practices

### 5. Include screenshots if available

Check for screenshots saved by the Rails Autopilot (Phase 2.5):

```bash
ls docs/src/assets/screenshots/ 2>/dev/null
```

If screenshots exist for the current story/feature, embed them in the relevant MDX pages after the prose description of each screen. Use relative paths from the MDX file location:

```mdx
![Vista del listado](../../../assets/screenshots/gc-fnd-002-us01/index.png)
```

Guidelines:
- Place screenshots **after** the prose description, not at the top of the page
- Use descriptive Spanish alt text that describes what the user sees
- One screenshot per major screen (list, detail, form) — avoid redundant shots
- Do not embed screenshots in the technical reference section

### 6. Update sidebar if needed

When pages are added or removed, update the `sidebar` array in `docs/astro.config.mjs`.

### 7. Verify the build

```bash
cd docs && bun run build
```

Fix any errors before finishing. The build must complete with zero errors.
