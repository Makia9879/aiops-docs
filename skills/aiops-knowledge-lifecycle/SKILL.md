---
name: aiops-knowledge-lifecycle
description: Routes AIOps knowledge-base work across historical project intake, daily documentation maintenance, new project briefing, and knowledge review. Use when the user asks to manage an AIOps knowledge base, create structured project knowledge, maintain docs with a coding agent, or decide which AIOps knowledge workflow to run.
---

# AIOps Knowledge Lifecycle

## Purpose

Manage workspace-level AIOps knowledge governance. The governed object is the whole workspace, with project knowledge stored under `.aiops/projects/<project>/`.

The lifecycle covers:

- Bootstrap: install governance structure, project skeleton, guides site, hooks, and defaults.
- Historical project intake: existing code/docs -> canonical project knowledge.
- Daily documentation maintenance: pending semantic changes -> consistent doc updates.
- New project briefing: requirements input -> initial canonical project knowledge.
- Knowledge review: completeness, evidence, agent usability, and human readability checks.

Canonical docs are Markdown-first. Do not require JSONL, per-file frontmatter, or structured metadata beyond the project/workspace config files.

## Route

Before running any governance workflow:

1. Recursively search upward from the current directory for `.aiops/governance.yaml`.
2. If found, use that `.aiops/` as the workspace governance root.
3. If missing, tell the human that AIOps governance is not initialized and run `aiops-governance-bootstrap`, unless the human explicitly refuses.
4. If the user asks for `install`, `init`, or `setup`, route to `aiops-governance-bootstrap`.

Classify the user's request:

- Install, setup, initialize, hooks, governance marker, or project skeleton: use `aiops-governance-bootstrap`.
- Existing workspace or legacy project to summarize: use `aiops-historical-project-intake`.
- Existing structured docs need update after code/design changes: use `aiops-daily-doc-maintenance`.
- New project from requirements, meeting notes, PRD, or rough idea: use `aiops-new-project-briefing`.
- User asks to audit, review, improve, or validate the knowledge base: use `aiops-knowledge-review`.

If the request spans multiple scenarios, run them in this order:

1. Bootstrap if `.aiops/governance.yaml` is missing.
2. Historical intake or new briefing.
3. Daily maintenance for specific changes.
4. Knowledge review.

## Shared References

Before writing or reviewing project knowledge, read only the relevant shared references:

- `references/document-schema.md` for target file structure.
- `references/evidence-rules.md` for citation, uncertainty, and source rules.
- `references/toolchain.md` for `understand-anything`, `codegraph`, and fallback exploration.
- `references/review-checklist.md` for final quality gates.

When this skill is installed separately from the workspace source copy, locate references first at:

```text
~/.agents/skills/aiops-knowledge-lifecycle/references/
```

Fallback to the workspace source copy when working inside this workspace:

```text
skills/aiops-knowledge-lifecycle/references/
```

## Output Rule

Canonical knowledge documents are for coding agents first. Prefer concrete file paths, entry points, invariants, impact boundaries, and validation commands over broad narrative.

Human-friendly reading belongs in `.aiops/projects/<project>/guides/docs/`. Keep project `README.md` as an index/navigation page, not a long article.

## Governance Levels

- `low`: record to `.aiops/diff-records/pending.md`; do not auto-commit.
- `medium`: record and gently remind; do not auto-commit.
- `high`: default. Record, remind, and allow threshold-driven automatic maintenance; may auto-commit doc/governance-only changes.
- `xhigh`: stronger governance. Trigger maintenance earlier, may block session end through hooks, and auto-commit successful doc/governance-only maintenance when safe.

Automatic commits must never include source-code changes unless the human explicitly asks. Use:

```text
docs(aiops): <动作> <project> 知识库
```
