# Context

## Glossary

### AIOps Knowledge Lifecycle

The end-to-end workflow for creating, maintaining, and reviewing structured project knowledge for AIOps work. It covers historical project intake from existing code, daily documentation maintenance by coding agents, and new project briefing from requirements input.

中文术语：AIOps 知识库生命周期工作流。

### Scenario-Oriented Subskills

The AIOps Knowledge Lifecycle is decomposed by input scenario rather than by processing phase. The primary subskills are historical project intake, daily documentation maintenance, and new project briefing. Shared phases such as evidence collection, schema mapping, writing, and review live in shared references or scripts.

中文术语：场景导向子技能。

### Agent-Executable Knowledge Schema

The structured knowledge base should optimize for coding-agent maintenance, not for human-facing project marketing. Each document should help an agent locate evidence, understand impact, preserve terminology, update only affected sections, and choose validation steps.

中文术语：面向 coding agent 的可执行知识结构。

### Routed Skill Set

The AIOps Knowledge Lifecycle is implemented as multiple independently triggerable skills plus a routing skill. The routing skill chooses the scenario, while scenario skills handle historical project intake, daily documentation maintenance, new project briefing, and knowledge review.

中文术语：路由式技能集。

### Skill Source and Runtime Copy

AIOps knowledge skills are authored in the repository under `skills/` and installed or copied to the agent runtime skill directory such as `~/.agents/skills/`. The repository copy is the version-controlled source of truth; the runtime copy is what agents load during work.

中文术语：技能源稿与运行副本。
