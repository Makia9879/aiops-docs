# 0002. Version AIOps knowledge skills in the repository

Date: 2026-06-07

## Status

Accepted

## Context

The AIOps knowledge lifecycle skills need to evolve with the team's documentation schema, evidence rules, and agent workflow. Installed skills live in runtime directories such as `~/.agents/skills/`, which are convenient for execution but weak as the source of truth.

## Decision

Keep the authored skill source under `skills/` in this repository. Copy or install those directories into the runtime skill directory when using them.

## Consequences

Skill changes can be reviewed, versioned, and rolled back with the repository. Runtime copies may drift, so installation or sync should be treated as a deployment step.
