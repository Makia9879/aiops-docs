# Document Schema

Use this schema for every governed project under the current workspace. The durable model is:

```text
Project Iteration -> Product Version -> Service Main Branch
Human Reading Docs -> Source Code + Code Graphs
```

The old model treated Markdown canonical docs as the coding-agent fact source. The new model splits responsibilities differently:

- Agent evidence layer: source code, tests, configs, manifests, Git history, `codegraph`, and `understand-anything`.
- Human reading layer: Markdown documents under `.aiops/projects/<project>/` that explain business context, architecture, workflows, ADRs, risks, and navigation.

Do not create or maintain Markdown `specs/` directories. Code plus `codegraph` is the executable spec.

## Workspace Structure

```text
.aiops/
  governance.yaml
  hooks/
    aiops_inject_context.py
    aiops_push_maintenance.py
  projects/
    <project>/
      project.yaml
      iteration-bindings.yaml
      README.md
      commit-analysis.md
      open-questions.md

      iterations/
        <project-iteration>/
          iteration.yaml
          overview.md
          architecture.md
          release-scope.md
          risks.md

      products/
        <product>/
          product.yaml
          overview.md
          architecture/
          workflows/
          adr/

          services/
            <service>/
              service.yaml
              overview.md
              architecture/
              workflows/
              adr/

      guides/
        package.json
        docker-compose.yaml
        docs/
          README.md
          overview.md
          onboarding.md
          change-playbook.md
          iterations/
          products/
          services/
          .vuepress/
            config.ts
  local/
  cache/
  tmp/
```

## Workspace Governance Files

- `.aiops/governance.yaml`: shared workspace governance config. Keep it versionable and free of machine-local absolute paths.
- `.aiops/hooks/`: Codex, Claude Code, and Git hook helper scripts. Hooks start maintenance processes; they never rewrite human reading docs directly and never switch Git branches.
- `.aiops/local/`, `.aiops/cache/`, `.aiops/tmp/`: local ignored state. Do not treat these as governed knowledge.

## Project Files

- `project.yaml`: schema v2 project identity, governance level, language, product registry, reading paths, and tool statuses. It does not store per-iteration branch bindings.
- `iteration-bindings.yaml`: selected project iterations, docs branches, product versions, service code roots, and service required branches. Read this before modifying human reading docs or interpreting source evidence.
- `README.md`: navigation index for humans and agents. Keep it short; link to reading docs, graph outputs, and source roots.
- `commit-analysis.md`: append-only or table-based maintenance cursor. It records analyzed commit hash, commit time, source repo, source branch, product/service, and maintenance result. Claude Code updates it after each successfully analyzed commit.
- `open-questions.md`: unknowns, weak evidence, assumptions, branch mismatch confirmations, and decisions needing human confirmation.
- `iterations/`: project-level human reading documents.
- `products/`: product-level and service-level human reading documents.
- `guides/`: project-local VuePress site for human reading. It presents the same reading layer as a site.

## Development Context Recall

For implementation, debugging, review, explanation, and test-writing tasks, recall context in this order:

1. `project.yaml` and `iteration-bindings.yaml`.
2. Selected `iterations/<project-iteration>/` reading docs.
3. Relevant `products/<product>/` reading docs.
4. Relevant `products/<product>/services/<service>/` reading docs.
5. `open-questions.md`.
6. Source code, tests, configs, migrations, manifests, and existing docs.
7. `codegraph` callers, callees, impact, and symbol search.
8. `understand-anything` architecture, domain, and tour graphs when present.
9. `guides/docs/` only when a rendered onboarding path is useful.

Human reading docs provide business context and navigation. Source and graph evidence provide implementation facts. If they disagree, prefer source and graph evidence, then route the drift to maintenance.

Before service-level code changes, compare the service `code_root` current branch with the selected iteration `required_branch`. If they differ, report the mismatch and treat reading docs as target-iteration context only after human confirmation.

## Push Hook Maintenance

Daily maintenance is no longer based on `pending.md` or governance thresholds. It runs from Git push:

1. A developer finishes code work and creates a Git commit.
2. The developer starts `git push`.
3. The repository push hook runs the AIOps maintenance launcher.
4. The launcher starts a Claude Code process in the docs workspace with the selected project, source repo, source branch, and pushed commit range.
5. Claude Code reads `commit-analysis.md` to find the last analyzed commit for the same source repo and governed branch.
6. Claude Code reviews unanalysed commits in commit order, starting after the recorded cursor.
7. For each commit, Claude Code reads the diff, source context, tests/configs, and graph impact; updates the human reading layer only when human understanding changes.
8. After each commit is successfully analyzed, Claude Code records the commit hash and commit time in `commit-analysis.md`.

All maintenance remains based on the original project main branch principle:

- For project docs, the docs branch must match the selected `docs_branch`.
- For service docs, the source branch must match the service `required_branch`.
- Pushes to feature or temporary branches do not create new document versions. They may be ignored or require explicit human confirmation before reading docs are updated.

Recommended `commit-analysis.md` shape:

```md
# Commit Analysis

| Source repo | Branch | Commit | Commit time | Project | Product | Service | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /path/to/service | main | abc1234 | 2026-06-16T10:30:00+08:00 | cert | ca | ca-admin | updated workflows |
```

## Config Files

### `project.yaml`

`project.yaml` records stable project identity and product registration:

