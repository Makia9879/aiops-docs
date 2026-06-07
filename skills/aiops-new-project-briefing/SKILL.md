---
name: aiops-new-project-briefing
description: Turns new project requirements, rough ideas, PRDs, meeting notes, or user stories into an initial AIOps structured knowledge base. Use when the user asks to create project knowledge before code exists, summarize requirements into structured docs, or prepare coding-agent-friendly docs for a new project.
---

# New Project Briefing

## Workflow

1. Collect available inputs: requirements, notes, PRD, sketches, constraints, existing templates.
2. Read shared references from `aiops-knowledge-lifecycle`: document schema and evidence rules.
3. Create `knowledge/projects/<project>/` using the standard schema.
4. Fill documents with provisional labels:
   - `Confirmed` for explicit user-provided requirements.
   - `Assumption` for inferred choices.
   - `Unknown` for missing decisions.
5. Prioritize:
   - `00-project-card.md`
   - `02-domain-model.md`
   - `03-capabilities.md`
   - `04-workflows.md`
   - `05-interfaces.md`
   - `09-maintenance-guide.md`
   - `90-open-questions.md`
6. Add implementation handoff notes for coding agents:
   - likely modules,
   - unresolved decisions,
   - validation expectations,
   - how future source evidence should replace assumptions.
7. Run `aiops-knowledge-review` before treating the briefing as ready.

## Rules

- Do not pretend code exists.
- Preserve user wording when it defines domain terms, but normalize fuzzy terms into canonical glossary entries.
- Ask only for decisions that block useful documentation; otherwise record assumptions.
- Make open questions concrete and answerable.

## Output Bias

Prefer documents that can guide implementation over product pitch material.
