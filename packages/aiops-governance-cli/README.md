# AIOps Governance CLI

AIOps 知识治理命令行工具 — 为 AI 辅助开发的工程团队提供标准化的知识管理基础设施。

Executable workspace bootstrap for AIOps knowledge governance — standardized knowledge management infrastructure for AI-assisted engineering teams.

## 仓库内容 / What's Inside

本仓库是 `@makia9879/aiops` npm 包的源码，提供以下核心能力：

- **技能安装 (`install`)** — 将 6 个 AIOps 治理技能安装到 AI Agent 运行时目录（Claude Code、Codex 等），让 AI 助手获得知识管理领域能力。
- **工作空间初始化 (`init`)** — 在项目根目录创建 `.aiops/` 知识治理结构，包括项目骨架、治理配置、开发指南、知识文档模板、平台 Hook 配置等。
- **工具链安装** — 自动安装固定版本的辅助工具包（CodeGraph、Understand Anything、Trellis），并为可执行 CLI 工具创建 shim。

### 内置技能 / Bundled Skills

| 技能名称 | 功能描述 |
|---------|---------|
| `aiops-daily-doc-maintenance` | 日常文档维护 |
| `aiops-governance-bootstrap` | 治理引导初始化 |
| `aiops-historical-project-intake` | 历史项目知识入库 |
| `aiops-knowledge-lifecycle` | 知识生命周期管理 |
| `aiops-knowledge-review` | 知识审查 |
| `aiops-new-project-briefing` | 新项目知识简报 |

### 工作空间结构 / Workspace Structure

```
.aiops/
├── governance.yaml          # 治理配置
├── hooks/                   # 工作空间 Hook 脚本
├── projects/<project-id>/   # 项目知识目录
│   ├── project.yaml         # 项目配置
│   ├── README.md            # 项目知识索引
│   ├── open-questions.md    # 待解决问题
│   ├── prd/                 # 产品需求文档
│   ├── architecture/        # 架构文档
│   ├── specs/               # 技术规格
│   ├── adr/                 # 架构决策记录
│   ├── workflows/           # 工作流文档
│   └── guides/              # VuePress 开发指南
├── local/                   # 本地配置
├── cache/                   # 缓存
├── tmp/                     # 临时文件
└── diff-records/            # 差异记录
```

## 安装方法 / Installation

### 通过 npx 直接运行（推荐）

无需安装，直接运行：

```bash
npx -y @makia9879/aiops <command> [options]
```

### 全局安装

```bash
npm install -g @makia9879/aiops
```

安装后可直接使用 `aiops-governance` 命令：

```bash
aiops-governance setup --yes --project my-project
```

### Docker 开发环境

在仓库内开发验证时，使用 Docker 避免依赖宿主机 Node 环境：

```bash
# 完整流程
docker run --rm -it \
  -v "$PWD":/repo \
  -w /repo/packages/aiops-governance-cli \
  node:24-bookworm \
  bash -lc "npm ci && npm run build && node dist/cli.js setup --yes --with none --project cert-auth --products CA,RA,KMC,OCSP"

# 使用自定义技能源验证
docker run --rm -it \
  -v "$PWD":/repo \
  -w /repo/packages/aiops-governance-cli \
  node:24-bookworm \
  bash -lc "npm ci && npm run build && node dist/cli.js install --skills-source /repo/skills --skills-target /tmp/aiops-skills"
```

## 使用方法 / Usage

### 命令概览

```bash
aiops-governance <command> [options]
```

| 命令 | 说明 |
|-----|------|
| `install` | 安装 AIOps 技能到 Agent 运行时目录 |
| `init`   | 初始化当前工作空间的 AIOps 治理结构 |
| `setup`  | 依次执行 `install` + `init`（一步到位） |

### 快速开始

在新项目中一步完成初始化：

```bash
npx -y @makia9879/aiops setup --yes --project my-app --products core
```

使用交互式问答模式（不加 `--yes`）：

```bash
npx -y @makia9879/aiops setup --project my-app
```

### 仅安装技能

```bash
# 安装全部技能 + 默认工具链
npx -y @makia9879/aiops install

# 只安装技能，跳过工具链
npx -y @makia9879/aiops install --with none

# 选择性安装工具
npx -y @makia9879/aiops install --with codegraph,trellis

# 指定技能源和目标目录
npx -y @makia9879/aiops install \
  --skills-source /path/to/skills \
  --skills-target /custom/skills/dir
```

### 仅初始化工作空间

```bash
npx -y @makia9879/aiops init --yes --project my-app --products CA,RA --level high --language zh-CN
```

### 选项说明

| 选项 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `-y, --yes` | flag | `false` | 跳过交互式问答，使用默认值或命令行参数 |
| `--project <id>` | string | 自动推断 | 项目标识，存储在 `.aiops/projects/<id>/` |
| `--products <list>` | string | `core` | 产品域列表，逗号分隔，如 `CA,RA,KMC,OCSP` |
| `--level <level>` | string | `high` | 治理等级：`low` / `medium` / `high` / `xhigh` |
| `--language <lang>` | string | `zh-CN` | 知识文档语言，默认简体中文 |
| `--skills-source <path>` | string | 自动发现 | 覆盖技能源目录 |
| `--skills-target <path>` | string | `~/.agents/skills` 和 `~/.codex/skills` | 覆盖运行时技能目录 |
| `--with <tools>` | string | `default` | 工具链选择：`default` / `none` / 逗号分隔列表 |
| `--tools-root <path>` | string | `~/.aiops/tools` | 工具安装根目录 |

### 工具链说明

默认安装以下工具包到 `~/.aiops/tools`，带有 CLI bin 的包会在 `~/.aiops/bin` 创建 shim：

- `@colbymchenry/codegraph@0.9.9`
- `@understand-anything/skill@2.7.6`
- `@mindfoldhq/trellis@0.5.19`

## 发布 / Publish

当前版本：`0.1.0`，发布标签：`v0.1.0`。

```bash
# 预发布校验
NPM_TOKEN=<token> DRY_RUN=true scripts/publish-aiops-npm.sh

# 正式发布
NPM_TOKEN=<token> DRY_RUN=false scripts/publish-aiops-npm.sh
```

发布脚本全程在 `node:24-bookworm` 容器内运行，自动完成版本校验、技能打包、类型检查、`npm pack --dry-run` 和 `npm publish --access public`。