```yaml
schema_version: 2
project: certificate-system
display_name: 数字证书认证系统
governance_level: high
knowledge_language: zh-CN

paths:
  iterations: iterations/
  products: products/
  guides: guides/
  graph:
    codegraph: .codegraph/
    understand_anything: .understand-anything/

products:
  - id: ca
    name: CA 管理端
    path: products/ca
    services:
      - ca-admin
```

Rules:

- Keep project ids and product ids stable.
- Do not store local temporary source branches here.
- Use `products[].services` as the service registry, not as a service version list.
- Tool paths are navigation hints, not a replacement for running fresh graph queries when implementation accuracy matters.

### `iteration-bindings.yaml`

`iteration-bindings.yaml` records the active maintenance contract:

```yaml
schema_version: 1
project: certificate-system

iterations:
  - id: develop_1.0.0
    docs_branch: develop_1.0.0
    docs_path: iterations/develop_1.0.0

    products:
      - id: ca
        version: develop_1.0.0
        docs_path: products/ca
        services:
          - id: ca-admin
            code_root: /Users/makia98/lij/work/CA/ca_admin
            required_branch: develop_1.0.0
```

Rules:

- `iterations[].id` is the project iteration id.
- `iterations[].docs_branch` is the project-level documentation Git branch for that iteration.
- `products[].version` is the product version selected by that project iteration.
- `services[].required_branch` is the service main branch selected by that project iteration.
- Products have versions; services have required branches. Do not add service versions.
- Do not store local temporary developer branches.

### `product.yaml`

`product.yaml` records stable product identity and services:

```yaml
product: ca
project: certificate-system
name: CA 管理端

services:
  - id: ca-admin
    code_root: /Users/makia98/lij/work/CA/ca_admin
    docs_path: services/ca-admin
```

### `service.yaml`

`service.yaml` records stable service identity:

```yaml
service: ca-admin
product: ca
project: certificate-system
code_root: /Users/makia98/lij/work/CA/ca_admin
docs_path: products/ca/services/ca-admin
```

Do not record the local current branch in `service.yaml`.

## Project Iteration Reading Docs

Project-level documents describe the delivery iteration, shared architecture, product scope, common constraints, and project-level risks:

```text
iterations/<project-iteration>/
  iteration.yaml
  overview.md
  architecture.md
  release-scope.md
  risks.md
```

Use this level for:

- project iteration goals;
- included product versions;
- product scope and shared constraints;
- project-level deployment, integration, and delivery rhythm;
- project-level risks and open questions.

## Product Reading Docs

Product-level documents describe product versions, product capabilities, product-internal architecture, product workflows, and product service boundaries:

```text
products/<product>/
  product.yaml
  overview.md
  architecture/
  workflows/
  adr/
  services/
```

Use this level for:

- product version goals and scope;
- product-level user flows;
- service boundaries inside the product;
- product-level data flow and capability composition;
- product-level external upstream or downstream calls;
- product-level ADRs;
- navigation to source roots and graph queries that show contracts or call paths.

## Service Reading Docs

Service-level documents describe one source-code service at human reading granularity:

```text
products/<product>/services/<service>/
  service.yaml
  overview.md
  architecture/
  workflows/
  adr/
```

Use this level for:

- service responsibility and ownership;
- runtime role, entry areas, and major dependencies;
- service-internal business workflows;
- external upstream or downstream calls initiated or owned by this service;
- service-level ADRs;
- graph/source navigation for API, RPC, config, database, message, validation, and extension details.

Do not duplicate implementation contracts into Markdown specs. Link to source paths, graph queries, tests, and generated graph outputs instead.

## Iteration Binding Preflight

Before modifying human reading docs:

1. Identify the affected project, product, service, and project iteration.
2. Read `.aiops/projects/<project>/project.yaml`.
3. Read `.aiops/projects/<project>/iteration-bindings.yaml`.
4. Read relevant `product.yaml` and `service.yaml` files.
5. For project iteration docs, confirm the docs repo branch matches `iterations[].docs_branch`, or get human confirmation.
6. For service docs, run `git -C <code_root> branch --show-current` and compare it to `required_branch`.
7. Inspect latest relevant commits and graph impact before updating reading docs.

If a service's current branch differs from `required_branch`, default to no reading-doc edits. Only:

- remind the human to switch source branches;
- do not advance `commit-analysis.md` for the blocked commit;
- write an open question;
- continue after explicit human confirmation, recording the reason.

## External Upstream And Downstream Calls

Do not create a separate cross-domain documentation layer. External relationships belong in the current product or service reading docs:

- The caller or dependency owner documents the business relationship, ownership boundary, and where to inspect the implementation.
- The called product or service docs are supporting reading context.
- Source code and graph queries are the evidence for call entry point, protocol, error semantics, and validation path.
- Do not create `cross/`, `integration.yaml`, or an independent cross-product or cross-service version matrix.

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
- `guides/docs/iterations/`
- `guides/docs/products/`
- `guides/docs/services/`

Guides pages are part of the human reading layer. They can reorganize the same content for onboarding and navigation, but they must not replace source and graph evidence for implementation details.

## Section Pattern

Use this compact pattern inside human reading Markdown files when useful:

```md
## <Topic>

Summary: <one or two human-readable sentences>

Source and graph evidence:
- <path or graph query>: <what it helps verify>

Reading notes:
- <how a human or agent should use this when navigating the project>

Open questions:
- <only if needed>
```

Skip empty sections. Keep documents dense, source-backed, and human-readable. Use source code plus `codegraph` / `understand-anything` for executable details.
