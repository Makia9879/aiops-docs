# AIOps Docs

为 AI 辅助开发的工程团队提供开箱即用的项目知识治理能力。

## 这个项目是什么？

当团队使用 Claude Code、Codex 等 AI coding agent 进行日常开发时，一个常见的问题是：**Agent 不了解项目**。它需要先理解业务边界、架构决策和流程语义，再回到源码与调用图谱判断实现细节。

AIOps Docs 解决这个问题 — 通过一行命令在项目中建立一套标准化的**知识治理基础设施**，覆盖人类阅读文档从创建、召回到维护的完整生命周期，并把 agent 的实现事实召回交给源码、CodeGraph 和 Understand Anything。

### 四个场景

AIOps 知识治理按输入来源分成四个核心场景，共享同一套 `.aiops/projects/<project>/` 知识结构：

| 场景 | 说明 | 输入 |
|-----|------|------|
| **历史项目入库** | 照搬 skills-seed 的工作原理，从已有代码、图谱和历史中生成人类阅读层 | 源码、配置、测试、旧文档、Git 历史、图谱 |
| **文档召回辅助研发** | 先读人类阅读层理解业务，再读源码并用 CodeGraph / Understand Anything 召回实现关系 | 研发任务 + 人类阅读文档 + 源码图谱 |
| **日常文档维护** | git push hook 启动 Claude Code，按未分析提交增量总结并更新人类阅读文档 | Git commits + commit-analysis 游标 + 图谱影响面 |
| **新项目初始化** | 通过用户引导初始化人类阅读层，代码出现后循环进入维护场景 | PRD、会议记录、用户回答 |

### 三个工具

CLI 安装时会自动补齐三个辅助工具到 `~/.aiops/tools/`：

| 工具 | 用途 |
|------|------|
| **CodeGraph** | Agent 事实层：代码调用关系、调用方、被调用方和影响范围 |
| **Understand Anything** | Agent 事实层：从源码提炼项目结构、架构层和业务概念 |
| **Trellis** | 任务执行和上下文注入层（辅助，不作为事实源） |

### 七个技能

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

大多数情况无需手动选择技能。对 agent 说"帮我整理项目知识库"或"先召回文档辅助研发"，lifecycle 会自动路由到正确的子技能。

### 三个 Hook

Hook 是连接代码活动和知识维护的桥梁，在 Claude Code 和 Codex 两个平台上实现。Hook 只负责记录和触发，不改文档：

| Hook | 触发时机 | 做什么 |
|------|---------|--------|
| `aiops_inject_context` | 任务开始时 | 注入项目知识库上下文给 agent |
| `aiops_push_maintenance` | `git push` 前 | 启动 Claude Code 分析未分析提交并维护阅读层 |

## 快速上手

### 安装方式一：独立 CLI（推荐）

```bash
# 全局安装
npm install -g @makia9879/aiops

# 在项目根目录执行
aiops setup --yes --project my-project
```

安装后，`aiops` 命令全局可用，无需每次通过 npx 下载。

### 安装方式二：npx（无需预装）

```bash
npx -y @makia9879/aiops setup --yes --project my-project
```

### 安装做了什么

一条命令完成三件事：

1. **安装技能** — 将 7 个 AIOps 治理技能部署到 `~/.agents/skills/` 和 `~/.codex/skills/`
2. **检查工具链** — 汇总 CodeGraph、Understand Anything、Trellis 的版本和缺失项，`--yes` 下自动补齐
3. **初始化工作空间** — 在项目下创建 `.aiops/` 目录，生成知识管理所需的全部结构

### 交互式初始化

不加 `--yes` 可进入问答模式，按需定制：

```bash
aiops setup
```

CLI 会引导完成项目名称、产品域、治理等级、文档语言等配置。

已有多仓库项目可直接把产品仓库交给 CLI。CLI 会为每个仓库生成同名 product/service，自动读取当前 Git 分支写入 `required_branch`，并可把各源码仓库 hook 链接到当前文档库：

```bash
aiops setup --yes --project ca-platform \
  --product-repos ca_admin,ra_admin,kmc_admin,ocsp-responder \
  --link-product-repos
```

### 按场景使用

初始化完成后，根据场景对 agent 说：

| 场景 | 对 agent 说的话 |
|-----|---------------|
| **历史项目入库** | "帮我整理 my-project 的项目知识库，从代码和已有文档中提取项目结构、架构、核心流程和关键决策" |
| **文档召回辅助研发** | "先召回文档辅助研发" — agent 会先读人类阅读层，再回到源码和图谱确认实现事实 |
| **日常文档维护** | `git push` 时自动触发 — Claude Code 根据未分析提交和图谱影响面更新人类阅读层 |
| **新项目初始化** | "根据 PRD 和讨论，初始化 my-project 的知识库" |

