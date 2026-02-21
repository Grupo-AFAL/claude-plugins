---
name: architecture
description: This skill should be used when the user asks to "generate an architecture spec", "design a feature", "create a spec for", "architecture for", "plan an implementation", "plan a feature", "spec out a feature", "write a technical spec", "draft an architecture document", "design the database schema for", or invokes /architecture with a path to a requirements document. Produces iteratively-refined specs using the rails-architect and dhh-code-reviewer agents.
---

# Generate Architecture Specification

Generate a refined architecture specification for a new feature using iterative DHH review.

## Usage

```
/architecture <path-to-requirements>
```

Where the argument is the path to a requirements document (e.g., `docs/requirements/user-notifications.md`).

## Workflow

### Step 1: Clarify Requirements

Evaluate whether the requirements document needs clarification. Ask at least 3 clarifying questions that will:

- Reduce ambiguity
- Prevent scope creep
- Result in a tighter implementation

Append clarifications to the requirements document in a `## Clarifications` section.

### Step 2: Fetch Documentation

If the feature requires external libraries not already documented in the project:

1. Use WebFetch to retrieve relevant documentation
2. Save summaries to `docs/stack/<library-name>.md` if they will be referenced repeatedly

Do NOT fetch documentation for libraries already in the codebase.

### Step 3: First Spec Iteration

Invoke the `rails-architect` agent to create the first specification:

- Pass the requirements document
- Pass any fetched documentation
- Pass relevant existing code patterns from the codebase

The first iteration will likely be over-engineered. That's expected.

**Output file**: `docs/plans/YYMMDD-XXa-feature-name.md`

### Step 4: DHH Review

Invoke the `dhh-code-reviewer` agent to review the first spec:

- Pass the specification
- Request written feedback

**Output file**: `docs/plans/YYMMDD-XXa-feature-name-dhh-feedback.md`

### Step 5: Second Spec Iteration

Pass to the `rails-architect` agent:
- First spec
- DHH feedback
- Requirements
- Documentation

Generate a refined second iteration.

**Output file**: `docs/plans/YYMMDD-XXb-feature-name.md`

### Step 6: Second DHH Review

Review the second iteration with `dhh-code-reviewer`.

**Output file**: `docs/plans/YYMMDD-XXb-feature-name-dhh-feedback.md`

### Step 7: Final Spec Iteration

Generate the final, tight specification.

**Output file**: `docs/plans/YYMMDD-XXc-feature-name.md`

### Step 8: Notify User

Summarize for the user:

1. **Key components** of the final spec (3 paragraphs max)
2. **Key improvements** from DHH reviews (3 paragraphs max)
3. **Ready for review** -- spec file location

## File Naming Convention

```
docs/plans/YYMMDD-XX[letter]-feature-name.md

Examples:
- 260110-01a-user-notifications.md  (first iteration)
- 260110-01b-user-notifications.md  (second iteration)
- 260110-01c-user-notifications.md  (final iteration)
- 260110-01a-user-notifications-dhh-feedback.md  (DHH review)
```

## Integration

| Command | When to Use |
|---------|-------------|
| `/architecture` | Generate and refine spec with DHH reviews (this skill) |
| `/implement` | Structured implementation from approved spec |
| `/dhh-review` | Ad-hoc code review against DHH standards |
| `/omc-rails-autopilot` | Full autonomous flow with SmartSuite tracking |
