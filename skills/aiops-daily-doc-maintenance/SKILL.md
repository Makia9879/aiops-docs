---
name: aiops-daily-doc-maintenance
description: Maintains existing AIOps structured knowledge documents from code diffs, feature work, refactors, or documentation drift. Use when the user asks a coding agent to update knowledge docs after changes, keep structured docs current, or modify only affected project knowledge sections.
---

# Daily Documentation Maintenance

## Workflow

1. Identify the changed code, docs, config, or requirements.
2. Read existing project knowledge under `knowledge/projects/<project>/`.
3. Read shared references from `aiops-knowledge-lifecycle`: evidence rules, document schema, review checklist.
4. Determine impacted files:
   - Architecture change -> `01-architecture.md`, maybe `09-maintenance-guide.md`.
   - Domain term or invariant change -> `02-domain-model.md`.
   - Capability change -> `03-capabilities.md`.
   - Flow change -> `04-workflows.md`.
   - CLI/API/config change -> `05-interfaces.md`.
   - State/data change -> `06-data-and-state.md`.
   - Build/run/release change -> `07-operations.md`.
   - Extension change -> `08-extension-points.md`.
5. Use `codegraph`, existing graphs, `rg`, and targeted reads to verify impact.
6. Update only affected sections and preserve stable document structure.
7. Move unresolved claims to `90-open-questions.md`.
8. Run the review checklist for changed files.

## Maintenance Rules

- Treat docs as code: small diffs, evidence-backed updates, no unrelated rewrites.
- Keep source paths current when files move.
- Remove stale claims when code contradicts them.
- If implementation and docs disagree, prefer implementation and record the contradiction.
- Add validation commands when a change creates a new maintenance path.

## Final Response

Report:

- Documents changed.
- Evidence checked.
- Any open questions or confidence limits.
