# Evidence Rules

## Source Priority

Prefer sources in this order:

1. Executable source code and tests.
2. Project manifests, config, build scripts, migrations, generated schemas.
3. Existing project docs.
4. Tool-generated graphs from `understand-anything` or `codegraph`.
5. User-provided requirements or conversation notes.

## Citation Rules

- Every non-obvious claim needs a source path.
- Cite local paths, functions, commands, config keys, or graph node names.
- Do not present inferred behavior as fact. Mark it as "Inference" and explain the basis.
- Put missing evidence in `.aiops/projects/<project>/open-questions.md`.

## Uncertainty Labels

Use these labels consistently:

- `Confirmed`: direct evidence from code, tests, config, or docs.
- `Inference`: likely conclusion from multiple weak signals.
- `Assumption`: user or agent assumption that needs confirmation.
- `Unknown`: no reliable evidence yet.

## Anti-Patterns

- Do not summarize the workspace file tree as knowledge.
- Do not copy README prose unless it becomes an agent-useful fact.
- Do not invent business terminology when code uses a different term.
- Do not update broad documents when only one section is affected.
- Do not treat Trellis session memory as confirmed fact unless it is backed by code, docs, config, tasks, or human confirmation.
