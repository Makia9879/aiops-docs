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
2. Product domains.
3. Governance level.
4. Knowledge language.

Defaults:

- `project id`: infer from manifest or current directory, kebab-case, then ask for confirmation.
- `product domains`: empty means `core`.
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
platform_hooks:
  codex:
    status: installed
    file: .codex/hooks.json
  claude_code:
    status: installed
    file: .claude/settings.json
```

`.aiops/projects/<project>/project.yaml` is maintained by knowledge workflows. Bootstrap may create safe defaults but must not overwrite human-authored project knowledge.

## Hooks

Support Codex and Claude Code.

Hook scripts must:

- record semantic change signals to `.aiops/diff-records/pending.md`;
- remind or trigger `aiops-daily-doc-maintenance` according to governance level;
- never directly rewrite canonical docs.

Platform config rules:

- Create `.codex/hooks.json` when missing.
- Create `.claude/settings.json` when missing.
- If config exists, append only AIOps hook entries.
- If AIOps entries already exist, skip.
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

Canonical docs remain in `prd/`, `architecture/`, `specs/`, `adr/`, and `workflows/`.

## Trellis

Detect Trellis when present and record tool availability in `project.yaml`.

Use Trellis as task/context injection:

- `.trellis/spec/`: operational mirror, not canonical source.
- `.trellis/tasks/`: task evidence.
- `.trellis/workspace/`: session memory, not confirmed fact source.

Canonical source remains `.aiops/projects/<project>/`.
