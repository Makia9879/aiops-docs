# 0003. Govern project-level knowledge with branch-bound project, product, and service documents

Date: 2026-06-07

## Status

Accepted

## Context

The AIOps knowledge workflow must support historical project documentation, document recall that assists coding-agent development, daily documentation maintenance, new project knowledge initialization, and later project maintenance by coding agents. The target projects may contain multiple products, such as CA, RA, KMC, and OCSP inside a digital certificate authentication system, and each product may contain one or more independently maintained source-code services.

The first project-level schema organized canonical documents directly under `.aiops/projects/<project>/` as `prd/`, `architecture/`, `specs/`, `adr/`, and `workflows/`. That was enough for a first project-level governance pass, but it did not explicitly model:

- product-level versions inside a project iteration;
- service-level source roots and required source branches;
- the binding between a project documentation branch, product versions, and service main branches;
- where external upstream and downstream service relationships should be documented;
- how an agent should react when local source branches do not match the iteration being documented.

The workflow also needs mechanical triggers. Relying on a coding agent to remember document updates is not sufficient for governance.

## Decision

Use the project-level Git origin repository as the submission boundary for governed knowledge. Do not split products or services into local-only documentation copies by default. A single project-level documentation origin may contain multiple project directories, and each project directory manages multiple products and services.

Use this canonical knowledge structure as the target shape:

```text
.aiops/projects/<project>/
  project.yaml
  iteration-bindings.yaml
  README.md
  open-questions.md

  iterations/
    <project-iteration>/
      iteration.yaml
      prd.md
      architecture.md
      release-scope.md
      risks.md

  products/
    <product>/
      product.yaml
      prd/
      architecture/
      workflows/
      specs/
      adr/

      services/
        <service>/
          service.yaml
          architecture/
          specs/
          workflows/
          adr/

  guides/
```

Model the durable governance objects as:

- project iteration: project-level delivery scope and shared constraints;
- product: stable sub-product identity and product-level capability surface;
- service: stable source-code service identity and service-level implementation contracts.

Use `iteration-bindings.yaml` as the branch-bound maintenance contract. It maps one project iteration to its documentation branch, selected product versions, and service main branches. Products have versions. Services have required main branches. Do not introduce a service version field and do not record local temporary developer branches in the documentation version model.

Before modifying canonical docs, agents and hooks must resolve the selected project iteration from `iteration-bindings.yaml`. When a service is in scope, the agent must compare `git -C <code_root> branch --show-current` with the bound `required_branch`. If they differ, the default action is to stop canonical edits and ask the human to switch branches or explicitly confirm that the docs should still be maintained against the selected iteration binding. The mismatch may be recorded in `.aiops/diff-records/pending.md` or `open-questions.md`.

Keep external upstream and downstream call relationships in the current product or service canonical docs. The side that initiates the call or carries the business dependency documents the call entry point, protocol, responsibility boundary, error semantics, and validation path. The called side's docs are supporting evidence for interface and behavior facts. Do not create a separate `cross/` directory, `integration.yaml`, or cross-domain version matrix by default.

Separate the canonical knowledge layer from the human reading layer. Canonical documents optimize retrieval, evidence, update boundaries, and coding-agent maintenance. `guides/` documents optimize human onboarding, overview, navigation, and change playbooks, and must link back to canonical documents instead of becoming a separate fact source.

Do not require per-document structured metadata or frontmatter. Canonical documents should remain Markdown-first knowledge artifacts. Maintenance recall is driven by the semantic content of pending diff records, iteration binding context, and workspace-wide search, not by mandatory structured fields on every document.

Use canonical knowledge as a first-class development input, not only as a maintenance output. Before or during implementation, debugging, review, explanation, and test-writing tasks, coding agents should run a development context recall pass: read `project.yaml`, read `iteration-bindings.yaml`, identify the selected project iteration, recall relevant project/product/service canonical docs, check open questions, and verify current behavior against source evidence. When service code is in scope, the same service branch preflight applies; if the current branch differs from `required_branch`, the agent must state that mismatch and treat canonical docs as target-iteration context unless the human confirms otherwise.

Use hooks as detection and governance mechanisms, not silent document writers. Codex and Claude Code hooks should call shared `.aiops/hooks/` scripts from the AIOps docs repository. Source repositories may install a local `.aiops-docs.yaml` pointer and local hook helper so source-repo hook events are delivered to the separate docs repository instead of creating an independent `.aiops/` tree. The hook scripts:

