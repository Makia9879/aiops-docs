---
name: aiops-daily-doc-maintenance
description: Maintains existing AIOps structured knowledge documents from code diffs, feature work, refactors, or documentation drift. Use when the user asks a coding agent to update knowledge docs after changes, keep structured docs current, or modify only affected project knowledge sections.
---

# Daily Documentation Maintenance

## Workflow

1. Ensure workspace governance exists. If `.aiops/governance.yaml` is missing, run `aiops-governance-bootstrap` unless the human refuses.
2. Identify the project and selected project iteration. If the iteration is unclear, ask the human before editing canonical docs.
3. Read `.aiops/projects/<project>/project.yaml`.
4. Read `.aiops/projects/<project>/iteration-bindings.yaml` before reading or editing canonical docs.
5. Resolve the selected iteration into project docs branch, product versions, service `code_root`, and service `required_branch`.
6. For service-level maintenance, check the current branch with `git -C <code_root> branch --show-current`.
7. If `current branch != required_branch`, do not modify canonical docs by default. Tell the human:

   ```text
   当前 <service> 在 <current branch>，但项目迭代 <iteration> 要求 <required_branch>。
   请切换源码分支，或确认本次文档仍基于 <iteration> 的绑定关系维护。
   ```

   Until the human confirms, only record the mismatch in `.aiops/diff-records/pending.md` or the relevant `open-questions.md`.
8. Read `.aiops/diff-records/pending.md`.
9. Summarize the pending records semantically and extract keywords. Do not treat pending records as exact edit instructions.
10. Use the keywords to recall files and content across the whole workspace:
   - canonical docs under `.aiops/projects/<project>/`;
   - source code, tests, configs, manifests, migrations, and existing docs;
   - graph outputs from `understand-anything` or `codegraph` when available;
   - Trellis task/context files as evidence only, not as canonical source.
11. Determine all impacted canonical folders:
   - Project iteration scope, release risk, shared constraints, or global delivery cadence -> `iterations/<project-iteration>/`.
   - Product requirement or product capability change -> `products/<product>/prd/`.
   - Product architecture, internal service boundaries, product-level dependency, runtime, or data-flow change -> `products/<product>/architecture/`.
   - Product interface, protocol, state, extension, or delivery-plan change -> `products/<product>/specs/`.
   - Product durable decision or tradeoff change -> `products/<product>/adr/`.
   - Product business, operational, validation, or agent workflow change -> `products/<product>/workflows/`.
   - Service architecture, API/RPC/config/database/message contract, runtime, business rule, or validation command -> `products/<product>/services/<service>/{architecture,specs,workflows,adr}/`.
   - Human-facing explanation affected -> `guides/docs/`.
   - Unresolved or weak evidence -> `open-questions.md`.
12. Update related files and surrounding context consistently. For example, if an interface changes, check specs, workflows, architecture, and guides instead of editing only one file.
13. Archive handled pending sections into `.aiops/diff-records/archived/YYYY-MM-DD.md` and remove them from `pending.md`.
14. Run the review checklist for changed files.
15. Commit according to governance level.

## Maintenance Rules

- Treat docs as code: small diffs, evidence-backed updates, no unrelated rewrites.
- Keep source paths current when files move.
- Remove stale claims when code contradicts them.
- If implementation and docs disagree, prefer implementation and record the contradiction.
- Add validation commands when a change creates a new maintenance path.
- Always maintain docs against the selected project iteration binding. Local temporary source branches do not create new document versions.
- Record the project iteration, product version, service `required_branch`, and any human branch-mismatch confirmation in the maintenance summary, diff record, or commit context.
- Hooks record, remind, and trigger maintenance; hooks must not directly rewrite canonical docs.
- Do not update docs by path alone. Always use the semantic meaning of `pending.md` to recall related context across the workspace.
- Do not use `.aiops/diff-records/archived/` as active recall input or maintenance debt.
- Do not mix source-code changes into automatic documentation commits unless the human explicitly asks.
- Do not create `cross/`, `integration.yaml`, or independent cross-product/service matrices. External upstream/downstream relationships belong in the current product or service canonical docs, with the counterpart docs used only as supporting evidence.

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
