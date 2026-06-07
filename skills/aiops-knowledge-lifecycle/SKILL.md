---
name: aiops-knowledge-lifecycle
description: Routes AIOps knowledge-base work across historical project intake, daily documentation maintenance, new project briefing, and knowledge review. Use when the user asks to manage an AIOps knowledge base, create structured project knowledge, maintain docs with a coding agent, or decide which AIOps knowledge workflow to run.
---

# AIOps Knowledge Lifecycle

## Purpose

Manage the full lifecycle of agent-executable project knowledge:

- Historical project intake: existing code/docs -> structured knowledge.
- Daily documentation maintenance: code changes -> targeted doc updates.
- New project briefing: requirements input -> initial structured knowledge.
- Knowledge review: schema/evidence/agent-readiness checks.

## Route

Classify the user's request:

- Existing repository or legacy project to summarize: use `aiops-historical-project-intake`.
- Existing structured docs need update after code/design changes: use `aiops-daily-doc-maintenance`.
- New project from requirements, meeting notes, PRD, or rough idea: use `aiops-new-project-briefing`.
- User asks to audit, review, improve, or validate the knowledge base: use `aiops-knowledge-review`.

If the request spans multiple scenarios, run them in this order:

1. Historical intake or new briefing.
2. Daily maintenance for specific changes.
3. Knowledge review.

## Shared References

Before writing or reviewing project knowledge, read only the relevant shared references:

- `references/document-schema.md` for target file structure.
- `references/evidence-rules.md` for citation, uncertainty, and source rules.
- `references/toolchain.md` for `understand-anything`, `codegraph`, and fallback exploration.
- `references/review-checklist.md` for final quality gates.

When this skill is installed separately from the repository, locate references first at:

```text
~/.agents/skills/aiops-knowledge-lifecycle/references/
```

Fallback to the repository source copy when working inside this repo:

```text
skills/aiops-knowledge-lifecycle/references/
```

## Output Rule

Knowledge documents are for coding agents first. Prefer concrete file paths, entry points, invariants, impact boundaries, and validation commands over human-facing marketing prose.