- create pending records from semantically useful agent events, such as user prompts, tool results, final outputs, and subagent summaries;
- inject pending maintenance context and development recall guidance into agent turns;
- summarize likely affected project, product, and service documents;
- remind the agent that canonical edits require iteration binding preflight;
- ask the human whether to update documents when below threshold;
- trigger Claude Code maintenance when pending maintenance debt exceeds governance-level thresholds.

For source-development and external-user runtime, generated hook runners should prefer temporary Docker Python containers. If Docker is unavailable or the container run fails, the runner may fall back to native `python3` / `python` so governance capture continues instead of silently disappearing.

Use Markdown diff records as the queue between hooks and knowledge maintenance. `.aiops/diff-records/pending.md` is the active maintenance input in the docs repository. It stores asynchronous agent trace summaries, source repository locations, source branch/head hints, touched paths, and hook output excerpts. It is not a full source diff and hooks must not try to infer complete documentation semantics. When records are handled, the maintenance executor moves handled sections to `.aiops/diff-records/archived/YYYY-MM-DD.md` with the maintenance result. Archived records are historical logs and are not part of active governance recall or maintenance-debt calculation.

Treat `pending.md` as semantic change input rather than an exact edit list. During maintenance, the agent or subagent should:

1. Read `.aiops/diff-records/pending.md`.
2. Identify the affected project, product, service, and project iteration.
3. Read `project.yaml`, `iteration-bindings.yaml`, and relevant `product.yaml` and `service.yaml` files.
4. Verify required documentation and service branch bindings, or obtain human confirmation for mismatches.
5. Summarize the pending change semantics and extract keywords.
6. Use those keywords to recall files and content context across the whole workspace.
7. Update the relevant canonical files and surrounding context consistently.
8. Update guides when human-facing reading paths are affected.
9. Commit the resulting git changes when the workflow has permission to do so.

When the user is asking for code work rather than documentation maintenance, route to `aiops-dev-context-recall` before editing code. That skill should produce only the amount of context needed for the task and should not update canonical docs unless the human explicitly asks for documentation changes.

Use `governance_level` presets to reduce configuration burden:

- `low`: record only.
- `medium`: record and gently remind.
- `high`: recommended default; record, remind, and auto-maintain after thresholds.
- `xhigh`: strong governance for security, compliance, finance, certificate systems, and core infrastructure.

Allow a global project `governance_level` with optional product or service overrides when a project needs stricter local rules. The default should remain project-level unless a human explicitly sets an override.

Let `governance_level` also decide whether documentation maintenance runs and commits are automatic. `low` records only. `medium` reminds only. `high` starts Claude Code maintenance asynchronously after the pending threshold is reached and may auto-commit documentation-only maintenance changes after automatic maintenance succeeds. `xhigh` starts Claude Code maintenance synchronously whenever pending records exist and should auto-commit successful documentation maintenance unless branch preflight, unclear ownership, or an explicit user instruction prevents it. If Claude Code is unavailable, hooks should only print a fallback prompt telling the current coding LLM to use a subagent for `aiops-daily-doc-maintenance`; they should not append runner-failure noise to `pending.md`.

Use standardized commit messages for automatic AIOps documentation commits. The commit type should be `docs(aiops)`, the subject should follow the configured knowledge language, and the project name should be included. Automatic commits must not mix source-code changes with documentation governance changes unless the human explicitly asks for that.

Default generated and maintained knowledge documents to Chinese unless initialization specifies another language. Store the selected knowledge language in governance configuration so it can be changed after installation. Changing the language affects future generated diff records, guides, and maintenance updates; existing documents should not be bulk-translated by the installer.

Treat Trellis as a task and context-injection layer, not as the canonical knowledge source. The canonical source is `.aiops/projects/<project>/`; Trellis `.trellis/spec/` is an operational mirror, `.trellis/tasks/` is task evidence, and `.trellis/workspace/` is session memory.

Add `aiops-governance-bootstrap` to install the project knowledge structure, shared AIOps hook scripts, Codex hook adapter, Claude Code hook adapter, Trellis integration detection, and initial governance records.

Do not require hooks to be installed at skill installation time. Skill installation only makes the workflow available to agents. When an AIOps governance skill is used inside a project, the agent should first check for an installed governance marker. If the marker is missing, the agent should tell the human that hooks are not installed and then run `aiops-governance-bootstrap` to install the hooks and marker unless the human objects.

