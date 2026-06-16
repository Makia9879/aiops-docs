# ADR 0004: Human Reading Layer And Graph-Backed Agent Facts

Date: 2026-06-16

## Status

Accepted.

Supersedes the canonical-docs-as-agent-fact-source parts of ADR 0003. ADR 0005 supersedes the maintenance-trigger details in this ADR.

## Context

The previous model split project knowledge into:

- canonical Markdown docs for coding agents;
- guides for human reading.

That model caused a semantic mismatch. Markdown docs were asked to be both human-readable and an implementation spec. In practice, coding agents still need source code, tests, configs, Git history, and call graphs to verify implementation behavior.

The project also reviewed `silaswei-io/skills-seed` at commit `03b8a3e`. Its useful principle is not the specific tool, but the workflow:

```text
learn from real code/history -> curate facts/patterns -> generate thin entry + deep references -> use later checks/changes as feedback
```

AIOps should adopt that principle without directly depending on `skills-seed`.

## Decision

Use two semantic layers:

1. **Human reading layer** under `.aiops/projects/<project>/`.
   - Project iteration, product, and service docs remain.
   - Docs explain business context, architecture, workflows, ADRs, risks, open questions, and navigation.
   - `guides/` is the VuePress presentation of the same human reading layer.

2. **Agent evidence layer** from source and graph tools.
   - Source code, tests, configs, manifests, Git history, CodeGraph, and Understand Anything are the implementation fact source.
   - Agents first read the human reading layer to understand business context, then inspect source and graph evidence for contracts, calls, data models, config, validation paths, and impact.

Remove Markdown `specs/` from the target product/service document structure. Code plus CodeGraph is the executable spec.

## Scenario Mapping

- Historical project intake uses the skills-seed-style workflow: read code/history/graphs, extract project understanding, and generate the human reading layer.
- Daily maintenance is triggered by a Git push hook on the governed main branch or bound service main branch. Claude Code reviews unanalysed commits since the project commit-analysis cursor, updates reading docs only where human understanding changes, and records each analyzed commit hash and commit time before moving to the next commit.
- New project initialization is user-guided. It creates a reading-layer skeleton and records assumptions until source and graph evidence exists.
- Development context recall starts with reading docs for business context, then uses source, CodeGraph, and Understand Anything for implementation truth.

## Consequences

- Runtime skills must no longer instruct agents to write product/service `specs/`.
- Review checks should fail unexpected product/service `specs/` directories in new output.
- Existing historical docs that mention canonical/specs remain historical records unless explicitly migrated.
- CLI templates and generated project skeletons need a follow-up implementation pass so generated files match this ADR.
