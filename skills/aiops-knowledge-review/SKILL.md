---
name: aiops-knowledge-review
description: Reviews AIOps structured knowledge bases for schema coverage, evidence quality, terminology consistency, and coding-agent usability. Use when the user asks to audit, validate, improve, or quality-check project knowledge docs.
---

# Knowledge Review

## Workflow

1. Ensure workspace governance exists. If `.aiops/governance.yaml` is missing, report that the workspace is not initialized and recommend `aiops-governance-bootstrap`.
2. Identify the project knowledge directory under `.aiops/projects/<project>/`.
3. Read shared references from `aiops-knowledge-lifecycle`: document schema, evidence rules, review checklist.
4. Check schema coverage and note missing files or unjustified extra directories.
5. Check project-level governance:
   - `project.yaml` exists and does not contain machine-local absolute paths.
   - product domains are represented when the project has sub-products.
   - `README.md` is an index/navigation page, not a long article.
   - `guides/` exists for human reading.
6. Check canonical coverage:
   - `prd/`
   - `architecture/`
   - `specs/`
   - `adr/`
   - `workflows/`
   - `open-questions.md`
7. Check evidence:
   - claims cite source paths or are labelled as assumptions;
   - stale paths are detected;
   - code/docs contradictions are called out.
8. Check agent usability:
   - entry points and impact areas are explicit;
   - maintenance rules are actionable;
   - validation commands are present where applicable.
9. Check human readability:
   - `guides/docs/overview.md` explains the project;
   - `guides/docs/onboarding.md` helps a developer start;
   - `guides/docs/change-playbook.md` explains how to maintain knowledge.
10. Check terminology against `CONTEXT.md` if present.
11. Produce findings first, ordered by severity.

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
