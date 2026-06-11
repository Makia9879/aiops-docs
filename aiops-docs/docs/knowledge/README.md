# 项目概述

AIOps 知识治理是一套面向 AI coding agent 的项目知识基础设施。它是一个从初始化、生成、召回到维护的完整工作机制，让 agent 持续理解项目，每次都带着完整的项目上下文工作。

这篇文章概述 AIOps 知识治理的全貌：包含什么、怎么组织、以及各部分如何协同工作。

## 四个场景

AIOps 知识治理按输入来源和使用方向分成四个核心场景。它们共享同一套 `.aiops/projects/<project>/` 知识结构，不管从哪个入口进入，产出的文档都能被其他场景复用。

### 历史项目入库

**输入**：已有代码、配置、测试、旧文档。**方向**：从源码逆向生成结构化知识。

接手一个维护了几年的老项目？文档散落在 README、Wiki、设计文档里？这个场景从源码、配置、测试出发，逆向提炼项目边界、模块职责、业务链路和关键决策。重点是区分"能证明的事实"和"看起来很合理的推测"。

> 详见 [历史项目入库](./historical-project-documentation.md)

### 文档召回辅助研发

**输入**：研发任务 + canonical docs。**方向**：把知识变成代码约束。

开发、调试、评审、解释和写测试之前，agent 先读取项目迭代绑定，再按项目、产品、微服务召回 canonical docs，回到源码核验证据。目标是让 agent 带着项目约束改代码，以完整的项目知识为基础。

> 详见 [文档召回辅助研发](./development-context-recall.md)

### 日常文档维护

**输入**：Hook 的 pending 记录。**方向**：随代码变更增量更新知识库。

文档写完就过时？这个场景通过 Hook 自动记录有语义价值的 agent 事件，达到治理阈值后启动 Claude Code 维护任务，根据 pending 记录做跨文档一致性更新——改一个接口规格，相关的 architecture、workflows、guides 一起同步。

> 详见 [日常文档维护](./document-maintenance.md)

### 新项目初始化

**输入**：PRD、会议记录、需求文档。**方向**：从需求建立知识骨架。

新项目从第一天就建立知识治理骨架——项目边界、产品和微服务边界、迭代绑定、平台 Hook 配置。不等代码写完了再回头补文档。初始化是幂等的，可以反复执行来补全结构。

> 详见 [新项目初始化](./new-project-initialization.md)

## 三个工具

CLI 在安装时会检查并自动补齐三个辅助工具到 `~/.aiops/tools/`。工具链为可选，可通过 `--with none` 跳过；在代码理解和上下文注入场景中默认推荐安装。

| 工具 | 版本 | 用途 |
|------|------|------|
| **CodeGraph** | 0.9.9 | 代码调用关系图谱，帮助定位模块依赖和影响范围 |
| **Understand Anything** | 2.7.6 | 通用代码理解，从源码提炼项目结构和业务概念 |
| **Trellis** | 0.5.19 | 任务执行和上下文注入层（辅助，不作为 canonical source） |

安装程序会先汇总本地工具链版本和缺失项。交互式终端询问是否自动补齐；带 `--yes` 时自动补齐。

## 七个技能

治理体系包含 7 个独立技能，由一个总调度技能按场景路由：

```
aiops-knowledge-lifecycle（总调度）
  ├── aiops-governance-bootstrap（治理初始化）
  ├── aiops-historical-project-intake（历史项目入库）
  ├── aiops-dev-context-recall（文档召回辅助研发）
  ├── aiops-daily-doc-maintenance（日常维护）
  ├── aiops-new-project-briefing（新项目初始化）
  └── aiops-knowledge-review（质量审查）
```

大多数情况无需手动选择技能。对 agent 说"帮我整理项目知识库"或"先召回文档辅助研发"，lifecycle 会根据意图自动路由到正确的子技能。