## 初始化后生成的结构

```
项目根目录/
├── .aiops/
│   ├── governance.yaml          # 治理配置（等级、语言、产品域）
│   ├── hooks/                   # Agent Hook（注入上下文、记录变更、触发维护）
│   ├── projects/my-project/     # 项目知识库
│   │   ├── project.yaml         # 项目元信息
│   │   ├── iteration-bindings.yaml # 项目迭代、产品版本、微服务主分支绑定
│   │   ├── README.md            # 知识库索引
│   │   ├── open-questions.md    # 待解决问题
│   │   ├── iterations/          # 项目迭代文档
│   │   ├── products/            # 产品和微服务人类阅读文档
│   │   └── guides/              # 人类阅读站点（VuePress）
│   └── projects/my-project/commit-analysis.md # 已分析提交游标
└── .claude/settings.json        # Claude Code Hook 配置（自动追加）
```

## 命令参考

```bash
# 全局安装后直接使用
aiops setup --yes --project my-project

# 或通过 npx
npx -y @makia9879/aiops setup --yes --project my-project

# 仅安装技能（不初始化工作空间）
aiops install

# 卸载运行时技能和 CLI 管理的辅助工具链
aiops uninstall
# 最后一行会回显：npm uninstall -g @makia9879/aiops

# 仅初始化工作空间（不安装技能）
aiops init --yes --project my-app

# 跳过工具链，只安装技能 + 初始化
aiops setup --yes --with none --project my-app

# 检查工具链和 .aiops 文档结构完整性
aiops check --project my-app
# 只检查文档结构
aiops check --with none --project my-app

# 指定产品域和语言
aiops setup --yes --project cert-auth --products CA,RA,KMC,OCSP --language zh-CN

# 指定治理等级（low / medium / high / xhigh）
aiops setup --yes --project my-app --level high

# 配置迭代绑定
aiops config-ui --project my-project

# 源码与文档仓库分离时，在源码仓库建立文档指针
aiops link-docs --docs-repo ../aiops-docs
```

### 常用选项

| 选项 | 说明 | 默认值 |
|-----|------|-------|
| `--yes, -y` | 跳过交互问答，使用默认值 | 关闭 |
| `--project <id>` | 项目标识 | 自动从 `package.json` 推断 |
| `--products <list>` | 产品域，逗号分隔 | `core` |
| `--product-repos <list>` | 产品仓库列表或 `product=path` 映射，自动写 `code_root` 和当前分支 | 关闭 |
| `--link-product-repos` | 初始化后把产品仓库 hook 链接到当前文档库 | 关闭 |
| `--level <level>` | 治理等级：`low` / `medium` / `high` / `xhigh` | `high` |
| `--language <lang>` | 文档语言 | `zh-CN` |
| `--with <tools>` | 辅助工具链：`default` / `none` / 逗号列表 | `default` |

安装命令会先检查本地工具链版本和可执行 shim，汇总已就绪、缺失或版本不符的工具。交互式安装会询问是否自动补齐；带 `--yes` 时自动补齐；`--with none` 跳过工具链检查和安装。`aiops check` 是只读检查命令，会汇总工具链状态和 `.aiops/` 项目文档骨架完整性。

## 查看文档站点

初始化后，每个项目自带一个可本地预览的开发指南站点：

```bash
cd .aiops/projects/<project>/guides
docker compose up
# 打开 http://localhost:8080
```

站点基于 VuePress，面向人类阅读者，内容来自 `.aiops/projects/<project>/` 的人类阅读层。实现细节以源码、CodeGraph 和 Understand Anything 为准。

## 环境要求

- **Node.js** ≥ 18（用于运行 CLI）
- **Docker**（用于启动文档站点和辅助工具）
- 支持的 AI Agent 平台：**Claude Code**、**Codex**

## 了解更多

- [在线文档](https://github.com/makia9879/aiops-docs) — 完整的概念、场景和参考资料
- [架构决策记录](./docs/adr/) — 了解设计决策背后的原因
- [CONTEXT.md](./CONTEXT.md) — 术语定义与运行上下文
- [开发指南](./DEVELOP.md) — 贡献者视角的开发说明
- [CLI 详细文档](./packages/aiops-governance-cli/README.md) — 开发者视角的 CLI 说明
