# Toolchain

## Primary Tools

Use `understand-anything` for historical project intake and project-level structure:

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

Write confirmed knowledge into `.aiops/projects/<project>/`, not into legacy `knowledge/projects/<project>/` paths.

## Daily Maintenance

Prefer `codegraph` or targeted source reads over full rescans. Start from `.aiops/diff-records/pending.md`, summarize semantics, extract keywords, recall related content across the workspace, and update all impacted canonical docs consistently. Run `understand-anything` incrementally when graph context is stale or architecture changed.

## New Project Briefing

Do not require codegraph. Use requirements input as provisional evidence, mark assumptions clearly, and prepare docs so future implementation can fill source evidence.

## Trellis

Use Trellis as an operational context source only:

- `.trellis/spec/`: operational mirror, not canonical source.
- `.trellis/tasks/`: task evidence.
- `.trellis/workspace/`: session memory, not confirmed fact source.

Canonical project knowledge remains `.aiops/projects/<project>/`.

## Fallback

If graph tools are unavailable, use local exploration with `rg`, `rg --files`, targeted file reads, tests, and manifests. State that graph tooling was unavailable if it affects confidence.
