# Documentation Review Checklist

Apply to each page during `/docs-review`.

---

## Accuracy (read source code to verify)

- [ ] All route paths match `config/routes.rb`
- [ ] All field names match the model (no renamed or removed attributes)
- [ ] All described behaviors match the controller actions
- [ ] Code examples compile / are syntactically correct
- [ ] Environment variables listed in `.env.example` match what the page describes
- [ ] No references to features that were removed or renamed

## Audience Appropriateness

### For end-user pages (top sidebar sections)

- [ ] Written in plain Spanish — no jargon, no Rails/technical terms unless explained
- [ ] Structured around tasks ("Cómo crear un X") not internals ("El modelo X tiene campos...")
- [ ] Uses imperative steps for procedures ("Haz clic en...", "Ingresa el...")
- [ ] No implementation details that don't affect the user's workflow
- [ ] Screenshots or UI element names match the current interface (if mentioned)

### For technical reference pages (collapsed "Referencia técnica" section)

- [ ] Accurate technical detail is present (this audience needs precision)
- [ ] Page is in the collapsed sidebar section, not promoted to the top
- [ ] Appropriate for developers or admins, not general staff

## Structure and Formatting

- [ ] Frontmatter has both `title` and `description` fields
- [ ] `description` is a useful 1-2 sentence summary (used in sidebar and SEO)
- [ ] Heading hierarchy is logical (H2 → H3, no skipped levels)
- [ ] Tables used for structured data (parameters, routes, fields) — not prose lists
- [ ] Code blocks have language tags (`ruby`, `bash`, `json`, etc.)
- [ ] Callouts (`:::note`, `:::caution`, `:::tip`) used appropriately — not overused
- [ ] No dead internal links (links to other doc pages use correct slugs)
- [ ] Hero action links include the `/docs` base path prefix

## MDX Validity

- [ ] Starlight components imported before use (`import { Card } from "@astrojs/starlight/components"`)
- [ ] No raw HTML that could break the MDX parser
- [ ] No unclosed JSX tags
- [ ] Frontmatter YAML is valid (no unquoted special characters)

## Sidebar Consistency

- [ ] Page appears in the correct sidebar section (end-user vs. technical)
- [ ] `slug` in `astro.config.mjs` matches the file path
- [ ] Label in sidebar matches (or is a shorter version of) the page `title`
- [ ] "Referencia técnica" section has `collapsed: true`

## Content Completeness

- [ ] Page covers the full scope implied by its title — no major gaps
- [ ] "Empezando" / getting-started pages have a clear next step or call to action
- [ ] Any prerequisite knowledge or access requirements are stated upfront

---

## Severity Guide

| Severity | When to use |
|----------|-------------|
| **Critical** | Inaccurate information (wrong routes, wrong field names, missing required steps) |
| **Important** | Wrong audience tone, wrong sidebar position, broken links |
| **Minor** | Missing description, inconsistent formatting, incomplete coverage |
| **Passed** | Page meets all applicable checklist items |