The CLI should expose idempotent actions:

- `install`: install or update the AIOps skills in the agent runtime without modifying the current project.
- `init`: install or update AIOps governance assets for the current project.
- `setup`: run `install` and `init` together.
- `config-ui`: start a local-only browser UI for editing project iterations, product versions, service code roots, and service required branches.

All actions must be idempotent. Re-running them should verify the existing installation, add missing files, update managed files when needed, and avoid duplicate skills, duplicate hook entries, duplicate diff-record state, or overwritten human-authored project knowledge.

Do not optimize the first version around hook upgrade scenarios. Once generated, `.aiops/hooks/**` should be treated like governed documentation and script assets inside the workspace. The installer may create missing hook files during bootstrap, but later changes to hooks should be handled as ordinary governed workspace changes rather than silent installer upgrades.

Long-lived project knowledge is not installer-owned. The installer may create missing canonical knowledge files and safely add missing structural config fields, but it must never template-overwrite existing files under `.aiops/projects/<project>/`.

Separate installer state from project knowledge state. `.aiops/governance.yaml` is owned by the installer and records hook installation, managed files, installer version, platform adapters, and the active knowledge root. `.aiops/projects/<project>/project.yaml` is owned by the knowledge governance workflow and records the governed project, product registry, canonical paths, tools, language, and governance settings. `.aiops/projects/<project>/iteration-bindings.yaml` is owned by knowledge governance and records the selected project iteration bindings.

Because `.aiops/governance.yaml` is versioned by default, it must not contain machine-local absolute paths or developer-local state. Shared governance configuration should use workspace-relative paths. Machine-local state belongs under ignored paths such as `.aiops/local/`.

## Consequences

The skills must evolve from prompt-only document-generation helpers into an installable governance system with references, templates, scripts, and branch-bound maintenance preflight.

The document schema must be rewritten around project, product, and service governance under a project-level Git origin boundary.

Hooks should remain deterministic and low-risk. They create records, inject context, and trigger maintenance workflows; they do not silently rewrite the knowledge base or change Git branches.

Human-facing documents remain useful without weakening agent retrieval, because `guides/` is a reading layer over canonical knowledge rather than a replacement for it.

Bootstrap should ask for project identity, products, services, governance level, and knowledge language, with iteration binding details available through the CLI/TUI and `config-ui`. Product or service details may start with safe defaults, but later intake or maintenance must refine them with evidence.

Project id should be inferred from manifests when possible, then from the workspace directory name. The inferred id must be shown to the human for confirmation. Project ids should use kebab-case; a separate display name may be used for human-readable names.

The workspace root defaults to the directory where `init` is executed. Bootstrap may infer source roots under that directory, but final service `code_root` accuracy is confirmed during historical intake, review, or config UI editing.

When `init` runs from a nested directory, it should recursively search upward for an existing `.aiops/` directory, similar to recursive task runner discovery. If found, use that directory as the workspace governance root and create or update `.aiops/projects/<project>/` there. If no parent `.aiops/` is found, create `.aiops/projects/<project>/` under the current directory.

The canonical knowledge and governance records under `.aiops/` should be versioned by default. `.aiops/projects/**`, `.aiops/diff-records/**`, `.aiops/governance.yaml`, and `.aiops/hooks/**` should be committed unless the human configures otherwise. Local runtime state should be isolated under ignored paths such as `.aiops/local/`, `.aiops/cache/`, and `.aiops/tmp/`.

Lazy bootstrap keeps skill installation lightweight while still preventing silent use of ungoverned workflows. The project marker becomes the quick check that tells future agents whether hooks and governance state are already installed.

Idempotent installation is required because agents and humans may repeat setup commands while troubleshooting or onboarding. For the first version, idempotency means detecting existing governance files, avoiding duplicate hook entries, creating only missing files by default, and stopping on conflicts instead of overwriting maintained product, service, or iteration binding content.

Platform hook configuration should use append-only idempotent behavior. If `.codex/hooks.json` or `.claude/settings.json` does not exist, bootstrap may create it. If it exists and does not contain the AIOps hook entries, bootstrap should append only those entries. If the AIOps hook entries are already present, bootstrap should do nothing. If the file cannot be parsed safely, bootstrap should stop and ask the human instead of overwriting it.

Canonical project knowledge is a durable asset rather than a generated install artifact. Protecting it from installer overwrite is more important than making setup fully automatic.
