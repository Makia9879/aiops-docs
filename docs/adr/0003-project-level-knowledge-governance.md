# 0003. Govern project-level knowledge with hooks, diff records, and canonical documents

Date: 2026-06-07

## Status

Accepted

## Context

The AIOps knowledge workflow must support historical project documentation, daily documentation maintenance, new project knowledge initialization, and later project maintenance by coding agents. The target projects may contain multiple product domains, such as CA, RA, KMC, and OCSP inside a digital certificate authentication system.

The initial schema organized documents as agent-facing files such as `00-project-card.md`, `01-architecture.md`, and `09-maintenance-guide.md`. That structure is useful for a first pass, but it is too narrow for project-level governance, multi-product knowledge, human reading, and hook-driven maintenance.

The workflow also needs mechanical triggers. Relying on a coding agent to remember document updates is not sufficient for governance.

## Decision

Use the whole project as the primary governance object. Model sub-products as product domains within that project, not as independent governance roots by default.

Use this canonical knowledge structure as the target shape:

```text
.aiops/projects/<project>/
  project.yaml
  README.md
  open-questions.md
  prd/
  architecture/
  specs/
  adr/
  workflows/
  guides/
```

Use `prd`, `architecture`, `specs`, `adr`, and `workflows` as the primary knowledge grains. `specs/` may be internally split by product domain and shared concerns, because specs are the main agent-facing implementation contracts.

Separate the canonical knowledge layer from the human reading layer. Canonical documents optimize retrieval, evidence, update boundaries, and coding-agent maintenance. `guides/` documents optimize human onboarding, overview, navigation, and change playbooks, and should link back to canonical documents.

Do not require per-document structured metadata or frontmatter. Canonical documents should remain Markdown-first knowledge artifacts. Maintenance recall is driven by the semantic content of pending diff records and workspace-wide search, not by mandatory structured fields on every document.

Use hooks as detection and governance mechanisms, not silent document writers. Codex and Claude Code hooks should call shared `.aiops/hooks/` scripts that:

- create diff records from code, config, task, and documentation changes;
- inject pending maintenance context into agent turns;
- summarize likely affected knowledge layers and content directions;
- ask the human whether to update documents when below threshold;
- trigger automatic maintenance when pending maintenance debt exceeds governance-level thresholds.

Use Markdown diff records as the queue between hooks and knowledge maintenance. `aiops-daily-doc-maintenance` consumes pending diff records, preferably through subagents when automatic maintenance is triggered, updates canonical documents, updates reading guides when affected, and archives handled diff records.

Store diff records as workspace-level Markdown documents under `.aiops/diff-records/`. Each record should describe the changed files, observed context, likely project or product area when known, and the semantic direction of the possible documentation update. Hooks should avoid making broad knowledge edits; they only append concise semantic change notes to pending Markdown records.

`.aiops/diff-records/pending.md` is the active maintenance input. When records are handled, move the handled sections to `.aiops/diff-records/archived/YYYY-MM-DD.md` with the maintenance result. Archived records are historical logs and are not part of active governance recall or maintenance-debt calculation.

Treat `pending.md` as semantic change input rather than an exact edit list. During maintenance, the agent or subagent should:

1. Read `.aiops/diff-records/pending.md`.
2. Summarize the pending change semantics and extract keywords.
3. Use those keywords to recall files and content context across the whole workspace.
4. Update the relevant files and surrounding content context consistently.
5. Commit the resulting git changes when the workflow has permission to do so.

This prevents narrow updates where, for example, an interface document changes while a related data-flow or workflow document remains stale.

Use `governance_level` presets to reduce configuration burden:

- `low`: record only.
- `medium`: record and gently remind.
- `high`: recommended default; record, remind, and auto-maintain after thresholds.
- `xhigh`: strong governance for security, compliance, finance, certificate systems, and core infrastructure.

Allow a global project `governance_level` with optional product-domain overrides.

Let `governance_level` also decide whether documentation maintenance commits are automatic. `low` and `medium` should not auto-commit by default. `high` may auto-commit documentation-only maintenance changes after automatic maintenance succeeds. `xhigh` should auto-commit successful documentation maintenance unless the workspace has unhandled non-document changes or an explicit user instruction prevents it.

Use standardized commit messages for automatic AIOps documentation commits. The commit type should be `docs(aiops)`, the subject should follow the configured knowledge language, and the project name should be included. Automatic commits must not mix source-code changes with documentation governance changes unless the human explicitly asks for that.

Default generated and maintained knowledge documents to Chinese unless initialization specifies another language. Store the selected knowledge language in governance configuration so it can be changed after installation. Changing the language affects future generated diff records, guides, and maintenance updates; existing documents should not be bulk-translated by the installer.

Treat Trellis as a task and context-injection layer, not as the canonical knowledge source. The canonical source is `.aiops/projects/<project>/`; Trellis `.trellis/spec/` is an operational mirror, `.trellis/tasks/` is task evidence, and `.trellis/workspace/` is session memory.

Add `aiops-governance-bootstrap` to install the project knowledge structure, shared AIOps hook scripts, Codex hook adapter, Claude Code hook adapter, Trellis integration detection, and initial governance records.

