# Context

## Glossary

### Workspace

The working directory scope where AIOps governance assets are installed and executed. A workspace may contain one or more governed projects and may or may not map one-to-one to a Git repository.

中文术语：工作区。

### AIOps Knowledge Lifecycle

The end-to-end workflow for creating, maintaining, and reviewing structured project knowledge for AIOps work. It covers historical project intake from existing code, daily documentation maintenance by coding agents, and new project briefing from requirements input.

中文术语：AIOps 知识库生命周期工作流。

### Scenario-Oriented Subskills

The AIOps Knowledge Lifecycle is decomposed by input scenario rather than by processing phase. The primary subskills are historical project intake, daily documentation maintenance, and new project briefing. Shared phases such as evidence collection, schema mapping, writing, and review live in shared references or scripts.

中文术语：场景导向子技能。

### Agent-Executable Knowledge Schema

The structured knowledge base should optimize for coding-agent maintenance, not for human-facing project marketing. Each document should help an agent locate evidence, understand impact, preserve terminology, update only affected sections, and choose validation steps.

中文术语：面向 coding agent 的可执行知识结构。

### Project-Level Knowledge Governance

The project-level Git origin repository is the commit boundary for governed knowledge. Inside that boundary, the knowledge model is organized as project, product, and service governance objects. A governed project may contain multiple products, and each product may contain multiple source-code services.

中文术语：项目级知识库治理。

### Product

A product is a governed sub-product inside a project. It has stable identity, product-level PRD, architecture, specs, workflows, ADRs, and a service registry. Product versions are selected by project iterations rather than by local developer branches.

中文术语：产品。

### Service

A service is a source-code service under a product. Service canonical docs describe implementation entry points, API or RPC contracts, data models, runtime configuration, business rules, validation commands, and external upstream or downstream calls owned by that service.

中文术语：微服务。

### Canonical Knowledge Layer

The long-lived source of truth for governed project knowledge. It is split into project iteration docs under `iterations/`, product docs under `products/<product>/`, and service docs under `products/<product>/services/<service>/`. Human guides remain a reading layer and are not the fact source.

中文术语：权威知识层。

### Reading Layer

Human-facing guides derived from, and linked back to, canonical knowledge. Reading-layer documents optimize onboarding, overview, navigation, and change playbooks without replacing canonical documents as the source of truth.

中文术语：人类阅读层。

### Diff Record

A Markdown record of a code, config, task, or documentation change that may require knowledge maintenance. Hooks append concise semantic records; maintenance skills consume and archive them.

中文术语：变更记录。

### Maintenance Debt

The accumulated set of pending diff records that have not yet been reviewed, ignored, archived, or applied to the canonical knowledge layer.

中文术语：文档维护债务。

### Semantic Maintenance

The maintenance workflow that reads pending Markdown diff records as semantic change signals, extracts product/topic/change-type keywords, recalls related canonical documents, and updates cross-document context consistently. It is broader than updating only files explicitly listed by a hook.

中文术语：语义维护。

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

A project-level `iteration-bindings.yaml` configuration that maps one project iteration to its documentation branch, product versions, and service main branches. Coding agents must read it before modifying canonical docs.

中文术语：迭代绑定。

### Operational Mirror

A task-execution copy or slice of canonical knowledge used by tools such as Trellis for context injection. Operational mirrors are not the long-lived source of truth.

中文术语：执行态镜像。

### Routed Skill Set

The AIOps Knowledge Lifecycle is implemented as multiple independently triggerable skills plus a routing skill. The routing skill chooses the scenario, while scenario skills handle historical project intake, daily documentation maintenance, new project briefing, and knowledge review.

中文术语：路由式技能集。

### Skill Source and Runtime Copy

AIOps knowledge skills are authored in the workspace source tree under `skills/` and installed or copied to the agent runtime skill directory such as `~/.agents/skills/`. The workspace copy is the version-controlled source of truth when the workspace is under version control; the runtime copy is what agents load during work.

中文术语：技能源稿与运行副本。
