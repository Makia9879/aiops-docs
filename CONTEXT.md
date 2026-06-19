# Context

## Glossary

### Workspace

The working directory scope where AIOps governance assets are installed and executed. A workspace may contain one or more governed projects and may or may not map one-to-one to a Git repository.

中文术语：工作区。

### AIOps Knowledge Lifecycle

The end-to-end workflow for creating, recalling, maintaining, and reviewing structured project knowledge for AIOps work. It covers historical project intake from existing code, development context recall for coding-agent work, daily documentation maintenance by coding agents, and new project briefing from requirements input.

中文术语：AIOps 知识库生命周期工作流。

### Scenario-Oriented Subskills

The AIOps Knowledge Lifecycle is decomposed by input scenario rather than by processing phase. The primary subskills are historical project intake, development context recall, daily documentation maintenance, and new project briefing. Shared phases such as evidence collection, schema mapping, writing, and review live in shared references or scripts.

中文术语：场景导向子技能。

### Agent Evidence Layer

The implementation fact layer that coding agents use for source-level truth. It is made from source code, tests, configs, manifests, Git history, `codegraph` call relationships, and `understand-anything` knowledge graphs. It replaces Markdown `specs/` as the source for executable contracts and implementation details.

中文术语：Agent 事实层。

### Project-Level Knowledge Governance

The project-level Git origin repository is the commit boundary for governed knowledge. Inside that boundary, the knowledge model is organized as project, product, and service governance objects. A governed project may contain multiple products, and each product may contain multiple source-code services.

中文术语：项目级知识库治理。

### Product

A product is a governed sub-product inside a project. It has stable identity, product-level overview, architecture, workflows, ADRs, and a service registry. Product versions are selected by project iterations rather than by local developer branches. Implementation contracts are recalled from source and graph evidence, not Markdown specs.

中文术语：产品。

### Service

A service is a source-code service under a product. Service reading docs describe business responsibility, architecture role, workflows, ADRs, external dependencies, and navigation into source evidence. Implementation entry points, API or RPC contracts, data models, runtime configuration, and validation commands belong to source code plus `codegraph` / `understand-anything`.

中文术语：微服务。

### Human Reading Layer

The long-lived Markdown layer for people to understand project intent, product boundaries, service responsibilities, architecture, workflows, ADRs, risks, and open questions. It is split into project iteration docs under `iterations/`, product docs under `products/<product>/`, and service docs under `products/<product>/services/<service>/`. It is derived from requirements, source evidence, Git history, and graph outputs, but it is not the executable spec.

中文术语：人类阅读层。

### Guides Site

The VuePress presentation of the human reading layer. It optimizes onboarding, overview, navigation, and change playbooks. It may reorganize the same human-readable knowledge, but implementation facts still come from the agent evidence layer.

中文术语：阅读站点。

### Commit Analysis Cursor

A durable Markdown record in the project reading layer that stores the last analyzed Git commit hash and commit time for each governed source branch. Maintenance uses it to find unanalysed commits on the next push.

中文术语：提交分析游标。

### Push Hook Maintenance

The maintenance workflow triggered by a Git push hook on the governed project main branch or bound service main branch. The hook starts a Claude Code process, which reviews unanalysed Git commits since the commit analysis cursor, summarizes each commit, updates the human reading layer, and records the commit hash and commit time after each successful analysis.

中文术语：Push Hook 文档维护。

### Semantic Maintenance

The maintenance workflow that reads unanalysed Git commits as semantic change signals, extracts product/topic/change-type keywords, recalls human reading docs plus source and graph evidence, and updates cross-document context consistently. It is broader than updating only files touched in a commit.

中文术语：语义维护。

### Development Context Recall

The workflow that first reads the human reading layer to understand business context, then reads source code and uses `codegraph` / `understand-anything` to recall implementation relationships before or during implementation, debugging, review, or explanation.

中文术语：文档召回辅助研发。

### Governance Level

A preset that controls the amount of knowledge-maintenance pressure applied by hooks and skills. The supported levels are `low`, `medium`, `high`, and `xhigh`; `high` is the recommended default.

中文术语：治理强度档位。

### Knowledge Language

The default authoring language for generated and maintained AIOps knowledge documents, diff records, and reading guides. The default is Chinese unless project initialization specifies another language. The language can be changed after installation through governance configuration.

中文术语：知识库语言。

### Project Iteration

A planned project delivery line that binds product versions and service branches for one round of documentation and implementation work.

中文术语：项目迭代。

### Product Version

A product delivery version selected by a project iteration. Products have versions; services do not have independent documentation versions in this model.

中文术语：产品版本。

### Service Main Branch

The source-code branch selected by a project iteration as the authoritative service branch for documentation maintenance.

中文术语：微服务主分支。

### Iteration Binding

A project-level `iteration-bindings.yaml` configuration that maps one project iteration to its documentation branch, product versions, and service main branches. Coding agents must read it before modifying human reading docs or treating source evidence as belonging to a selected iteration.

中文术语：迭代绑定。

### Operational Mirror

A task-execution copy or slice of human reading knowledge used by tools such as Trellis for context injection. Operational mirrors are not the long-lived source of truth.

中文术语：执行态镜像。

### Routed Skill Set

The AIOps Knowledge Lifecycle is implemented as multiple independently triggerable skills plus a routing skill. The routing skill chooses the scenario, while scenario skills handle historical project intake, development context recall, daily documentation maintenance, new project briefing, and knowledge review.

中文术语：路由式技能集。

### Skill Source and Runtime Copy

AIOps knowledge skills are authored in the workspace source tree under `skills/` and installed or copied to the agent runtime skill directory such as `~/.agents/skills/`. The workspace copy is the version-controlled source of truth when the workspace is under version control; the runtime copy is what agents load during work.

中文术语：技能源稿与运行副本。

## Local CLI Source Install

This repository must not run host `npm`, `npx`, `node`, or `python` commands. When testing unpublished CLI changes locally, build inside a temporary Docker Node image and copy the built package into the active nvm global package prefix.

Do not run `npm install -g /repo/packages/aiops-governance-cli --prefix /host-node` from inside the Docker mount. In this workspace it can create a host-side symlink from `~/.nvm/versions/node/<version>/lib/node_modules/@makia9879/aiops` to the container-only `/repo/...` path, leaving the host `aiops` command broken.

The working source-install flow is:

```bash
docker run --rm \
  -v /Users/makia98/lij/work/CA/aiops-docs:/repo \
  -v /Users/makia98/.nvm/versions/node/v24.15.0:/host-node \
  -v /private/tmp/aiops-local-copy-from-source.sh:/tmp/aiops-local-copy-from-source.sh \
  -w /repo/packages/aiops-governance-cli \
  node:24-bookworm \
  bash /tmp/aiops-local-copy-from-source.sh
```

The helper script should run `npm ci`, `npm run build`, `npm run prepare-package`, remove any bad symlink at `/host-node/lib/node_modules/@makia9879/aiops`, copy `dist`, `assets`, `scripts`, `package.json`, `README.md`, and `LICENSE` into that real package directory, chmod `dist/cli.js`, and recreate `/host-node/bin/aiops` as a symlink to `../lib/node_modules/@makia9879/aiops/dist/cli.js`.

After installing, verify with:

```bash
aiops --help
aiops check --with none
```
