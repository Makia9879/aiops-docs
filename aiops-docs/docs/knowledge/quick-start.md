# 快速上手

这篇文章介绍 AIOps 知识治理的安装和初始化，以及四个场景分别怎么使用。整个过程大约五分钟。

## 前提条件

- 开发机器上有 **Node.js ≥ 18**（运行 CLI 用）
- 安装了 **Docker**（启动文档站点用，可选）
- 在使用 **Claude Code** 或 **Codex** 作为 AI coding agent

## 第一步：安装 CLI

选择下面两种方式之一：

### 方式一：全局安装（推荐）

```bash
npm install -g @makia9879/aiops
```

安装后 `aiops` 命令全局可用，后续无需每次下载。

### 方式二：npx 直接运行

```bash
npx -y @makia9879/aiops setup --yes --project my-project
```

`npx` 会自动下载并执行，结束后不保留全局命令。适合一次性试用。

## 第二步：初始化项目

在项目根目录执行：

```bash
# 全局安装后
aiops setup --yes --project my-project

# 或通过 npx
npx -y @makia9879/aiops setup --yes --project my-project
```

这一行命令做了三件事：

1. 把 7 个治理技能安装到 agent 的运行时目录（`~/.agents/skills/` 和 `~/.codex/skills/`）
2. 检查本地工具链并在 `--yes` 下自动补齐缺失项
3. 在当前目录创建 `.aiops/` 知识治理结构

完成后输出示例：

```
Skills source: /path/to/skills
Skills targets: ~/.agents/skills, ~/.codex/skills
Skills installed: 7
Toolchain check: 0/3 ready
Tools installed: 3
Workspace: /path/to/project
AIOps root: /path/to/project/.aiops
Project: my-project
Created: 32
Updated: 0
Skipped existing: 0
```

### 仅安装技能

更新技能到 agent 运行时目录，不创建项目结构：

```bash
aiops install
```

### 仅初始化工作空间

已有技能在运行时目录，只创建 `.aiops/` 结构：

```bash
aiops init --yes --project my-app
```

### 交互式配置

不加 `--yes` 可进入问答模式按需定制：

```bash
aiops setup
```

CLI 会引导完成项目名称、产品域、治理等级、文档语言等配置。

## 第三步：生成的结构

初始化后，项目目录下会新增 `.aiops/`：

```text
project/
├── .aiops/
│   ├── governance.yaml          # 治理配置
│   ├── hooks/                   # Agent Hook 脚本
│   ├── projects/my-project/
│   │   ├── project.yaml         # 项目元信息、产品注册表、文档路径
│   │   ├── iteration-bindings.yaml # 项目迭代、产品版本、微服务主分支绑定
│   │   ├── README.md            # 知识库导航
│   │   ├── commit-analysis.md   # 已分析提交游标
│   │   ├── open-questions.md    # 待确认问题
│   │   ├── iterations/          # 项目迭代文档
│   │   ├── products/            # 产品与微服务文档
│   │   └── guides/              # 开发指南站点
├── .claude/settings.json        # Claude Code Hook 配置
└── .codex/hooks.json            # Codex Hook 配置
```

目录结构已就绪，内容需要 AI agent 填充。下一步根据项目情况选择场景。

## 第四步：按场景使用

初始化完成后，根据项目情况选择对应的场景。四个场景共享同一套知识结构，不管从哪个入口进入，产出的文档都能被其他场景复用。

### 场景一：历史项目入库

**适用于**：已有大量代码但文档缺失或陈旧的项目。

在 Claude Code 或 Codex 中对 agent 说：

> 帮我整理 my-project 的项目知识库，从代码和已有文档中提取项目结构、架构、核心流程和关键决策。

Agent 会执行 `aiops-historical-project-intake` 技能，扫描源码、配置、测试、已有文档、Git 历史和图谱，逆向生成人类阅读层。第一轮只建立人和 agent 进入项目所需的最低知识闭环——业务边界、模块职责、核心流程、源码和图谱入口。不确定的内容会标为"待确认"放入 `open-questions.md`。

**关键原则**：
- 先建骨架，再填内容——第一轮不用追求齐全
- 区分"已确认"和"推测"——能从源码验证的才算事实
- 产出接入后续维护流程——之后每次主分支 push 都能触发提交分析

### 场景二：文档召回辅助研发

**适用于**：日常开发、调试、评审、解释和写测试时，需要 agent 先理解项目约束。

在开始编码任务之前对 agent 说：

> 先召回文档辅助研发

Agent 会执行 `aiops-dev-context-recall` 技能，按顺序读取：
1. `project.yaml` — 项目身份和产品注册表
2. `iteration-bindings.yaml` — 当前迭代、产品版本、微服务主分支
3. 相关阅读文档 — overview、architecture、workflows、ADR
4. `open-questions.md` — 不确定的约束
5. 回到源码、测试、配置、CodeGraph 和 Understand Anything 核验证据

