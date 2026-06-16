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

Prefer `understand-anything` first, then inspect source files and Git history for claims that need confirmation. For large repos, generate the graph before writing final reading docs.

Write human reading knowledge into `.aiops/projects/<project>/`, not into legacy `knowledge/projects/<project>/` paths. Do not write implementation specs into Markdown `specs/`; link to source and graph evidence.

## Daily Maintenance

Prefer `codegraph`, Git commit history, and targeted source reads over full rescans. Start from `.aiops/projects/<project>/commit-analysis.md`, identify unanalysed commits on the governed main branch or bound service main branch, summarize each commit semantically, recall related reading docs and source context across the workspace, and update all impacted human reading docs consistently. Run `understand-anything` incrementally when graph context is stale or architecture changed.

## New Project Briefing

Do not require codegraph. Use requirements input as provisional evidence, mark assumptions clearly, and prepare reading docs so future implementation can fill source and graph evidence.

## Trellis

Use Trellis as an operational context source only:

- `.trellis/spec/`: operational mirror, not fact source.
- `.trellis/tasks/`: task evidence.
- `.trellis/workspace/`: session memory, not confirmed fact source.

Human reading knowledge remains `.aiops/projects/<project>/`; implementation facts remain source plus graph evidence.

## Fallback

If graph tools are unavailable, use local exploration with `rg`, `rg --files`, targeted file reads, tests, and manifests. State that graph tooling was unavailable if it affects confidence.
