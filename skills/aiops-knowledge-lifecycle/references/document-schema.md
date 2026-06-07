# Document Schema

Use this schema for each managed project:

```text
knowledge/projects/<project>/
  00-project-card.md
  01-architecture.md
  02-domain-model.md
  03-capabilities.md
  04-workflows.md
  05-interfaces.md
  06-data-and-state.md
  07-operations.md
  08-extension-points.md
  09-maintenance-guide.md
  90-open-questions.md
```

## File Intent

- `00-project-card.md`: project identity, purpose, boundaries, tech stack, source inventory.
- `01-architecture.md`: entry points, layers, major modules, dependency direction, runtime shape.
- `02-domain-model.md`: canonical terms, domain entities, relationships, invariants.
- `03-capabilities.md`: user-visible and agent-relevant capabilities grouped by area.
- `04-workflows.md`: core flows with triggers, steps, source paths, side effects, validation hints.
- `05-interfaces.md`: CLI commands, APIs, events, config files, file formats, integration contracts.
- `06-data-and-state.md`: persistence, generated artifacts, cache/state, migrations, ownership.
- `07-operations.md`: install, build, test, run, release, troubleshooting, observability.
- `08-extension-points.md`: plugins, templates, hooks, adapters, customization boundaries.
- `09-maintenance-guide.md`: where agents should edit, impact map, update rules, validation commands.
- `90-open-questions.md`: unknowns, weak evidence, decisions needing human confirmation.

## Section Pattern

Use this compact pattern inside most files:

```md
## <Topic>

Summary: <one or two factual sentences>

Evidence:
- <path>: <what it proves>

Agent notes:
- <how to use this when changing code or docs>

Open questions:
- <only if needed>
```

Skip empty sections. Keep documents dense and source-backed.
