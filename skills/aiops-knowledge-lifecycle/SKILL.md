---
name: aiops-knowledge-lifecycle
description: Routes AIOps knowledge-base work across historical project intake, development context recall, daily documentation maintenance, new project briefing, and knowledge review. Use when the user asks to manage an AIOps knowledge base, create structured project knowledge, recall project docs for coding work, maintain docs with a coding agent, or decide which AIOps knowledge workflow to run.
---

# AIOps Knowledge Lifecycle

## Purpose

Manage workspace-level AIOps knowledge governance. The governed object is the whole workspace, with project knowledge stored under `.aiops/projects/<project>/`.

The human reading structure is project -> product -> service:

- project iteration docs live under `.aiops/projects/<project>/iterations/<project-iteration>/`;
- product docs live under `.aiops/projects/<project>/products/<product>/`;
- service docs live under `.aiops/projects/<project>/products/<product>/services/<service>/`.

The lifecycle covers:

- Bootstrap: install governance structure, project skeleton, guides site, hooks, and defaults.
- Historical project intake: existing code/docs/history/graphs -> human reading layer.
- Development context recall: human reading layer -> source and graph evidence -> coding-agent development context.
- Daily documentation maintenance: git push hook -> unanalysed commits -> consistent reading-doc updates.
- New project briefing: requirements input -> initial human reading layer.
- Knowledge review: completeness, evidence, agent usability, and human readability checks.

Human reading docs are Markdown-first. Do not require JSONL, per-file frontmatter, or structured metadata beyond the project/workspace config files.

Project iteration binding is mandatory before maintenance. Workflows that write human reading docs must read `.aiops/projects/<project>/iteration-bindings.yaml` and maintain docs against:

```text
project iteration -> product version -> service required_branch
```

Products have versions. Services have required main branches. Do not create service versions or document versions for local temporary source branches.

## Route

Before running any governance workflow:

1. Recursively search upward from the current directory for `.aiops/governance.yaml`.
2. If found, use that `.aiops/` as the workspace governance root.
3. If missing, tell the human that AIOps governance is not initialized and run `aiops-governance-bootstrap`, unless the human explicitly refuses.
4. If the user asks for `install`, `init`, or `setup`, route to `aiops-governance-bootstrap`.
5. For any workflow that writes human reading docs, identify the project and selected project iteration, then read `project.yaml` and `iteration-bindings.yaml`.
6. For service-level writes, compare each impacted service `code_root` current branch with the iteration binding `required_branch`.
7. If a service current branch does not match `required_branch`, do not modify human reading docs by default. Remind the human to switch branches or explicitly confirm that this maintenance still belongs to the selected project iteration. Until confirmation, record the mismatch in open questions and do not advance the commit-analysis cursor.

Classify the user's request:

- Install, setup, initialize, hooks, governance marker, or project skeleton: use `aiops-governance-bootstrap`.
- Existing workspace or legacy project to summarize: use `aiops-historical-project-intake`.
- Coding, debugging, review, explanation, or implementation work that should use project docs: use `aiops-dev-context-recall`.
- Existing structured docs need update after code/design changes: use `aiops-daily-doc-maintenance`.
- New project from requirements, meeting notes, PRD, or rough idea: use `aiops-new-project-briefing`.
- User asks to audit, review, improve, or validate the knowledge base: use `aiops-knowledge-review`.

If the request spans multiple scenarios, run them in this order:

1. Bootstrap if `.aiops/governance.yaml` is missing.
2. Historical intake or new briefing.
3. Development context recall before implementation, debugging, review, or explanation.
4. Daily maintenance for specific changes after implementation or design drift.
5. Knowledge review.

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

Human reading documents are for people first, and for agents as business/navigation context. Prefer concise business maps, architecture boundaries, workflows, ADRs, source paths, and graph queries over implementation specs.

Rendered human-friendly site pages belong in `.aiops/projects/<project>/guides/docs/`. Keep project `README.md` as an index/navigation page, not a long article.

External upstream/downstream relationships belong in the current product or service reading docs. Include business responsibility and source/graph navigation; call entry points, protocols, error semantics, and validation paths are verified from source and graphs. Do not create `specs/`, `cross/`, `integration.yaml`, or independent cross-product/service matrices.

## Governance Levels

- `low`: push hook can report unanalysed commits but should not auto-run maintenance.
- `medium`: push hook can run maintenance and ask before committing reading-doc changes.
- `high`: default. Push hook runs Claude Code maintenance for unanalysed commits and may auto-commit doc/governance-only changes.
- `xhigh`: stronger governance. Push hook may block push when maintenance fails or reading docs remain inconsistent.

Automatic commits must never include source-code changes unless the human explicitly asks. Use:

```text
docs(aiops): <动作> <project> 知识库
```
