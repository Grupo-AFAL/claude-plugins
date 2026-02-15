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

## Included Skills

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

### `/jsonapi-endpoints`
JSON:API spec-compliant API development. Covers response structure, controller patterns, serialization, pagination, sparse fieldsets, error format, and testing API endpoints.

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
