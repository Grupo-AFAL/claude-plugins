---
name: add-docs-site
description: This skill should be used when the user asks to "add a documentation site", "set up docs", "create a Starlight site", "add Astro docs", "scaffold documentation", "create a docs site", or invokes /add-docs-site. Scaffolds an Astro Starlight documentation site inside a Rails application with Docker, CI, and dev server integration.
---

# Add Astro Starlight Documentation Site

Scaffold an Astro Starlight documentation site inside a Rails application. The site builds to `public/docs/` (static HTML) and is served by Thruster/ActionDispatch with zero Rails config changes.

## Documentation Structure

The primary audience is **end users** — non-technical staff from different business areas who use the software daily. Technical and developer documentation is secondary.

Structure the sidebar to reflect this:

| Section type | Position | Collapsed by default |
|-------------|----------|---------------------|
| Task-based guides for end users | Top — most visible | No |
| Feature walkthroughs, how-tos | Middle | No |
| Technical reference (API, architecture, environment) | Bottom | Yes |

Write end-user pages around **what the user does**, not how the system works internally. Use plain language, step-by-step flows, and screenshots when helpful. Technical accuracy still matters — read the source — but present it in terms of outcomes and tasks.

Developer/API documentation belongs in a collapsible "Referencia técnica" section at the bottom of the sidebar, not at the top.

## Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Location | `docs/` at repo root | Isolated from Rails, own package.json |
| Build output | `public/docs/` (gitignored) | Rails serves static files from `public/` — zero infra |
| Base path | `/docs` | All links resolve correctly under the sub-path |
| Package manager | bun | Fast installs, isolated from root yarn/npm |
| Language | Spanish only (no i18n) | AFAL convention — adjust `lang` in `astro.config.mjs` if needed |
| Dev server port | 4321 (Astro default) | Added to `Procfile.dev` |
| Lockfile | `docs/bun.lock` committed | Needed for `--frozen-lockfile` in Docker/CI |

## How Serving Works

No Rails config needed:

```
GET /docs/empezando/introduccion/
  → Thruster checks public/docs/empezando/introduccion/index.html → found
  → Serves static HTML (never hits Rails routing)
```

Both `ActionDispatch::Static` (dev) and Thruster (prod) serve `public/` before Rails routing.

## Workflow

Follow all 9 steps in `references/scaffold-steps.md` in order:

1. **Scaffold** — Create `docs/` directory structure and config files
2. **Content pages** — Write initial MDX pages from actual source code
3. **.gitignore** — Exclude build output and dependencies
4. **Install and verify** — `bun install`, `bun run build`, confirm output
5. **Dockerfile** — Add bun install + docs build to build stage
6. **Procfile.dev** — Add `docs:` entry for dev server
7. **CI workflow** — Add `.github/workflows/docs.yml`
8. **`/update-docs` skill** — Create project-local command with code-area mapping
9. **CHANGELOG** — Document what was added

## Content Sourcing

Read actual source code to generate accurate docs — never guess:

| Area | Files to read |
|------|--------------|
| Routes | `config/routes.rb` |
| Auth | `app/controllers/sessions_controller.rb`, auth concern |
| Models | `app/models/*.rb` |
| Controllers | `app/controllers/**/*.rb` |
| API/lib clients | `lib/**/*.rb` |
| Environment | `.env.example` |

All documentation is written in **Spanish**.

## Completion Checklist

- [ ] `docs/` directory structure created (Step 1)
- [ ] `package.json` name and `astro.config.mjs` title/sidebar customized
- [ ] Logo copied to `docs/src/assets/` and `docs/public/favicon.svg`
- [ ] Content pages written from actual source code (Step 2)
- [ ] `.gitignore` updated (Step 3)
- [ ] `bun install` run — `bun.lock` committed (Step 4)
- [ ] Build verified: `bun run build` — 0 errors (Step 4)
- [ ] Dockerfile updated (Step 5)
- [ ] `docs:` entry added to `Procfile.dev` (Step 6)
- [ ] `.github/workflows/docs.yml` created (Step 7)
- [ ] `/update-docs` project-local command created (Step 8)
- [ ] CHANGELOG updated (Step 9)
- [ ] `http://localhost:4321/docs/` works in dev
- [ ] All sidebar links resolve, no 404s

## Additional Resources

- **`references/scaffold-steps.md`** — Full step-by-step scaffold details (config files, Dockerfile snippets, CI YAML, brand CSS)
