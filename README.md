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

## Adding New Skills

1. Create a new directory under `skills/`
2. Add a `SKILL.md` file following Claude Code skill format
3. Update this README with the skill description
4. Bump version in `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
5. Commit and push changes

## License

UNLICENSED - Private internal use only.
