---
name: aiops-historical-project-intake
description: Converts an existing or legacy project workspace into structured AIOps knowledge-base documents. Use when the user asks to整理历史项目, summarize an existing workspace into structured docs, reverse-engineer project knowledge, or use understand-anything/codegraph to document a codebase.
---

# Historical Project Intake

## Workflow

1. Ensure workspace governance exists. If `.aiops/governance.yaml` is missing, run `aiops-governance-bootstrap` unless the human refuses.
2. Identify the source project root and target knowledge path: `.aiops/projects/<project>/`.
3. Read shared references from `aiops-knowledge-lifecycle`: document schema, evidence rules, toolchain, review checklist.
4. Confirm or correct products and services in `.aiops/projects/<project>/project.yaml`; bootstrap inference is not enough for final intake.
5. Read or create `.aiops/projects/<project>/iteration-bindings.yaml` before writing canonical docs.
6. Confirm the current project iteration, product versions, service `code_root`, and service `required_branch`.
7. For every service with a `code_root`, check `git -C <code_root> branch --show-current`. If the current branch differs from `required_branch`, do not write service canonical docs unless the human confirms that intake should still be based on the selected project iteration binding. Record unresolved mismatches in `open-questions.md`.
8. Build or reuse project graph context:
   - Prefer `/understand <project-path> --full --language zh`.
   - Then run `/understand-domain` when domain flows matter.
   - Use `codegraph init -i` when available for follow-up source navigation.
9. Inventory source evidence:
   - README, manifests, entry points, command/API routes, config, tests, docs.
   - Graph outputs under `.understand-anything/` if present.
10. Identify boundaries before drafting docs:
   - project iterations and shared constraints;
   - products and product versions;
   - services under each product;
   - service code roots, entry points, runtime/config surfaces, and validation commands;
   - external upstream/downstream relationships owned by each product or service.
11. Generate or complete canonical docs in this order:
   - `README.md` as navigation/index only.
   - `iterations/<project-iteration>/` for project iteration goals, shared architecture, release scope, and risks.
   - `products/<product>/product.yaml` for stable product identity and service registry.
   - `products/<product>/architecture/` for product-level runtime shape, service boundaries, dependency direction, and data flow.
   - `products/<product>/workflows/` for product-level business and operational flows.
   - `products/<product>/specs/` for product APIs, protocols, product-level data contracts, and extension contracts.
   - `products/<product>/prd/` when product intent, constraints, or user-facing capabilities can be recovered.
   - `products/<product>/adr/` for durable product decisions found in code/docs or inferred with evidence.
   - `products/<product>/services/<service>/service.yaml` for stable service identity, code root, and docs path.
   - `products/<product>/services/<service>/{architecture,specs,workflows,adr}/` for service internals, API/RPC/config/database/message contracts, business rules, runtime behavior, and validation commands.
   - `guides/docs/` for human-readable overview, onboarding, and change playbook.
12. Put uncertain or missing facts in `open-questions.md`.
13. Run `aiops-knowledge-review` when the first pass is complete.

## Intake Rules

- Start broad with graph/tool outputs, then verify important claims against source.
- Prefer agent-useful facts: entry points, dependency direction, extension points, validation commands.
- Do not produce a tutorial unless the schema requires operational steps.
- Keep each claim traceable to local code, docs, config, or graph evidence.
- Do not generate the old `00-project-card.md` to `09-maintenance-guide.md` structure.
- Do not add `reviews/` or `evidence/` directories.
- Treat multi-product projects explicitly. For example, a certificate system can have `CA`, `RA`, `KMC`, and `OCSP` products under one project, each with its own services.
- Keep `guides/` readable for humans, but keep canonical governance facts in project iteration docs, product docs, and service docs.
- Do not create root-level `prd/`, `architecture/`, `specs/`, `adr/`, or `workflows/` for new intake output.
- Do not create `cross/`, `integration.yaml`, or independent cross-product/service matrices.
- Write external upstream/downstream relationships into the current product or service canonical docs. Include the call entry point, protocol, responsibility boundary, error semantics, and validation path. Use counterpart product or service docs only as supporting evidence.

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
