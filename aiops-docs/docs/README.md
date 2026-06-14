---
home: true
title: AIOps Docs
heroText: AIOps 知识治理
tagline: 让 AI coding agent 真正理解项目
actions:
  - text: 项目概述
    link: /knowledge/
    type: primary
  - text: 快速上手
    link: /knowledge/quick-start.html
    type: secondary
features:
  - title: 历史项目入库
    details: 已有项目代码和文档杂乱？从源码、配置、测试逆向梳理出可维护的知识结构，让 agent 理解项目边界和业务链路。
  - title: 文档召回辅助研发
    details: 开发、调试、评审前先召回项目迭代、产品、微服务文档和源码证据，让 agent 带着约束改代码。
  - title: 日常文档维护
    details: 文档写完就过时？通过 Hook 自动记录代码变更，agent 根据影响面跨文档同步更新，保持知识库和代码一致。
  - title: 新项目初始化
    details: 新项目从第一天就建立知识治理骨架，PRD、架构、决策记录各有落点，不给后面的维护留坑。
---

## 这个项目解决什么问题

越来越多的团队开始在日常开发中使用 Claude Code、Codex 等 AI coding agent。但一个反复出现的问题是：**agent 对项目缺乏了解**。

模块之间的依赖关系、某个接口的设计原因、三周前的架构决策——agent 拿不到这些上下文。每次任务都需要从头解释。

传统的做法是写文档。但存在几个问题：

- 人写的文档 agent 读了也不一定理解——结构随意、关键信息埋在大段描述里
- 文档写完之后很少更新，很快就和代码脱节
- 没有机制让文档的变更和代码变更联动

**AIOps 知识治理做的事：在项目里建立一套 agent 能真正使用和维护的知识结构。** 它是一个从初始化、生成、维护到审查的完整工作机制。

## 四个场景 · 三个工具 · 七个技能 · 三个 Hook

AIOps 知识治理围绕 **4 个场景** 组织，由 **7 个技能** 执行，通过 **3 个 Hook** 连接代码活动，辅以 **3 个工具** 增强代码理解能力。

| | 包含 | 说明 |
|---|---|---|
| **场景** | 历史入库、召回研发、日常维护、新项目初始化 | 共享同一套 `.aiops/` 知识结构 |
| **工具** | CodeGraph、Understand Anything、Trellis | CLI 自动检查并补齐 |
| **技能** | lifecycle（总调度）+ 6 个子技能 | 按场景路由，无需手动选择 |
| **Hook** | inject_context、record_diff、trigger_maintenance | 只记录和触发，不改文档 |

## 怎么做到

### 1. 项目级治理

以整个项目为治理单位，不以单篇文档为管理对象。一个项目包含 PRD、架构、规格、决策记录、工作流五类知识，以及多个子产品域。跨文档的关联和一致性是治理的核心。

### 2. 两层文档模型

- **Canonical 层**（`.aiops/projects/<project>/`）：事实来源，面向 agent 召回和维护。结构固定、路径稳定、内容直接。
- **Reading 层**（`guides/`）：面向人阅读的连续叙事，从 canonical 层自动关联生成。

### 3. Hook 驱动的持续维护

代码变更通过 Hook 自动记录到 pending 记录中，agent 根据 pending 的语义判断影响面，更新所有相关文档。维护是自动触发的系统行为，不依赖人工记得。

## 怎么开始

```bash
# 全局安装 CLI
npm install -g @makia9879/aiops

# 在项目根目录初始化
aiops setup --yes --project my-project
```

这一行命令会安装全部 7 个治理技能和 3 个辅助工具，并在项目下创建 `.aiops/` 知识治理目录。之后 AI agent 就具备了知识治理能力。

也可以不全局安装，直接通过 npx 运行：

```bash
npx -y @makia9879/aiops setup --yes --project my-project
```

卸载运行时技能和 CLI 管理的辅助工具链：

```bash
aiops uninstall
# 最后一行会回显：npm uninstall -g @makia9879/aiops
```

## 了解更多

- [项目概述](./knowledge/) — 四个场景、三个工具、七个技能、三个 Hook 的完整介绍
- [快速上手](./knowledge/quick-start.html) — 从零开始，按场景使用
- [核心理念](./knowledge/overview.html) — 设计思路和解决的问题
- [治理模型](./knowledge/governance-model.html) — 治理等级、Hook 机制、工具链协同
