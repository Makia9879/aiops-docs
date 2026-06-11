# 0001. Use a routed skill set for the AIOps knowledge lifecycle

Date: 2026-06-07

## Status

Accepted

## Context

The AIOps knowledge workflow must cover four different input scenarios:

- Historical projects: existing code and docs are converted into structured knowledge.
- Development context recall: coding agents recall structured knowledge before or during implementation, debugging, review, or explanation.
- Daily maintenance: coding agents update existing knowledge from code changes.
- New projects: requirements input is converted into initial structured knowledge.

These scenarios share evidence, schema, and review rules, but users naturally invoke them with different language.

## Decision

Implement the workflow as multiple independently triggerable skills plus one routing skill:

- `aiops-knowledge-lifecycle`
- `aiops-dev-context-recall`
- `aiops-historical-project-intake`
- `aiops-daily-doc-maintenance`
- `aiops-new-project-briefing`
- `aiops-knowledge-review`

The routing skill identifies the scenario and delegates to the relevant scenario skill. Shared rules live in references owned by the lifecycle skill.

## Consequences

Each scenario can have a precise skill description and a shorter instruction body. Shared rules must stay stable and versioned carefully, because all scenario skills depend on them.
