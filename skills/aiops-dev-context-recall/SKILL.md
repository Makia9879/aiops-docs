---
name: aiops-dev-context-recall
description: Recalls AIOps human reading docs plus source and graph evidence to guide coding-agent development, debugging, review, explanation, and implementation tasks. Use when the user asks to use project docs before changing code, asks for document recall to assist development, or starts a coding task in an AIOps-governed workspace.
---

# Development Context Recall

## Purpose

Use the governed AIOps reading layer as business context before or during coding work, then confirm implementation facts from source code and graphs.

This skill is for development assistance, not documentation maintenance. It helps a coding agent understand the project iteration, product version, service branch, business context, architecture, ADRs, workflows, and open questions that should frame a code task. API contracts, config details, data models, and call paths come from source code, `codegraph`, and `understand-anything`.

## Workflow

1. Ensure workspace governance exists. If `.aiops/governance.yaml` is missing, run `aiops-governance-bootstrap` unless the human refuses.
2. Identify the user's development task: feature, bugfix, refactor, review, explanation, test, operation, or design question.
3. Identify the project. If multiple projects exist and the project is unclear, ask the human before proceeding.
4. Read `.aiops/projects/<project>/project.yaml`.
5. Read `.aiops/projects/<project>/iteration-bindings.yaml`.
6. Identify the selected project iteration. If the active iteration is unclear and the answer would affect code changes, ask the human.
7. Map the task to likely products and services using:
   - product and service ids from `project.yaml`;
   - `iteration-bindings.yaml` product versions and service `code_root`;
   - task keywords, source paths, package names, routes, commands, tables, APIs, and domain terms.
8. For service-level coding work, compare the service `code_root` current branch with the selected iteration `required_branch`.
9. If `current branch != required_branch`, do not silently treat reading docs as the current branch contract. Tell the human:

   ```text
   当前 <service> 在 <current branch>，但项目迭代 <iteration> 要求 <required_branch>。
   我可以继续把文档作为目标迭代上下文参考，或你可以先切换源码分支。
   ```

10. Recall context in this order:
    - selected project iteration docs under `iterations/<project-iteration>/`;
    - relevant product `overview.md`, `architecture/`, `workflows/`, and `adr/`;
    - relevant service `overview.md`, `architecture/`, `workflows/`, and `adr/`;
    - `open-questions.md`;
    - source code, tests, configs, migrations, manifests, and existing docs that verify the recalled claims;
    - `codegraph` callers, callees, impact, and symbol search for implementation relationships;
    - `understand-anything` graph outputs when architecture or domain flow context matters;
    - relevant `guides/docs/` pages only as reading aids.
11. Produce a concise development context brief before making risky code edits:
    - project iteration and branch binding;
    - product/service scope;
    - recalled requirements and constraints;
    - source evidence to inspect next;
    - likely validation commands;
    - open questions or branch mismatch limits.
12. Continue with the user's requested coding task using the recalled constraints.

## Rules

- Treat reading docs as high-signal business context, not as proof when source code or graphs contradict them.
- If reading docs and implementation disagree, prefer implementation for current behavior and note the documentation drift.
- Do not update reading docs as part of this skill unless the human explicitly asks for documentation changes.
- If the coding task creates or reveals documentation drift, note it in the final response; push-hook maintenance will handle it when the code commit is pushed, or route to `aiops-daily-doc-maintenance` if the human asks now.
- Do not use historical maintenance logs as active recall input.
- Do not create new product, service, branch, version, or implementation facts from inference alone. Put unresolved facts in the final response or `open-questions.md` only when the human asks for docs updates.

## Output Rule

For small tasks, keep the recall brief short and move into implementation. For complex or risky tasks, show the recalled constraints before editing code so the human can correct the selected project iteration, product, or service scope.