Do not require hooks to be installed at skill installation time. Skill installation only makes the workflow available to agents. When an AIOps governance skill is used inside a project, the agent should first check for an installed governance marker. If the marker is missing, the agent should tell the human that hooks are not installed and then run `aiops-governance-bootstrap` to install the hooks and marker unless the human objects.

The CLI should expose separate idempotent actions:

- `install`: install or update the AIOps skills in the agent runtime without modifying the current project.
- `init`: install or update AIOps governance assets for the current project.
- `setup`: run `install` and `init` together.

All three actions must be idempotent. Re-running them should verify the existing installation, add missing files, update managed files when needed, and avoid duplicate skills, duplicate hook entries, or duplicate diff-record state.

Do not optimize the first version around hook upgrade scenarios. Once generated, `.aiops/hooks/**` should be treated like governed documentation and script assets inside the workspace. The installer may create missing hook files during bootstrap, but later changes to hooks should be handled as ordinary governed workspace changes rather than silent installer upgrades.

Long-lived project knowledge is not installer-owned. The installer may create missing canonical knowledge files, but it must never template-overwrite existing files under `.aiops/projects/<project>/`; those files are maintained by the knowledge maintenance and review workflows.

Separate installer state from project knowledge state. `.aiops/governance.yaml` is owned by the installer and records hook installation, managed files, installer version, platform adapters, and the active knowledge root. `.aiops/projects/<project>/project.yaml` is owned by the knowledge governance workflow and records the governed project, product domains, source roots, canonical paths, tools, knowledge status, and governance-level overrides. The installer may create `project.yaml` and safely add missing structural fields, but it must not overwrite project knowledge fields that humans or agents have maintained.

## Consequences

The skills must evolve from prompt-only document-generation helpers into an installable governance system with references, templates, and scripts.

The document schema must be rewritten around project-level governance and the canonical structure above.

Hooks should remain deterministic and low-risk. They create records, inject context, and trigger maintenance workflows; they do not silently rewrite the knowledge base.

Human-facing documents remain useful without weakening agent retrieval, because `guides/` is a reading layer over canonical knowledge rather than a replacement for it.

The default user experience is simpler: bootstrap should ask for project name, product domains, and one governance level, while detecting Codex, Claude Code, Trellis, and source roots where possible.

Bootstrap may ask for a knowledge language when the user wants a non-Chinese knowledge base. Otherwise it should default to Chinese and record the choice for future skills and hooks.

Bootstrap questioning should be guided and implemented as a reusable TypeScript flow. The CLI should expose a TUI that asks the same canonical bootstrap questions with defaults, validation, and detected values. The skills should reference the same question model so an LLM can guide the human through the same questions and recommended defaults when the TUI is not used.

The TUI should ask only the core questions by default: project name, product domains, governance level, and knowledge language. Advanced options should be available but collapsed by default, including source roots, knowledge root, Codex hooks, Claude Code hooks, Trellis integration, and auto-commit override behavior.

Product domains may be left empty during bootstrap. When the user does not provide product domains, bootstrap should create a default `core` product domain. Historical intake or later maintenance may split `core` into more precise product domains when the project structure becomes clear.

Project id should be inferred from manifests when possible, then from the workspace directory name. The inferred id must be shown to the human for confirmation. Project ids should use kebab-case; a separate display name may be used for human-readable names.

The workspace root defaults to the directory where `init` is executed. Bootstrap may infer source roots under that directory, but source-root accuracy is not required during bootstrap. Historical intake and later review are responsible for confirming and refining source roots.

When `init` runs from a nested directory, it should recursively search upward for an existing `.aiops/` directory, similar to recursive task runner discovery. If found, use that directory as the workspace governance root and create or update `.aiops/projects/<project>/` there. If no parent `.aiops/` is found, create `.aiops/projects/<project>/` under the current directory.

The canonical knowledge and governance records under `.aiops/` should be versioned by default. `.aiops/projects/**`, `.aiops/diff-records/**`, `.aiops/governance.yaml`, and `.aiops/hooks/**` should be committed unless the human configures otherwise. Local runtime state should be isolated under ignored paths such as `.aiops/local/`, `.aiops/cache/`, and `.aiops/tmp/`.

Because `.aiops/governance.yaml` is versioned by default, it must not contain machine-local absolute paths or developer-local state. Shared governance configuration should use workspace-relative paths. Machine-local state belongs under ignored paths such as `.aiops/local/`.

Lazy bootstrap keeps skill installation lightweight while still preventing silent use of ungoverned workflows. The project marker becomes the quick check that tells future agents whether hooks and governance state are already installed.

Idempotent installation is required because agents and humans may repeat setup commands while troubleshooting or onboarding. For the first version, idempotency means detecting existing governance files, avoiding duplicate hook entries, and creating only missing files by default.

Platform hook configuration should use append-only idempotent behavior. If `.codex/hooks.json` or `.claude/settings.json` does not exist, bootstrap may create it. If it exists and does not contain the AIOps hook entries, bootstrap should append only those entries. If the AIOps hook entries are already present, bootstrap should do nothing. If the file cannot be parsed safely, bootstrap should stop and ask the human instead of overwriting it.

Canonical project knowledge is a durable asset rather than a generated install artifact. Protecting it from installer overwrite is more important than making setup fully automatic.

Keeping installer state separate from project knowledge avoids a common failure mode where setup or upgrade commands accidentally rewrite the domain model or source-root decisions made during historical intake and maintenance.
