# Review Checklist

Before finishing, check:

- Schema: required files exist or intentionally omitted with reason.
- Iteration binding: `iteration-bindings.yaml` exists before canonical maintenance and records project iteration, product versions, and service required branches.
- Evidence: factual claims cite source paths or are marked as assumptions.
- Agent usability: docs include entry points, impact areas, update rules, and validation hints.
- Scope control: daily maintenance changed only affected sections.
- Terminology: canonical terms are consistent with project `CONTEXT.md` when present.
- Open questions: weak or missing evidence is captured in `.aiops/projects/<project>/open-questions.md`.
- No filler: remove marketing prose, repeated README summaries, and unexplained file listings.
- Human reading: `.aiops/projects/<project>/guides/docs/` contains overview, onboarding, and change playbook pages when the project is ready for use.
- Governance boundaries: no unexpected `reviews/`, `evidence/`, `cross/`, `integration.yaml`, JSONL diff records, workspace guides aggregation, service version fields, or machine-local absolute paths in shared config.

For historical intake, also check:

- Architecture, interfaces, workflows, and extension points are covered.
- Generated graphs were used or the fallback path is documented.
- Output uses `.aiops/projects/<project>/iterations/<project-iteration>/`, `.aiops/projects/<project>/products/<product>/`, and `.aiops/projects/<project>/products/<product>/services/<service>/`.
- Product and service boundaries are explicit.
- External upstream/downstream calls are documented in the owning product or service docs with entry point, protocol, responsibility boundary, error semantics, and validation path where evidence exists.

For new briefing, also check:

- Requirements-derived claims are labelled as assumptions until code exists.
- Product/service assumptions and branch binding placeholders are captured in `open-questions.md`.
- `workflows/`, `specs/`, or `guides/docs/change-playbook.md` explain how to replace assumptions with source evidence later.

For daily maintenance, also check:

- `.aiops/diff-records/pending.md` was summarized semantically.
- The selected project iteration, product version, and service required branch were read before canonical edits.
- Service current branch mismatches were handled by stopping, asking for confirmation, or recording pending/open questions.
- Related docs were recalled across the whole workspace, not only by file path.
- Handled pending sections were archived to `.aiops/diff-records/archived/YYYY-MM-DD.md`.
