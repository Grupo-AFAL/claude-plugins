# AFAL Claude Plugins

Private Claude Code plugin marketplace for Grupo AFAL. This repository packages shared skills for distribution across AFAL Rails applications.

## Installation

Add this marketplace to Claude Code:

```bash
claude plugin marketplace add Grupo-AFAL/afal-claude-plugins
```

Install the plugin:

```bash
claude plugin install afal-rails-tools
```

## Included Agents

### `dhh-code-reviewer`
Elite code reviewer channeling DHH's standards for Rails craftsmanship. Reviews Ruby, Rails, JavaScript, Stimulus, and ViewComponent code. Used by `/architecture` and `/omc-rails-autopilot` for iterative review passes. Gives a "Rails-worthy" or "needs changes" verdict.

### `rails-architect`
Feature architecture specialist that generates comprehensive specs (models, controllers, views, tests). Produces deliberately over-engineered first drafts that get refined through DHH review iterations.

## Included Skills

### `/architecture`
Generates refined architecture specifications through iterative DHH review. Invokes the `rails-architect` agent to produce a comprehensive spec, then the `dhh-code-reviewer` agent to refine it over 3 iterations. Output: a Rails-worthy spec ready for implementation.

### `/implement`
Structured implementation from an approved architecture spec. Creates a todo list from the spec, implements step-by-step with tests after each change, runs full verification (tests, rubocop, brakeman), and gets a DHH code review before finalization.

### `/review`
Code review against DHH/37signals standards. Accepts a file, directory, glob, `--staged`, or `--branch`. Runs automated checks (Rubocop, Brakeman), invokes the `dhh-code-reviewer` agent, and produces a structured report with severity levels and actionable fixes.

### `/omc-rails-autopilot`
Autonomous development workflow for Rails applications following AFAL conventions. Fetches user stories from SmartSuite, implements features following Rails/Hotwire/Bali patterns, runs tests, and creates PRs.

### `/bali-components`
Reference guide for Bali ViewComponents library. Provides accurate API documentation for forms, cards, modals, drawers, lists, and other UI components used in AFAL applications.

### `/bali-view-audit`
Audits view files for Bali component usage. Identifies missing components, incorrect patterns, and opportunities to use Bali instead of raw HTML.

### `/pundit-authorization`
Multi-tenant Pundit authorization patterns for AFAL apps. Covers OwnedByOrganization scoping, policy classes, role-based access, controller integration, and testing with Minitest fixtures.

### `/hotwire-patterns`
Decision guide and implementation patterns for Turbo Drive, Frames, Streams, and Stimulus in AFAL apps. Includes when to use each tool, Bali integration, and common anti-patterns.

### `/afal-auth`
OmniAuth-based authentication with AFAL IdP. Covers the complete auth flow, session management, route protection, multi-tenancy, and test helpers. Prevents suggesting Devise or local passwords.

### `/solid-stack`
Database-backed infrastructure with Solid Queue, Solid Cache, and Solid Cable (Rails 8.1). Covers job processing, caching strategies, WebSocket channels, and deployment considerations.

### `/turbo-mount-react`
React islands architecture via the turbo-mount gem. Covers when to use React vs Hotwire, component mounting, props serialization, Turbo Stream compatibility, and cross-island communication.

### `/api-endpoints`
RESTful API development with Blueprinter serialization. Covers response structure, controller patterns, composable blueprint views, Pagy pagination, Ransack filtering, and testing API endpoints.

### `/afal-concerns`
Catalog of reusable Rails model concerns (OwnedByOrganization, Evidenceable, Auditable, Archivable, etc.). Covers composition patterns and when to create new concerns.

### `/rails-migration-safety`
Zero-downtime database migration patterns. Covers safe column operations, multi-deploy rename/type-change processes, data migrations, rollback strategies, and strong_migrations integration.

### `/rails-conventions`
DHH-style Rails conventions enforcement for code reviews. Covers controller/model/view patterns, common anti-patterns, and a review checklist aligned with the Rails Doctrine.

## Adding New Skills

1. Create a new directory under `skills/`
2. Add a `SKILL.md` file following Claude Code skill format
3. Update this README with the skill description
4. Bump version in `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
5. Commit and push changes

## License

UNLICENSED - Private internal use only.
