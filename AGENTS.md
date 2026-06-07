# Repository Guidelines

## Project Structure & Module Organization

This repository is an AIOps documentation workspace. The VuePress site lives in `aiops-docs/`; authored pages are under `aiops-docs/docs/`, with knowledge-base content in `aiops-docs/docs/knowledge/` and site configuration in `aiops-docs/docs/.vuepress/config.ts`. Repo-level operating context is in `CONTEXT.md`, architectural decisions are in `docs/adr/`, and reusable agent workflows are versioned in `skills/`. Build helpers for local container images are in `scripts/`, while nginx and compose files for serving the generated site are in `aiops-docs/nginx/` and `aiops-docs/docker-compose.yaml`.

## Build, Test, and Development Commands

Run commands from `aiops-docs/` unless noted.

- `npm install`: install VuePress dependencies locally.
- `npm run dev`: start VuePress dev server on `0.0.0.0`.
- `npm run build`: generate the static site in `docs/.vuepress/dist`.
- `npm run serve`: start the Docker Compose service.
- `task build`: install dependencies and build via Dockerized npm.
- `task restart`: rebuild and recreate the nginx container.
- `task ps`: show compose service status.

Root image scripts include `./scripts/build-codegraph-image.sh`, `./scripts/build-headroom-image.sh`, and `./scripts/build-understand-anything-image.sh`.

## Coding Style & Naming Conventions

Use Markdown as the primary authoring format. Keep documents dense, source-backed, and structured with `##`/`###` headings. Follow the managed-document pattern in `skills/aiops-knowledge-lifecycle/references/document-schema.md`: summary, evidence, agent notes, and open questions only when useful. Use kebab-case filenames for Markdown pages and ADRs, for example `historical-project-aiops-docs.md` or `0002-version-skill-source-in-repo.md`. TypeScript config files use two-space indentation and double quotes, matching `config.ts`.

## Testing Guidelines

There is no dedicated unit test suite in this repo. Treat `npm run build` or `task build` as the primary validation for docs and VuePress configuration changes. For content-only changes, also check links, sidebar entries, and evidence paths manually. When adding a new page under `aiops-docs/docs/knowledge/`, confirm it is reachable from `config.ts` if it should appear in navigation.

## Commit & Pull Request Guidelines

The current history only shows an initial `init` commit, so use concise imperative commits such as `add knowledge lifecycle guide` or `update VuePress sidebar`. PRs should describe the documentation or workflow change, list validation performed, link related ADRs or issues when available, and include screenshots only for visible site changes.

## Agent-Specific Instructions

Do not overwrite generated or user-modified files without checking `git status`. Keep repo-local skills in `skills/` aligned with ADR decisions, especially when changing document schema, routing behavior, or evidence rules.
