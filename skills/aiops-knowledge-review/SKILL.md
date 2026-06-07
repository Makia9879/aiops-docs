---
name: aiops-knowledge-review
description: Reviews AIOps structured knowledge bases for schema coverage, evidence quality, terminology consistency, and coding-agent usability. Use when the user asks to audit, validate, improve, or quality-check project knowledge docs.
---

# Knowledge Review

## Workflow

1. Identify the project knowledge directory.
2. Read shared references from `aiops-knowledge-lifecycle`: document schema, evidence rules, review checklist.
3. Check schema coverage and note missing files.
4. Check evidence:
   - claims cite source paths or are labelled as assumptions;
   - stale paths are detected;
   - code/docs contradictions are called out.
5. Check agent usability:
   - entry points and impact areas are explicit;
   - maintenance rules are actionable;
   - validation commands are present where applicable.
6. Check terminology against `CONTEXT.md` if present.
7. Produce findings first, ordered by severity.

## Finding Format

```md
- Severity: <High|Medium|Low>
  File: <path>
  Issue: <specific problem>
  Evidence: <source path or missing evidence>
  Fix: <concrete change>
```

## Review Stance

Prioritize correctness, stale claims, missing evidence, and agent failure modes over style. If there are no material issues, say so and mention remaining risk.