| 技能 | 触发语 | 做什么 |
|-----|-------|--------|
| [知识生命周期](./skills/aiops-knowledge-lifecycle.md) | "整理知识库""更新文档""审查知识"等 | 路由到正确的子技能 |
| [治理引导](./skills/aiops-governance-bootstrap.md) | "初始化 AIOps""安装治理工具" | 安装技能、初始化 `.aiops/` 结构 |
| [历史项目入库](./skills/aiops-historical-project-intake.md) | "整理这个项目的知识库" | 从已有代码逆向生成知识文档 |
| [文档召回辅助研发](./skills/aiops-dev-context-recall.md) | "先召回文档""按知识库辅助研发" | 召回项目上下文作为开发约束 |
| [日常文档维护](./skills/aiops-daily-doc-maintenance.md) | "更新文档""检查知识库" | 根据 pending 记录跨文档同步更新 |
| [新项目简报](./skills/aiops-new-project-briefing.md) | "为新项目初始化知识库" | 从需求输入建立知识骨架 |
| [知识审查](./skills/aiops-knowledge-review.md) | "审查知识库""检查文档质量" | 检查完整性、一致性、agent 可用性 |

> 详见 [技能说明](./skills.md)

## 三个 Hook

Hook 是连接代码活动和知识维护的桥梁。目前在 Claude Code 和 Codex 两个平台上实现。**Hook 只负责记录和触发，不改文档**——理解语义、判断影响面、更新文档由维护 agent 完成。

| Hook | 触发时机 | 做什么 |
|------|---------|--------|
| `aiops_inject_context` | 任务开始时 | 注入项目知识库上下文给 agent |
| `aiops_record_diff` | 有语义价值的 agent 事件后 | 在文档仓库 `pending.md` 追加变更摘要 |
| `aiops_trigger_maintenance` | 会话结束时 | 检查 pending 阈值，决定是否调用 Claude Code 维护 |

Hook 配置通过 CLI 的 `init` 命令写入平台配置文件（`.claude/settings.json` 和 `.codex/hooks.json`），写入是幂等的。源码仓库可通过 `link-docs` 命令将 hook 事件投递到独立的文档仓库。

> 详见 [治理模型](./governance-model.md) 了解 Hook 机制和治理等级的完整说明。

## 关键设计

开始使用之前，以下是几个贯穿整个方案的核心概念。

### 治理以项目为单位

传统文档的问题在于管理粒度太细——每篇文章是独立的，互不关联。AIOps 以**项目**为治理单位，并在项目下细分**产品**和**微服务**。项目级文档描述迭代和共同约束，产品级文档描述产品版本和能力边界，微服务级文档描述单个代码服务的接口、模型、流程和验证入口。

### 两份文档，两类读者

Agent 和人读文档的方式不同。Agent 需要结构稳定、路径固定、事实直接；人需要连续叙事和背景解释。因此每个项目有两层文档：

- **Canonical 层**（权威知识层）：`prd/`、`architecture/`、`specs/`、`adr/`、`workflows/`。这是事实来源，agent 从这里召回信息。
- **Reading 层**（阅读层）：`guides/`。从 canonical 层关联生成，给人看。

两层不互相替代。canonical 层不需要"好读"，但必须准确、可召回。reading 层不需要穷尽所有细节，但必须让人理解项目现状。

### Hook 做记录，Agent 做判断

代码变更时，平台 Hook 自动在文档仓库 `.aiops/diff-records/pending.md` 里追加 agent 事件摘要。Hook 不直接改文档——它只负责记录发生了什么；判断影响面、决定更新哪些文档、实际修改内容，这些由维护 agent 完成。

### 治理等级控制自动化程度

不同团队对文档治理的强度需求不同。AIOps 用四个等级控制自动化程度：`low`（只记录）、`medium`（温和提醒）、`high`（异步维护，默认）、`xhigh`（同步维护）。大多数项目用 `high` 就够了。

## 进一步阅读

- [快速上手](./quick-start.md) — 从零开始，五分钟完成安装和初始化
- [核心理念](./overview.md) — 为什么这样设计，解决了什么问题
- [治理模型](./governance-model.md) — 治理等级、Hook 机制、文档粒度、工具链协同
- [项目、产品、微服务三级结构](./branch-bound-structure.md) — 文档落点和上下游关系写法
- [迭代绑定](./iteration-bindings.md) — 项目迭代、产品版本和微服务主分支如何绑定
- [技能说明](./skills.md) — 每个技能的触发条件、执行步骤和完成标准
- [CLI 命令参考](./cli-reference.md) — 所有命令和选项的完整说明
