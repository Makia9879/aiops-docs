---
name: aiops-knowledge-review
description: Reviews AIOps human reading layers for schema coverage, evidence quality, terminology consistency, graph/source navigation, and coding-agent usability. Use when the user asks to audit, validate, improve, or quality-check project knowledge docs.
---

# Knowledge Review

## Workflow

1. Ensure workspace governance exists. If `.aiops/governance.yaml` is missing, report that the workspace is not initialized and recommend `aiops-governance-bootstrap`.
2. Identify the project knowledge directory under `.aiops/projects/<project>/`.
3. Read shared references from `aiops-knowledge-lifecycle`: document schema, evidence rules, review checklist.
4. Check schema coverage and note missing files or unjustified extra directories.
5. Check project-level governance:
   - `project.yaml` exists and does not contain machine-local absolute paths.
   - `project.yaml` uses `schema_version: 2` or otherwise represents project/product/service structure clearly.
   - products are represented when the project has sub-products.
   - each product lists its services.
   - `iteration-bindings.yaml` exists.
   - `commit-analysis.md` exists or there is a documented reason maintenance has not started.
   - `README.md` is an index/navigation page, not a long article.
   - `guides/` exists for human reading.
6. Check iteration binding completeness:
   - every active project iteration has `id`, `docs_branch`, and `docs_path`;
   - every bound product has `id`, `version`, and `docs_path`;
   - every bound service has `id`, `code_root`, and `required_branch`;
   - bound products exist under `products/<product>/`;
   - bound services exist under `products/<product>/services/<service>/`;
   - no local temporary source branch is recorded as a document version.
7. Check branch-bound maintenance risk:
   - for each service with a reachable `code_root`, compare `git -C <code_root> branch --show-current` with `required_branch`;
   - report mismatches as review findings;
   - verify prior mismatch confirmations or open questions exist when docs were changed despite a mismatch;
   - verify branch-mismatched commits were not incorrectly advanced in `commit-analysis.md`.
8. Check human reading coverage:
   - project iteration docs under `iterations/<project-iteration>/`;
   - product docs under `products/<product>/{overview.md,architecture,adr,workflows}/`;
   - service docs under `products/<product>/services/<service>/{overview.md,architecture,workflows,adr}/`;
   - `product.yaml` for each product;
   - `service.yaml` for each service;
   - `open-questions.md`.
   - no product or service `specs/` directories.
9. Check external upstream/downstream documentation:
   - business relationship context lives in the current product or service reading docs;
   - source and graph navigation exists for call entry point, protocol, error semantics, and validation path when evidence exists;
   - no `cross/`, `integration.yaml`, or independent cross-product/service matrix is introduced.
10. Check evidence:
   - claims cite source paths or are labelled as assumptions;
   - stale paths are detected;
   - code/docs contradictions are called out.
11. Check agent usability:
   - reading docs explain business context before implementation details;
   - source and graph entry points are explicit;
   - maintenance rules are actionable;
   - validation command locations are discoverable from source, graph, or tests where applicable.
12. Check human readability:
   - `guides/docs/overview.md` explains the project;
   - `guides/docs/onboarding.md` helps a developer start;
   - `guides/docs/change-playbook.md` explains how to maintain knowledge.
13. Check terminology against `CONTEXT.md` if present.
14. Produce findings first, ordered by severity.

## Finding Format

```md
- Severity: <High|Medium|Low>
  File: <path>
  Issue: <specific problem>
  Evidence: <source path or missing evidence>
  Fix: <concrete change>
```

## Review Stance

Prioritize correctness, stale claims, missing evidence, agent failure modes, and broken human reading paths over style. If there are no material issues, say so and mention remaining risk.

Do not require a `reviews/` directory. Put review output in the response unless the human explicitly asks to write it somewhere.
