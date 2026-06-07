---
name: aiops-daily-doc-maintenance
description: Maintains existing AIOps structured knowledge documents from code diffs, feature work, refactors, or documentation drift. Use when the user asks a coding agent to update knowledge docs after changes, keep structured docs current, or modify only affected project knowledge sections.
---

# Daily Documentation Maintenance

## Workflow

1. Ensure workspace governance exists. If `.aiops/governance.yaml` is missing, run `aiops-governance-bootstrap` unless the human refuses.
2. Read `.aiops/diff-records/pending.md`.
3. Summarize the pending records semantically and extract keywords. Do not treat pending records as exact edit instructions.
4. Use the keywords to recall files and content across the whole workspace:
   - canonical docs under `.aiops/projects/<project>/`;
   - source code, tests, configs, manifests, migrations, and existing docs;
   - graph outputs from `understand-anything` or `codegraph` when available;
   - Trellis task/context files as evidence only, not as canonical source.
5. Determine all impacted canonical folders:
   - Product requirement or capability change -> `prd/`.
   - Architecture, component, dependency, runtime, or data-flow change -> `architecture/`.
   - Interface, API, CLI, config, protocol, state, extension, or delivery-plan change -> `specs/`.
   - Durable decision or tradeoff change -> `adr/`.
   - Business, operational, validation, or agent workflow change -> `workflows/`.
   - Human-facing explanation affected -> `guides/docs/`.
   - Unresolved or weak evidence -> `open-questions.md`.
6. Update related files and surrounding context consistently. For example, if an interface changes, check specs, workflows, architecture, and guides instead of editing only one file.
7. Archive handled pending sections into `.aiops/diff-records/archived/YYYY-MM-DD.md` and remove them from `pending.md`.
8. Run the review checklist for changed files.
9. Commit according to governance level.

## Maintenance Rules

- Treat docs as code: small diffs, evidence-backed updates, no unrelated rewrites.
- Keep source paths current when files move.
- Remove stale claims when code contradicts them.
- If implementation and docs disagree, prefer implementation and record the contradiction.
- Add validation commands when a change creates a new maintenance path.
- Hooks record, remind, and trigger maintenance; hooks must not directly rewrite canonical docs.
- Do not update docs by path alone. Always use the semantic meaning of `pending.md` to recall related context across the workspace.
- Do not use `.aiops/diff-records/archived/` as active recall input or maintenance debt.
- Do not mix source-code changes into automatic documentation commits unless the human explicitly asks.

## Governance Levels

- `low`: record only; do not auto-commit.
- `medium`: record and remind; do not auto-commit.
- `high`: default. After threshold-driven maintenance succeeds, may auto-commit documentation-only or governance-only changes.
- `xhigh`: stronger. Trigger earlier, may block session end through hooks, and auto-commit successful documentation-only or governance-only maintenance when safe.

Automatic commit message:

```text
docs(aiops): <动作> <project> 知识库
```

## Final Response

Report:

- Documents changed.
- Evidence checked.
- Pending records archived.
- Commit made or skipped, with reason.
- Any open questions or confidence limits.
