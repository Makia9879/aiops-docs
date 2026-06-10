# AIOps Docs

为 AI 辅助开发的工程团队提供开箱即用的项目知识治理能力。

## 这是什么？

当你的团队使用 Claude Code、Codex 等 AI coding agent 进行日常开发时，一个常见的问题是：**Agent 不了解你的项目**。它不知道你的 PRD 写了什么、架构如何设计、有哪些历史决策、术语表在哪。

AIOps Docs 解决的就是这个问题 — 它通过一行命令在你的项目中建立一套标准化的**知识治理基础设施**，让 coding agent 能够：

- 在开发前自动加载项目背景、架构和术语
- 在代码变更后记录影响范围，提醒维护相关文档
- 在例行维护中检查跨文档一致性
- 在接手历史项目时从代码逆向生成知识库

一句话：**让 AI 真正理解你的项目，而不是每次都从零开始。**

## 5 分钟上手

在你的项目根目录执行：

```bash
npx -y @makia9879/aiops setup --yes --project my-project
```

这条命令会完成两件事：

1. **安装技能** — 将 6 个 AIOps 治理技能部署到 Agent 运行时目录
2. **初始化工作空间** — 在项目下创建 `.aiops/` 目录，生成知识管理所需的全部结构

之后，你的 AI coding agent 就具备了项目知识治理能力。

### 交互式初始化

不加 `--yes` 可以使用问答模式，按需定制：

```bash
npx -y @makia9879/aiops setup
```

CLI 会引导你完成项目名称、产品域、治理等级、文档语言等配置。

## 初始化后你会得到什么？

```
你的项目/
├── .aiops/
│   ├── governance.yaml          # 治理配置（等级、语言、产品域）
│   ├── hooks/                   # Agent Hook（注入上下文、记录变更、触发维护）
│   ├── projects/my-project/     # 项目知识库
│   │   ├── project.yaml         # 项目元信息
│   │   ├── README.md            # 知识库索引
│   │   ├── open-questions.md    # 待解决问题
│   │   ├── prd/                 # 产品需求文档
│   │   ├── architecture/        # 架构文档
│   │   ├── specs/               # 技术规格
│   │   ├── adr/                 # 架构决策记录
│   │   ├── workflows/           # 工作流文档
│   │   └── guides/              # 人类可读的开发指南站点（VuePress）
│   └── diff-records/            # Hook 事件记录（维护任务消费）
└── .claude/settings.json        # Claude Code Hook 配置（自动追加）
```

### 治理能力一览

| 场景 | 对应技能 | 触发方式 |
|-----|---------|---------|
| **新项目初始化** | `aiops-new-project-briefing` | 主动调用，从需求/PRD 生成知识库 |
| **历史项目入库** | `aiops-historical-project-intake` | 主动调用，从已有代码逆向生成知识库 |
| **日常文档维护** | `aiops-daily-doc-maintenance` | Hook 记录 pending，Claude Code 或 subagent 维护文档 |
| **知识审查** | `aiops-knowledge-review` | 定期执行，检查完整性和一致性 |

## 命令参考

```bash
# 仅安装技能（不初始化工作空间）
npx -y @makia9879/aiops install

# 仅初始化工作空间（不安装技能）
npx -y @makia9879/aiops init --yes --project my-app

# 跳过工具链，只安装技能 + 初始化
npx -y @makia9879/aiops setup --yes --with none --project my-app

# 指定产品域和语言
npx -y @makia9879/aiops setup --yes --project cert-auth --products CA,RA,KMC,OCSP --language zh-CN

# 指定治理等级（low / medium / high / xhigh）
npx -y @makia9879/aiops setup --yes --project my-app --level high
```

### 常用选项

| 选项 | 说明 | 默认值 |
|-----|------|-------|
| `--yes, -y` | 跳过交互问答，使用默认值 | 关闭 |
| `--project <id>` | 项目标识 | 自动从 `package.json` 推断 |
| `--products <list>` | 产品域，逗号分隔 | `core` |
| `--level <level>` | 治理等级：`low` / `medium` / `high` / `xhigh` | `high` |
| `--language <lang>` | 文档语言 | `zh-CN` |
| `--with <tools>` | 辅助工具链：`default` / `none` / 逗号列表 | `default` |

## 查看文档站点

初始化后，每个项目自带一个可本地预览的开发指南站点：

```bash
cd .aiops/projects/<project>/guides
docker compose up
# 打开 http://localhost:8080
```

站点基于 VuePress，面向人类阅读者，内容从 canonical 知识文档自动关联。

## 环境要求

- **Node.js** ≥ 18（仅用于运行 CLI）
- **Docker**（用于启动文档站点和辅助工具）
- 支持的 AI Agent 平台：**Claude Code**、**Codex**

## 了解更多

- [架构决策记录](./docs/adr/) — 了解设计决策背后的原因
- [CONTEXT.md](./CONTEXT.md) — 术语定义与运行上下文
- [CLI 详细文档](./packages/aiops-governance-cli/README.md) — 开发者视角的 CLI 说明
