# Running DHH Review Evals

## Prerequisites

- Target Rails project with `rails-tools` plugin installed
- The `skill-creator` skill installed (`claude plugin install skill-creator`)
- A feature branch with code changes (evals test branch review behavior)

## Setup

The evals test the iterative review-fix loop. For meaningful results, run against a branch that has real code changes with some imperfect code (anti-patterns, missing Bali components, etc.).

## Running Evals

From the target Rails project directory (e.g., `~/code/afal/gobierno-corporativo`):

```bash
# Ensure on a feature branch with changes
git checkout feature/some-branch

# Run the skill-creator eval pipeline
claude -p "/skill-creator eval rails-tools:dhh-review"
```

The eval pipeline will:
1. Spawn two agents per test case (with-skill vs without-skill)
2. Grade each run against the expectations
3. Produce a benchmark comparing pass rates

## What to Look For

- **With-skill pass rate should be significantly higher** than without-skill
- **Iterative loop**: The with-skill run should show multiple review passes
- **Auto-apply**: Fixes should be applied without user interaction
- **Test verification**: Tests should be run after each fix pass

## Recommended Test Branches

Choose a branch with:
- 3-10 changed files across models, controllers, and views
- Some code that violates Rails conventions (to test the fix loop)
- Existing test coverage (to verify fixes don't break things)