然后带着项目约束辅助编码、调试、评审或补测试。

**日常使用节奏**：
1. 开发前对 agent 说："先召回文档辅助研发"
2. Agent 带着项目约束辅助开发
3. 正常写代码
4. 创建 commit 并执行 `git push`
5. push hook 启动 Claude Code 分析未分析提交并更新阅读层

### 场景三：日常文档维护

**适用于**：项目在持续开发中，需要文档跟着代码一起演进。

维护由 `git push` 自动触发，也可以主动要求 agent 分析提交。对 agent 说：

> 分析未处理的提交并更新文档

Agent 会执行 `aiops-daily-doc-maintenance` 技能：
1. 读取 `commit-analysis.md`，找到上次已分析提交
2. 读取主分支或绑定服务主分支上的未分析 commits
3. 按时间顺序逐个分析 commit diff
4. 理解变更对业务、架构、流程或 ADR 的影响
5. 读取 `iteration-bindings.yaml`，确认当前项目迭代和微服务主分支
6. 执行分支预检——源码分支与绑定分支不一致时不推进游标
7. 跨文档同步更新——改一处，关联文档一起更新
8. 每处理完一个 commit，记录 commit hash 和 commit time

**治理等级决定 push hook 自动化程度**（默认为 `high`）：

| 等级 | 行为 |
|------|------|
| `low` | 只提示未分析提交，不自动维护 |
| `medium` | 启动维护，但提交文档前询问 |
| `high` | push hook 自动维护并可提交文档 |
| `xhigh` | 维护失败时可阻断 push |

### 场景四：新项目初始化

**适用于**：刚启动或早期的项目，在代码变复杂之前建立知识骨架。

对 agent 说：

> 根据 PRD 和讨论，初始化 my-project 的知识库。

Agent 会执行 `aiops-new-project-briefing` 技能，从需求输入建立知识骨架。不确定的内容标注可信度——`Confirmed`（已确认）、`Assumption`（推测）、`Unknown`（待定），放入 `open-questions.md`。

**关键原则**：
- 不等"设计定下来再写"——把确定的写进去，不确定的标出来
- 骨架比内容重要——结构对了，填内容是水到渠成的事
- 面向阅读层写作——路径稳定、业务清楚、源码和图谱入口具体

## 第五步：后续日常使用

初始化只做一次。日常使用中，推荐的工作节奏是：

1. 研发、调试、评审前，对 agent 说：**"先召回文档辅助研发"**
2. 正常写代码，AI agent 带着项目约束辅助开发
3. 创建 commit 并执行 `git push`
4. push hook 启动 Claude Code，按未分析提交维护阅读层
5. 定期触发审查：**"审查一下知识库"** — agent 会检查完整性、一致性和可用性

## 启动文档站点（可选）

初始化时为每个项目生成了一个 VuePress 文档站点，可供团队成员浏览：

```bash
cd .aiops/projects/my-project/guides
docker compose up
```

浏览器打开 `http://localhost:8080`，即可查看项目知识站点。

## 常用操作速查

| 想做什么 | 命令或操作 |
|---------|-----------|
| 第一次安装（独立 CLI） | `npm install -g @makia9879/aiops && aiops setup --yes --project <name>` |
| 第一次安装（npx） | `npx -y @makia9879/aiops setup --yes --project <name>` |
| 只更新技能 | `aiops install` |
| 在新的子目录里也给已有项目初始化 | `aiops init --yes --project <name>` |
| 交互式配置（手动回答） | `aiops setup`（去掉 `--yes`） |
| 指定多个产品 | `aiops setup --yes --project <name> --products CA,RA,KMC,OCSP` |
| 配置迭代绑定 | `aiops config-ui --project <name>` |
| 跳过工具链安装 | `aiops setup --yes --with none --project <name>` |
| 降低治理等级 | `aiops setup --yes --project <name> --level medium` |
| 源码仓库链接到独立文档仓库 | `aiops link-docs --docs-repo ../aiops-docs` |
| 让 agent 整理知识库 | "帮我整理项目知识库" |
| 让 agent 先召回文档再研发 | "先召回文档辅助研发" |
| 让 agent 检查并更新文档 | "检查一下知识库是否需要更新" |
| 让 agent 审查知识库质量 | "审查一下知识库" |

详细命令参数见 [CLI 命令参考](./cli-reference.md)，每个技能的能力和边界见[技能说明](./skills.md)。三级结构见[项目、产品、微服务三级结构](./branch-bound-structure.md)，维护前预检见[迭代绑定](./iteration-bindings.md)。
