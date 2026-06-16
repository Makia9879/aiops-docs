---
name: aiops-daily-doc-maintenance
description: Maintains existing AIOps human reading documents from unanalysed Git commits during git push. Use when a push hook starts documentation maintenance, when the user asks to analyze commits and update docs, or when reading docs need to catch up with code changes.
---

# Daily Documentation Maintenance

## Workflow

1. Ensure workspace governance exists. If `.aiops/governance.yaml` is missing, run `aiops-governance-bootstrap` unless the human refuses.
2. Identify the project and selected project iteration. If the iteration is unclear, ask the human before editing human reading docs.
3. Read `.aiops/projects/<project>/project.yaml`.
4. Read `.aiops/projects/<project>/iteration-bindings.yaml` before reading or editing human reading docs.
5. Read `.aiops/projects/<project>/commit-analysis.md`. If it does not exist, create it before maintenance.
6. Resolve the selected iteration into project docs branch, product versions, service `code_root`, and service `required_branch`.
7. Identify the source repo and pushed branch from the push hook arguments or from the human request.
8. Enforce the original project main-branch principle:
   - for project docs, the docs repo branch must match `docs_branch`;
   - for service docs, the source branch must match the service `required_branch`;
   - feature or temporary branches do not create document versions and should be skipped unless the human explicitly confirms maintenance against the selected project iteration.
9. Find the last analyzed commit for the same source repo and branch in `commit-analysis.md`.
10. List unanalysed commits after that cursor, in chronological order.
11. For each unanalysed commit:
    - read commit hash, commit time, subject, author, changed files, and diff;
    - inspect source code, tests, configs, manifests, migrations, and existing docs needed to understand the change;
    - use `codegraph` callers/callees/impact and `understand-anything` when graph context helps;
    - decide whether the human reading layer needs updates;
    - update related reading docs consistently;
    - record the analyzed commit hash and commit time in `commit-analysis.md` immediately after the commit is handled.
12. Run the review checklist for changed files.
13. Commit documentation changes when the push hook policy allows it.

## Commit Cursor

`commit-analysis.md` is the maintenance cursor. It replaces `pending.md` and threshold-based maintenance.

Recommended shape:

```md
# Commit Analysis

| Source repo | Branch | Commit | Commit time | Project | Product | Service | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /path/to/service | main | abc1234 | 2026-06-16T10:30:00+08:00 | cert | ca | ca-admin | updated workflows |
```

Rules:

- Record one row after each commit is successfully analyzed.
- Do not advance the cursor for a skipped or blocked commit unless the reason is explicitly recorded as `skipped`.
- If branch preflight fails, do not update reading docs and do not mark the commit analyzed.
- The next maintenance run starts after the last recorded commit for the same source repo and branch.

## Maintenance Rules

- Treat docs as code: small diffs, evidence-backed updates, no unrelated rewrites.
- Keep source paths current when files move.
- Remove stale claims when code contradicts them.
- If implementation and docs disagree, prefer implementation and record the contradiction.
- Always maintain docs against the selected project iteration binding. Local temporary source branches do not create new document versions.
- This workflow is modeled after `skills-seed learn history`: review unanalysed Git history incrementally, then update generated/maintained knowledge.
- Do not update docs by path alone. Use commit semantics to recall related context across the workspace.
- Do not mix source-code changes into automatic documentation commits unless the human explicitly asks.
- Do not create `specs/`, `cross/`, `integration.yaml`, or independent cross-product/service matrices. External upstream/downstream relationships belong in the current product or service reading docs; source and graph queries prove the implementation details.

## Git Push Hook Policy

- The source repository push hook starts this workflow by launching Claude Code from the docs workspace.
- The hook passes the source repo, local ref, remote ref, old commit, and new commit when available.
- Hooks do not write reading docs themselves.
- Hooks do not decide semantic document updates.
- Hooks do not use a pending queue or threshold counter.
- If Claude Code is unavailable, the hook should fail or report that maintenance could not run according to local policy; it should not fabricate maintenance records.

## Final Response

Report:

- Commits analyzed.
- Last recorded commit cursor.
- Documents changed.
- Evidence checked.
- Commit made or skipped, with reason.
- Any open questions or confidence limits.
