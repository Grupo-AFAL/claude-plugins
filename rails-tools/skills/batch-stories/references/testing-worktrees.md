# Manual Testing Guide for Worktree-Based Story PRs

Each story runs in its own git worktree. This guide covers how to test, review, and clean up.

## Listing Active Worktrees

```bash
git worktree list
```

Output:
```
/Users/you/code/afal/project           abc1234 [main]
/Users/you/code/afal/gobierno-corporativo/.worktrees/feature/GC-FND-002-US01  def5678 [feature/GC-FND-002-US01]
/Users/you/code/afal/gobierno-corporativo/.worktrees/feature/GC-FND-002-US02  ghi9012 [feature/GC-FND-002-US02]
```

## Option A: Test Directly in the Worktree (Recommended)

Navigate to the worktree directory — a full copy of the repo with its own branch checked out:

```bash
# Go to the story's worktree
cd .worktrees/feature/GC-FND-002-US01

# Install dependencies (if needed)
bundle install
bin/rails db:migrate

# Run the app
bin/rails server -p 3001

# Run tests
bin/rails test

# Run quality checks
bin/rubocop
bin/brakeman --no-pager -q
```

Each worktree is independent — run multiple servers on different ports to test multiple stories simultaneously:

```bash
# Terminal 1: Story US01 on port 3001
cd .worktrees/feature/GC-FND-002-US01 && bin/rails server -p 3001

# Terminal 2: Story US02 on port 3002
cd .worktrees/feature/GC-FND-002-US02 && bin/rails server -p 3002
```

## Option B: Continue Working in the Worktree

After manual testing, make additional changes directly in the worktree. The worktree is a full repo checkout — edit files, run tests, commit, and push as normal:

```bash
cd .worktrees/feature/GC-FND-002-US01

# Make fixes based on manual testing
# ... edit files ...

# Commit and push
git add -A
git commit -m "fix(GC-FND-002-US01): address manual testing feedback"
git push
```

To re-run a review or later autopilot phases from the worktree:

```bash
cd .worktrees/feature/GC-FND-002-US01
claude -p "/omc-rails-autopilot GC-FND-002-US01"
```

## Option C: Check Out the Branch in the Main Repo

To work from the main repo directory instead (only after removing the worktree):

```bash
# From the main project directory
git checkout feature/GC-FND-002-US01

# Test normally
bin/rails test
bin/rails server

# Switch to next story
git checkout feature/GC-FND-002-US02
```

**Note:** Stash or commit any local changes before switching branches.

## Option D: Review on GitHub

Each story creates a PR. Review the diff, CI results, and screenshots directly on GitHub:

```bash
# List all open PRs from batch
gh pr list --label batch-stories

# View a specific PR
gh pr view 42

# Check CI status
gh pr checks 42
```

## Cleaning Up Worktrees

After testing and merging PRs, clean up the worktrees:

```bash
# Remove a specific worktree
git worktree remove .worktrees/feature/GC-FND-002-US01

# Remove all batch worktrees at once
git worktree list | grep worktrees/feature | awk '{print $1}' | xargs -I{} git worktree remove {}

# Prune stale worktree references
git worktree prune

# Delete merged remote branches
git fetch --prune
```

## Testing Checklist Per Story

For each story PR, verify:

- [ ] `bin/rails test` passes (all tests green)
- [ ] `bin/rubocop` clean (no offenses)
- [ ] `bin/brakeman --no-pager -q` clean (no warnings)
- [ ] Feature is accessible from the UI (not just by URL)
- [ ] Bali components used correctly (no raw HTML for available components)
- [ ] Authorization gates in place (Pundit policies)
- [ ] Screenshots in `docs/src/assets/screenshots/<story-id>/` look correct
- [ ] CHANGELOG.md entry present
- [ ] Documentation updated (if docs site exists)
