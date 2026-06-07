# Document Schema

Use this schema for every governed project under the current workspace:

```text
.aiops/
  governance.yaml
  hooks/
    aiops_inject_context.py
    aiops_record_diff.py
    aiops_trigger_maintenance.py
  diff-records/
    pending.md
    archived/
  projects/
    <project>/
      project.yaml
      README.md
      open-questions.md
      prd/
      architecture/
      specs/
      adr/
      workflows/
      guides/
        package.json
        docker-compose.yaml
        docs/
          README.md
          overview.md
          onboarding.md
          change-playbook.md
          .vuepress/
            config.ts
  local/
  cache/
  tmp/
```

## Workspace Governance Files

- `.aiops/governance.yaml`: shared workspace governance config. Keep it versionable and free of machine-local absolute paths.
- `.aiops/diff-records/pending.md`: active Markdown record of semantic change signals. It is input for maintenance, not an exact edit list.
- `.aiops/diff-records/archived/`: committed audit history after records are handled. Do not use it as active maintenance debt.
- `.aiops/hooks/`: Codex and Claude Code hook scripts. Hooks record, remind, and trigger maintenance; they never rewrite canonical docs directly.
- `.aiops/local/`, `.aiops/cache/`, `.aiops/tmp/`: local ignored state. Do not treat these as governed knowledge.

## Project Files

- `project.yaml`: project identity, governance level, language, product domains, source roots, canonical paths, and tool statuses.
- `README.md`: navigation index for agents and humans. Keep it short; link to canonical docs and guides.
- `open-questions.md`: unknowns, weak evidence, assumptions, and decisions needing human confirmation.
- `prd/`: product requirements, goals, constraints, user stories, product-domain boundaries.
- `architecture/`: system shape, components, dependency direction, data flow, runtime topology, cross-product architecture.
- `specs/`: implementation specs, interface specs, data specs, protocol specs, and delivery plans.
- `adr/`: architecture decision records and durable tradeoff decisions.
- `workflows/`: business workflows, operational workflows, agent maintenance workflows, validation paths.
- `guides/`: project-local VuePress site for human reading. It mirrors and explains canonical knowledge, but canonical governance remains in the folders above.

## Product Domains

A project can contain multiple sub-products or product domains. For example, a certificate system may contain `CA`, `RA`, `KMC`, and `OCSP`.

Represent product domains in `project.yaml`, then organize canonical docs by the smallest useful unit:

```text
prd/
architecture/
specs/
adr/
workflows/
```

Use subdirectories only when a folder becomes too broad, for example:

```text
architecture/ca/
architecture/ra/
specs/ocsp/
workflows/kmc/
```

Do not add extra top-level governance folders unless the project has a proven need and the human agrees.

## Guides Site

Each project owns one minimal VuePress guides site:

```bash
cd .aiops/projects/<project>/guides
docker compose up --build
```

Default human-facing pages:

- `guides/docs/README.md`
- `guides/docs/overview.md`
- `guides/docs/onboarding.md`
- `guides/docs/change-playbook.md`

Do not create a workspace-level guides aggregation in the first version.

## Section Pattern

Use this compact pattern inside canonical Markdown files when useful:

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

Skip empty sections. Keep documents dense, source-backed, and coding-agent-friendly. Human narrative belongs in `guides/docs/`.
