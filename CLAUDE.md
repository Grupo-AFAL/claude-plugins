# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code plugin marketplace for Grupo AFAL. This monorepo packages shared skills into focused plugins distributed to AFAL projects via the marketplace.

This is not a typical software project — there is no build system, no tests, no application code. The deliverables are markdown skill/agent files and JSON configuration.

## Repository Structure

```
.claude-plugin/
  marketplace.json   # Marketplace registry listing all plugins
rails-tools/
  .claude-plugin/plugin.json
  agents/
    dhh-code-reviewer.md
    rails-architect.md
  hooks/hooks.json
  scripts/dhh-review-persistence.cjs
  skills/            # 14 skills (architecture, implement, bali-components, etc.)
data-tools/
  .claude-plugin/plugin.json
  skills/
    fivetran-custom-connector/SKILL.md
oracle-tools/
  .claude-plugin/plugin.json
  skills/
    ebs-expert/SKILL.md
    oracle-jruby/SKILL.md
```

## Plugins

| Plugin | Install command | Target project |
|--------|----------------|----------------|
| `rails-tools` | `claude plugin install rails-tools` | AFAL Rails apps |
| `data-tools` | `claude plugin install data-tools` | Fivetran connector projects |
| `oracle-tools` | `claude plugin install oracle-tools` | oracle-gateway (JRuby/EBS) |

## Version Management

When releasing changes to a plugin, bump version in **both**:
- `<plugin>/.claude-plugin/plugin.json` (the `version` field)
- `.claude-plugin/marketplace.json` (the `version` field inside the plugin entry)

## Adding a New Skill

1. Create `<plugin>/skills/<skill-name>/SKILL.md` with YAML frontmatter (`name`, `description`)
2. Add `<plugin>/skills/<skill-name>/references/` files for detailed content
3. Update `README.md` with the skill description
4. Bump version in `<plugin>/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
5. Commit and push

## Adding a New Agent

1. Create `<plugin>/agents/<agent-name>.md` with YAML frontmatter (`name`, `description`, `model`, `color`, `tools`)
2. Update `README.md` with the agent description
3. Bump version in both JSON files
4. Commit and push

## Adding a New Plugin

1. Create `<plugin-name>/` with `.claude-plugin/plugin.json` and `skills/`
2. Add an entry to `.claude-plugin/marketplace.json`
3. Update `README.md` with a new plugin section
4. Commit and push

## Skill Conventions

Skills follow Claude Code SKILL.md format:
- YAML frontmatter with `name` and `description` fields
- `name` is the slash-command trigger (e.g., `bali-components` becomes `/bali-components`)
- `description` determines when Claude auto-invokes the skill — make it specific about trigger conditions, use third-person format
- Body uses imperative/infinitive form (not second person)
- Keep SKILL.md lean (~1,500-2,000 words); move detailed content to `references/`

## Agent Conventions

Agents follow Claude Code agent format:
- YAML frontmatter with `name`, `description` (with `<example>` blocks), `model`, `color`, `tools`
- Agents run as autonomous subprocesses with their own model and tool access
- `description` must include triggering examples for auto-invocation
- Content is the agent's system prompt

## AFAL Stack Context

`rails-tools` targets AFAL Rails applications which use:
- Rails 8.1 + Hotwire (Turbo + Stimulus), NOT SPAs
- Bali ViewComponents (DaisyUI/Tailwind), NOT raw ERB
- Minitest + Fixtures, NOT RSpec
- Pundit for authorization, OmniAuth with AFAL IdP for auth
- Solid Queue/Cache/Cable, NOT Redis
- SmartSuite for project/story management

`oracle-tools` targets the oracle-gateway project which uses:
- JRuby (not MRI), oracle_enhanced adapter, JDBC
- Oracle E-Business Suite (EBS) APIs and schema conventions
