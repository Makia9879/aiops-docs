---
name: aiops-historical-project-intake
description: Converts an existing or legacy project repository into structured AIOps knowledge-base documents. Use when the user asks to整理历史项目, summarize an existing repo into structured docs, reverse-engineer project knowledge, or use understand-anything/codegraph to document a codebase.
---

# Historical Project Intake

## Workflow

1. Identify the project root and target knowledge path: `knowledge/projects/<project>/`.
2. Read shared references from `aiops-knowledge-lifecycle`: document schema, evidence rules, toolchain, review checklist.
3. Build or reuse project graph context:
   - Prefer `/understand <project-path> --full --language zh`.
   - Then run `/understand-domain` when domain flows matter.
   - Use `codegraph init -i` when available for follow-up source navigation.
4. Inventory source evidence:
   - README, manifests, entry points, command/API routes, config, tests, docs.
   - Graph outputs under `.understand-anything/` if present.
5. Write the schema documents in this order:
   - `00-project-card.md`
   - `01-architecture.md`
   - `03-capabilities.md`
   - `04-workflows.md`
   - then fill remaining files by evidence strength.
6. Put uncertain or missing facts in `90-open-questions.md`.
7. Run `aiops-knowledge-review` when the first pass is complete.

## Intake Rules

- Start broad with graph/tool outputs, then verify important claims against source.
- Prefer agent-useful facts: entry points, dependency direction, extension points, validation commands.
- Do not produce a tutorial unless the schema requires operational steps.
- Keep each claim traceable to local code, docs, config, or graph evidence.

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
