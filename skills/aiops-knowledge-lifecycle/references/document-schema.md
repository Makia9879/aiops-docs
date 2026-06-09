# Document Schema

Use this schema for every governed project under the current workspace. The durable model is:

```text
Project Iteration -> Product Version -> Service Main Branch
Project Docs -> Product Docs -> Service Docs
```

Canonical docs are the long-lived source of truth for coding agents. Guides are the human reading layer and must link back to canonical docs.

## Workspace Structure

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
      iteration-bindings.yaml
      README.md
      open-questions.md

      iterations/
        <project-iteration>/
          iteration.yaml
          prd.md
          architecture.md
          release-scope.md
          risks.md

      products/
        <product>/
          product.yaml
          prd/
          architecture/
          workflows/
          specs/
          adr/

          services/
            <service>/
              service.yaml
              architecture/
              specs/
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
- `.aiops/diff-records/pending.md`: active Markdown record of semantic change signals. It is input for maintenance, not an exact edit list.
- `.aiops/diff-records/archived/`: committed audit history after records are handled. Do not use it as active maintenance debt.
- `.aiops/hooks/`: Codex and Claude Code hook scripts. Hooks record, remind, and trigger maintenance; they never rewrite canonical docs directly and never switch Git branches.
- `.aiops/local/`, `.aiops/cache/`, `.aiops/tmp/`: local ignored state. Do not treat these as governed knowledge.

## Project Files

- `project.yaml`: schema v2 project identity, governance level, language, product registry, canonical paths, and tool statuses. It does not store per-iteration branch bindings.
- `iteration-bindings.yaml`: selected project iterations, docs branches, product versions, service code roots, and service required branches. Read this before modifying canonical docs.
- `README.md`: navigation index for agents and humans. Keep it short; link to canonical docs and guides.
- `open-questions.md`: unknowns, weak evidence, assumptions, branch mismatch confirmations, and decisions needing human confirmation.
- `iterations/`: project-level iteration documents.
- `products/`: product-level documents and service subtrees.
- `guides/`: project-local VuePress site for human reading. It mirrors and explains canonical knowledge, but canonical governance remains under `iterations/` and `products/`.

## Config Files

### `project.yaml`

`project.yaml` records stable project identity and product registration:

```yaml
schema_version: 2
project: certificate-system
display_name: 数字证书认证系统
governance_level: high
knowledge_language: zh-CN

canonical_paths:
  iterations: iterations/
  products: products/
  guides: guides/

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

## Project Iteration Docs

Project-level documents describe the delivery iteration, shared architecture, product scope, common constraints, and project-level risks:

```text
iterations/<project-iteration>/
  iteration.yaml
  prd.md
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

## Product Docs

Product-level documents describe product versions, product capabilities, product-internal architecture, product workflows, and product service boundaries:

```text
products/<product>/
  product.yaml
  prd/
  architecture/
  workflows/
  specs/
  adr/
  services/
```

Use this level for:

- product version goals and scope;
- product-level user flows;
- service boundaries inside the product;
- product-level data flow and capability composition;
- product-level external upstream or downstream calls;
- product-level ADRs.

## Service Docs

Service-level documents describe one source-code service:

```text
products/<product>/services/<service>/
  service.yaml
  architecture/
  specs/
  workflows/
  adr/
```

Use this level for:

- service entry points, routes, handlers, logic, models, and config;
- API contracts, RPC contracts, database tables, message protocols, and extension contracts;
- service-internal business workflows;
- external upstream or downstream calls initiated or owned by this service;
- service-level ADRs and regression validation commands.

## Iteration Binding Preflight

Before modifying canonical docs:

1. Identify the affected project, product, service, and project iteration.
2. Read `.aiops/projects/<project>/project.yaml`.
3. Read `.aiops/projects/<project>/iteration-bindings.yaml`.
4. Read relevant `product.yaml` and `service.yaml` files.
5. For project iteration docs, confirm the docs repo branch matches `iterations[].docs_branch`, or get human confirmation.
6. For service docs, run `git -C <code_root> branch --show-current` and compare it to `required_branch`.

If a service's current branch differs from `required_branch`, default to no canonical edits. Only:

- remind the human to switch source branches;
- write or preserve the pending diff record;
- write an open question;
- continue after explicit human confirmation, recording the reason.

## External Upstream And Downstream Calls

Do not create a separate cross-domain documentation layer. External relationships belong in the current product or service docs:

- The caller or dependency owner documents the call entry point, protocol, responsibility boundary, error semantics, and validation path.
- The called product or service docs are supporting evidence for interface and behavior facts.
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

Guides pages should link back to canonical docs and must not carry the only copy of a business rule.

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
