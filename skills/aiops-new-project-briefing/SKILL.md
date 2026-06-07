---
name: aiops-new-project-briefing
description: Turns new project requirements, rough ideas, PRDs, meeting notes, or user stories into an initial AIOps structured knowledge base. Use when the user asks to create project knowledge before code exists, summarize requirements into structured docs, or prepare coding-agent-friendly docs for a new project.
---

# New Project Briefing

## Workflow

1. Ensure workspace governance exists. If `.aiops/governance.yaml` is missing, run `aiops-governance-bootstrap` unless the human refuses.
2. Collect available inputs: requirements, notes, PRD, sketches, constraints, existing templates.
3. Identify or create `.aiops/projects/<project>/` using the standard schema.
4. Read shared references from `aiops-knowledge-lifecycle`: document schema and evidence rules.
5. Fill documents with provisional labels:
   - `Confirmed` for explicit user-provided requirements.
   - `Assumption` for inferred choices.
   - `Unknown` for missing decisions.
6. Prioritize:
   - `project.yaml` for identity, product domains, language, governance level, and provisional source roots.
   - `README.md` as navigation/index only.
   - `prd/` for goals, requirements, user stories, constraints, and product-domain boundaries.
   - `architecture/` for proposed system shape, components, dependency direction, and data flow.
   - `specs/` for interfaces, data contracts, protocols, delivery specs, and implementation handoff.
   - `adr/` for accepted or proposed decisions.
   - `workflows/` for user, system, operational, and agent maintenance workflows.
   - `guides/docs/` for human-readable overview, onboarding, and change playbook.
   - `open-questions.md` for unresolved decisions.
7. Add implementation handoff notes for coding agents:
   - likely modules,
   - unresolved decisions,
   - validation expectations,
   - how future source evidence should replace assumptions.
8. Run `aiops-knowledge-review` before treating the briefing as ready.

## Rules

- Do not pretend code exists.
- Preserve user wording when it defines domain terms, but normalize fuzzy terms into canonical glossary entries.
- Ask only for decisions that block useful documentation; otherwise record assumptions.
- Make open questions concrete and answerable.
- Default knowledge language is `zh-CN` unless initialization says otherwise.
- Default governance level is `high`.
- Do not create the old numbered document structure or extra top-level governance directories.
- Use product domains when one project contains multiple sub-products, such as `CA`, `RA`, `KMC`, and `OCSP`.

## Output Bias

Prefer documents that can guide implementation over product pitch material.
