# Toolchain

## Primary Tools

Use `understand-anything` for project-level structure:

```text
/understand <project-path> --full --language zh
/understand-domain
```

Expected outputs:

```text
<project>/.understand-anything/knowledge-graph.json
<project>/.understand-anything/domain-graph.json
```

Use `codegraph` for fast daily source navigation:

```bash
cd <project>
codegraph init -i
```

## Historical Intake

Prefer `understand-anything` first, then inspect source files only for claims that need confirmation. For large repos, generate the graph before writing final docs.

## Daily Maintenance

Prefer `codegraph` or targeted source reads over full rescans. Update only docs affected by the change. Run `understand-anything` incrementally when graph context is stale or architecture changed.

## New Project Briefing

Do not require codegraph. Use requirements input as provisional evidence, mark assumptions clearly, and prepare docs so future implementation can fill source evidence.

## Fallback

If graph tools are unavailable, use local exploration with `rg`, `rg --files`, targeted file reads, tests, and manifests. State that graph tooling was unavailable if it affects confidence.
