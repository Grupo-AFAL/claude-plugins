# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code plugin marketplace for Grupo AFAL. It packages shared skills and agents into the `afal-rails-tools` plugin, distributed to AFAL Rails projects via `claude plugin install afal-rails-tools`.

This is not a typical software project -- there is no build system, no tests, no application code. The deliverables are markdown skill/agent files and JSON configuration.

## Repository Structure

```
.claude-plugin/
  plugin.json        # Plugin metadata (name, version, description)
  marketplace.json   # Marketplace registry listing this plugin
agents/
  dhh-code-reviewer.md  # DHH-style code reviewer (used by /architecture and /omc-rails-autopilot)
  rails-architect.md    # Feature architecture spec generator (used by /architecture)
skills/
  architecture/SKILL.md         # Iterative spec generation with DHH reviews
  implement/SKILL.md            # Structured implementation from approved specs
  omc-rails-autopilot/SKILL.md  # Autonomous dev workflow with SmartSuite integration
  bali-components/SKILL.md      # Bali ViewComponent API reference
  bali-view-audit/SKILL.md      # View auditing for Bali component adoption
  ... (14 skills total)
```

## Version Management

Version must be updated in **both** files when releasing:
- `.claude-plugin/plugin.json` (the `version` field)
- `.claude-plugin/marketplace.json` (the `version` field inside the plugin entry)

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md` with YAML frontmatter (`name`, `description`)
2. Update `README.md` with the skill description
3. Bump version in both JSON files
4. Commit and push

## Adding a New Agent

1. Create `agents/<agent-name>.md` with YAML frontmatter (`name`, `description`, `model`, `color`, `tools`)
2. Update `README.md` with the agent description
3. Bump version in both JSON files
4. Commit and push

## Skill Conventions

Skills follow Claude Code SKILL.md format:
- YAML frontmatter with `name` and `description` fields
- `name` is the slash-command trigger (e.g., `bali-components` becomes `/bali-components`)
- `description` determines when Claude auto-invokes the skill -- make it specific about trigger conditions
- Content is the full prompt/instructions loaded when the skill is invoked

## Agent Conventions

Agents follow Claude Code agent format:
- YAML frontmatter with `name`, `description` (with `<example>` blocks), `model`, `color`, `tools`
- Agents run as autonomous subprocesses with their own model and tool access
- `description` must include triggering examples for auto-invocation
- Content is the agent's system prompt

## AFAL Stack Context

These skills target AFAL Rails applications which use:
- Rails 8.1 + Hotwire (Turbo + Stimulus), NOT SPAs
- Bali ViewComponents (DaisyUI/Tailwind), NOT raw ERB
- Minitest + Fixtures, NOT RSpec
- Pundit for authorization, OmniAuth with AFAL IdP for auth
- Solid Queue/Cache/Cable, NOT Redis
- SmartSuite for project/story management
