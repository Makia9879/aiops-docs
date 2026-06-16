---
name: aiops-new-project-briefing
description: Turns new project requirements, rough ideas, PRDs, meeting notes, or user stories into an initial AIOps human reading layer. Use when the user asks to create project knowledge before code exists, summarize requirements into structured docs, or prepare docs that later guide coding-agent recall.
---

# New Project Briefing

## Workflow

1. Ensure workspace governance exists. If `.aiops/governance.yaml` is missing, run `aiops-governance-bootstrap` unless the human refuses.
2. Collect available inputs: requirements, notes, PRD, sketches, constraints, existing templates.
3. Identify or create `.aiops/projects/<project>/` using the standard schema.
4. Read shared references from `aiops-knowledge-lifecycle`: document schema and evidence rules.
5. Identify the initial project iteration, products, and services. If they are not confirmed, create the smallest useful provisional structure and record assumptions in `open-questions.md`.
6. Read or create `iteration-bindings.yaml` before writing human reading docs. Use placeholder product versions and service `required_branch` only when the human has not provided real values.
7. Fill documents with provisional labels:
   - `Confirmed` for explicit user-provided requirements.
   - `Assumption` for inferred choices.
   - `Unknown` for missing decisions.
8. Prioritize:
   - `project.yaml` for identity, products, service registry, language, governance level, and reading/graph paths.
   - `iteration-bindings.yaml` for project iteration, product versions, service code roots, and service required branches.
   - `README.md` as navigation/index only.
   - `iterations/<project-iteration>/` for project goals, shared architecture, release scope, and risks.
   - `products/<product>/overview.md` for product goals, requirements, user stories, constraints, and product boundaries.
   - `products/<product>/architecture/` for proposed product shape, service boundaries, dependency direction, and data flow.
   - `products/<product>/adr/` for accepted or proposed product decisions.
   - `products/<product>/workflows/` for user, system, operational, and agent maintenance workflows.
   - `products/<product>/services/<service>/` for service responsibility, runtime shape, workflows, ADRs, and future source/graph navigation.
   - `guides/docs/` for human-readable overview, onboarding, and change playbook.
   - `open-questions.md` for unresolved decisions.
9. Add implementation handoff notes for coding agents:
   - likely modules,
   - selected project iteration and product version assumptions,
   - service code root and required branch assumptions,
   - unresolved decisions,
   - validation expectations,
   - how future source and graph evidence should replace assumptions.
10. Run `aiops-knowledge-review` before treating the briefing as ready.

## Rules

- Do not pretend code exists.
- Preserve user wording when it defines domain terms, but normalize fuzzy terms into stable glossary entries.
- Ask only for decisions that block useful documentation; otherwise record assumptions.
- Make open questions concrete and answerable.
- Default knowledge language is `zh-CN` unless initialization says otherwise.
- Default governance level is `high`.
- Do not create the old numbered document structure or extra top-level governance directories.
- Use products and services when one project contains multiple sub-products, such as `CA`, `RA`, `KMC`, and `OCSP`.
- Products have versions. Services have required main branches. Do not create service versions or document versions for local temporary source branches.
- Do not create root-level `prd/`, `architecture/`, `specs/`, `adr/`, or `workflows/` for new project output.
- Do not create product/service `specs/`. Code plus `codegraph` will become the executable spec after implementation exists.
- Do not create `cross/`, `integration.yaml`, or independent cross-product/service matrices. External upstream/downstream relationships belong in the current product or service reading docs.

## Output Bias

Prefer documents that help humans understand the project and help agents navigate to future source/graph evidence over product pitch material.
