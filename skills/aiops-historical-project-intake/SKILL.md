---
name: aiops-historical-project-intake
description: Converts an existing or legacy project workspace into structured AIOps knowledge-base documents. Use when the user asks to整理历史项目, summarize an existing workspace into structured docs, reverse-engineer project knowledge, or use understand-anything/codegraph to document a codebase.
---

# Historical Project Intake

## Workflow

1. Ensure workspace governance exists. If `.aiops/governance.yaml` is missing, run `aiops-governance-bootstrap` unless the human refuses.
2. Identify the source project root and target knowledge path: `.aiops/projects/<project>/`.
3. Read shared references from `aiops-knowledge-lifecycle`: document schema, evidence rules, toolchain, review checklist.
4. Confirm or correct `source_roots` in `.aiops/projects/<project>/project.yaml`; bootstrap inference is not enough for final intake.
5. Build or reuse project graph context:
   - Prefer `/understand <project-path> --full --language zh`.
   - Then run `/understand-domain` when domain flows matter.
   - Use `codegraph init -i` when available for follow-up source navigation.
6. Inventory source evidence:
   - README, manifests, entry points, command/API routes, config, tests, docs.
   - Graph outputs under `.understand-anything/` if present.
7. Generate or complete canonical docs in this order:
   - `README.md` as navigation/index only.
   - `architecture/` for runtime shape, components, dependency direction, data flow, and product boundaries.
   - `workflows/` for business and operational flows.
   - `specs/` for APIs, CLI, config, protocols, data contracts, and extension contracts.
   - `prd/` when product intent, constraints, or user-facing capabilities can be recovered.
   - `adr/` for durable decisions found in code/docs or inferred with evidence.
   - `guides/docs/` for human-readable overview, onboarding, and change playbook.
8. Put uncertain or missing facts in `open-questions.md`.
9. Run `aiops-knowledge-review` when the first pass is complete.

## Intake Rules

- Start broad with graph/tool outputs, then verify important claims against source.
- Prefer agent-useful facts: entry points, dependency direction, extension points, validation commands.
- Do not produce a tutorial unless the schema requires operational steps.
- Keep each claim traceable to local code, docs, config, or graph evidence.
- Do not generate the old `00-project-card.md` to `09-maintenance-guide.md` structure.
- Do not add `reviews/` or `evidence/` directories.
- Treat multi-product projects explicitly. For example, a certificate system can have `CA`, `RA`, `KMC`, and `OCSP` product domains under one project.
- Keep `guides/` readable for humans, but keep canonical governance facts in `prd/`, `architecture/`, `specs/`, `adr/`, and `workflows/`.

## jzero Example Focus

For `jzero`, inspect:

```text
cmd/jzero/main.go
cmd/jzero/internal/command/
core/
docs/src/
README.md
README.zh-CN.md
go.mod
```
