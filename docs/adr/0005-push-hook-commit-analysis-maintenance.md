# ADR 0005: Push Hook Commit Analysis Maintenance

Date: 2026-06-16

## Status

Accepted.

Supersedes the pending-record and threshold-triggered maintenance parts of ADR 0003 and ADR 0004.

## Context

The previous maintenance model used:

```text
agent events -> pending.md -> governance threshold -> Claude Code maintenance
```

That made maintenance depend on agent-event summaries rather than the source of truth: Git commits on the governed branch.

The desired model is closer to `skills-seed learn history`: analyze unprocessed Git history incrementally, persist a cursor, and resume from the cursor on the next run.

## Decision

Use Git push hook triggered maintenance:

```text
developer creates commit
-> developer starts git push
-> push hook runs AIOps maintenance launcher
-> launcher starts Claude Code
-> Claude Code analyzes unanalysed commits
-> Claude Code updates human reading docs
-> Claude Code records analyzed commit hash and commit time
```

Use `.aiops/projects/<project>/commit-analysis.md` as the commit analysis cursor. The record must include at least:

- source repo;
- governed branch;
- commit hash;
- commit time;
- project/product/service scope when known;
- maintenance result.

Claude Code records a commit only after that commit has been analyzed. The next run starts after the last recorded commit for the same source repo and branch.

## Main Branch Principle

Maintenance remains based on the original project main branch principle:

- Project reading docs are maintained against `iteration-bindings.yaml` `docs_branch`.
- Service reading docs are maintained against each service `required_branch`.
- Feature branches and temporary local branches do not create new document versions.
- If a pushed branch does not match the governed branch, maintenance does not update reading docs and does not advance the commit cursor unless a human explicitly confirms how to handle that branch.

## Consequences

- `pending.md`, archived pending records, and pending thresholds are no longer the current maintenance design.
- Push hooks launch Claude Code; they do not directly update docs or advance the cursor.
- Review checks must verify `commit-analysis.md` rather than pending archives.
- Bootstrap/link-docs implementation installs source-repo `pre-push` hooks that call the AIOps push-maintenance launcher.
