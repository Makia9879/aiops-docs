---
home: true
title: AIOps Docs
heroText: AIOps 知识治理
tagline: 让 AI coding agent 真正理解你的项目
actions:
  - text: 了解核心理念
    link: /knowledge/overview.html
    type: primary
  - text: 查看知识库
    link: /knowledge/
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

## 这个仓库解决什么问题

越来越多的团队开始在日常开发中使用 Claude Code、Codex 等 AI coding agent。但一个反复出现的问题是：**agent 对你的项目缺乏了解**。

它不知道模块之间的依赖关系，不知道某个接口为什么这样设计，不知道三周前的架构决策是什么。每次让它干活，你都要从头解释上下文。

传统的做法是写文档。但问题是：

- 人写的文档 agent 读了也不一定理解——结构随意、关键信息埋在大段描述里
- 文档写完之后很少更新，很快就和代码脱节
- 没有机制让文档的变更和代码变更联动

**AIOps 知识治理做的事很简单：在你的项目里建立一套 agent 能真正使用和维护的知识结构。** 它不是一个文档模板库，而是一个从初始化、生成、维护到审查的完整工作机制。

## 怎么做到

### 1. 项目级治理，不是文章级

不以单篇文档为管理单位，以整个项目为治理对象。一个项目包含 PRD、架构、规格、决策记录、工作流五类知识，以及多个子产品域。它们之间的关联和一致性才是治理的核心。

### 2. 两层文档模型

- **Canonical 层**（`.aiops/projects/<project>/`）：事实来源，面向 agent 召回和维护。结构固定、路径稳定、内容直接。
- **Reading 层**（`guides/`）：面向人阅读的连续叙事，从 canonical 层自动关联生成。

### 3. Hook 驱动的持续维护

不是"想起来的时候改一下文档"。代码变更通过 Hook 自动记录到 pending 记录中，agent 根据 pending 的语义判断影响面，更新所有相关文档。

## 四个核心场景

点击上方"了解核心理念"开始阅读，或者直接跳转到你关心的场景：

- [历史项目入库](./knowledge/historical-project-documentation.md) — 已有的老项目，代码和文档都有，怎么整理
- [文档召回辅助研发](./knowledge/development-context-recall.md) — 开发、调试、评审前怎么让 agent 先用项目知识
- [日常文档维护](./knowledge/document-maintenance.md) — 项目在持续开发，怎么让文档跟着走
- [新项目初始化](./knowledge/new-project-initialization.md) — 新启动的项目，从一开始就建好结构

## 怎么开始

在你的项目根目录执行：

```bash
npx -y @makia9879/aiops setup --yes --project my-project
```

这一行命令会安装全部治理技能，并在项目下创建 `.aiops/` 知识治理目录。之后你的 AI agent 就具备了知识治理能力，可以开始梳理和维护项目知识。
