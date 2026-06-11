---
name: aiops-governance-bootstrap
description: Initializes a workspace for AIOps knowledge governance. Use when the user asks to install, init, setup, configure hooks, create .aiops structure, bootstrap project knowledge, or prepare Codex/Claude Code/Trellis for AIOps docs governance.
---

# AIOps Governance Bootstrap

## Purpose

Connect the current workspace to AIOps knowledge governance with minimal human configuration.

This skill owns the boundaries for:

- `install`: install or update AIOps skills only; do not modify the current workspace.
- `init`: initialize the current workspace governance.
- `setup`: run `install` then `init`.

All actions must be idempotent.

## Workspace Root Discovery

For `init`, start from the current directory and recursively search upward for `.aiops/`.

- If an existing `.aiops/` is found, use it as the workspace governance root.
- If none is found, create `.aiops/` in the current directory.
- If `.aiops/governance.yaml` exists, treat governance as already initialized and only fill missing safe files.

## Bootstrap Questions

Use the shared TypeScript question model and TUI when available. The same question model should guide LLM-to-human questions when the TUI is unavailable.

Ask only the core questions by default:

1. Project id.
2. Products.
3. Services under each product.
4. Governance level.
5. Knowledge language.

Defaults:

- `project id`: infer from manifest or current directory, kebab-case, then ask for confirmation.
- `products`: empty means one product named `core`.
- `services`: empty means one service with the product id, unless source roots clearly show named services.
- `governance_level`: `high`.
- `knowledge_language`: `zh-CN`.

Keep advanced configuration folded unless needed:

- source roots
- knowledge root
- Codex hooks
- Claude Code hooks
- Trellis integration
- auto commit override

`source_roots` are only inferred during bootstrap. Historical intake should confirm or correct them later.

## Target Structure

Create missing files and directories without overwriting existing project knowledge:

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

Do not create `reviews/`, `evidence/`, workspace-level guides aggregation, JSONL diff records, or per-document frontmatter requirements.

## Config Boundaries

`.aiops/governance.yaml` is shared and versioned. It must not contain machine-local absolute paths.

Suggested baseline:

```yaml
schema_version: 1
governance_level: high
knowledge_language: zh-CN
projects_root: .aiops/projects
diff_records: .aiops/diff-records/pending.md
maintenance_runner:
  type: claude_code
  command: claude
  fallback: prompt_subagent
  modes:
    high: async
    xhigh: sync
platform_hooks:
  codex:
    status: installed
    file: .codex/hooks.json
  claude_code:
    status: installed
    file: .claude/settings.json
```

`.aiops/projects/<project>/project.yaml` is maintained by knowledge workflows. Bootstrap may create safe defaults but must not overwrite human-authored project knowledge.

Project config records stable project identity, product registry, and canonical path roots. It must not store per-iteration branch bindings.

Suggested project baseline:

```yaml
schema_version: 2
project: <project>
governance_level: high
knowledge_language: zh-CN

canonical_paths:
  iterations: iterations/
  products: products/
  guides: guides/

products:
  - id: core
    name: Core
    path: products/core
    services:
      - core
```

Create `.aiops/projects/<project>/iteration-bindings.yaml` during init. This file is required before maintenance changes canonical docs.

Suggested binding baseline:

```yaml
schema_version: 1
project: <project>

iterations:
  - id: current
    docs_branch: main
    docs_path: iterations/current
    products:
      - id: core
        version: current
        docs_path: products/core
        services:
          - id: core
            code_root: <source-root>
            required_branch: main
```

Create missing `product.yaml` and `service.yaml` files for each bootstrapped product and service. These files record stable identity, code root, and docs path only; they must not record local temporary branches or per-iteration branch mappings.

## Hooks

Support Codex and Claude Code.

Hook scripts must:

- record semantically useful agent events to the docs repository `.aiops/diff-records/pending.md`;
- trigger Claude Code `aiops-daily-doc-maintenance` according to governance level, or print a subagent fallback prompt when Claude Code is unavailable;
- never directly rewrite canonical docs.

Generated hook runners should execute hook Python scripts with a temporary Docker container first. If Docker is unavailable or the container run fails in a source-development or external-user environment, they may fall back to native `python3` / `python` to keep recording and maintenance triggers available.

When source repositories and the AIOps docs repository are separate Git repositories, do not copy the full `.aiops/` tree into source repositories. Use a local source-repo pointer:

```yaml
# <source-repo>/.aiops-docs.yaml
docs_repo: /path/to/aiops-docs
```

`.aiops-docs.yaml` and generated `.aiops-hook-runner.sh` are machine-local source-repo files and should be added to the source repo `.gitignore`.

Platform config rules:

- Create `.codex/hooks.json` when missing.
- Create `.claude/settings.json` when missing.
- If config exists, append only AIOps hook entries.
- If AIOps entries already exist, update them to the current managed commands without duplicating entries.
- If config cannot be parsed safely, stop and ask the human to resolve it.

Hook files are ordinary governed files and should be committed with the workspace. Do not implement complex hook upgrade/hash tracking in the first version.

## Diff Records

Initialize:

```text
.aiops/diff-records/pending.md
.aiops/diff-records/archived/
```

Use Markdown only. `pending.md` is active semantic input. `archived/` is committed history but not active maintenance debt.

## Guides

Each project gets one minimal VuePress guides site under:

```text
.aiops/projects/<project>/guides/
```

The guides site is for human reading and should run with:

```bash
docker compose up --build
```

Canonical docs remain Markdown directories named `prd/`, `architecture/`, `specs/`, `adr/`, and `workflows/`, but those directories are nested under the owning product or service instead of the project root.

Canonical docs are scoped by level:

- project iteration docs live under `iterations/<project-iteration>/`;
- product docs live under `products/<product>/`;
- service docs live under `products/<product>/services/<service>/`.

Do not create root-level `prd/`, `architecture/`, `specs/`, `adr/`, or `workflows/` directories for new bootstrap output. Do not create `cross/`, `integration.yaml`, or a cross-product/service version matrix.

## Trellis

Detect Trellis when present and record tool availability in `project.yaml`.

Use Trellis as task/context injection:

- `.trellis/spec/`: operational mirror, not canonical source.
- `.trellis/tasks/`: task evidence.
- `.trellis/workspace/`: session memory, not confirmed fact source.

Canonical source remains `.aiops/projects/<project>/`.
