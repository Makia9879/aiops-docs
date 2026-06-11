# 开发指南

本文档面向参与 aiops-docs 仓库开发的贡献者。

## 仓库结构

```
aiops-docs/
├── skills/                              # AIOps 治理技能（7 个）
│   ├── aiops-daily-doc-maintenance/
│   ├── aiops-dev-context-recall/
│   ├── aiops-governance-bootstrap/
│   ├── aiops-historical-project-intake/
│   ├── aiops-knowledge-lifecycle/
│   ├── aiops-knowledge-review/
│   └── aiops-new-project-briefing/
├── packages/aiops-governance-cli/       # CLI 工具源码（TypeScript）
│   ├── src/
│   │   ├── cli.ts                       # CLI 入口
│   │   ├── args.ts                      # 参数解析
│   │   ├── install.ts                   # 技能安装逻辑
│   │   ├── workspace.ts                 # 工作空间初始化
│   │   ├── questions.ts                 # 引导问题模型
│   │   ├── tui.ts                       # 交互式 TUI
│   │   ├── templates.ts                 # 文件模板
│   │   ├── hooks/                       # Hook 脚本模板
│   │   ├── platforms/                   # 平台配置（Claude Code / Codex）
│   │   └── toolchain/                   # 工具链安装
│   └── scripts/                         # 发布脚本
├── aiops-docs/                          # VuePress 文档站点
│   ├── docs/
│   │   ├── knowledge/                   # 知识库文章
│   │   └── .vuepress/config.ts          # 站点配置
│   └── docker-compose.yaml
├── docs/                                # 项目级规格文档
│   ├── spec-aiops-governance-skills.md  # 治理技能执行规格
│   └── adr/                             # 架构决策记录
├── scripts/                             # 构建与镜像脚本
├── CONTEXT.md                           # 术语表
└── AGENTS.md                            # Agent 协作指南
```

## 开发约定

### 运行环境

- **禁止在宿主机运行 `npm` / `npx` / `node` / `python`**。所有 Node 和 Python 命令必须通过临时 Docker 容器执行。
- 文档格式：Markdown，文件名使用 kebab-case（如 `historical-project-documentation.md`）
- TypeScript 配置：2 空格缩进，双引号
- 技能结构：`skills/<skill-name>/SKILL.md`
- 架构决策先写 ADR，实现以 ADR 为准；若 spec 与 ADR 冲突，以 ADR 为准

### 构建与验证

```bash
# CLI 开发（Docker 内）
docker run --rm -it \
  -v "$PWD":/repo \
  -w /repo/packages/aiops-governance-cli \
  node:24-bookworm \
  bash -lc "npm ci && npm run build"

# 带参数运行 CLI
docker run --rm -it \
  -v "$PWD":/repo \
  -w /repo/packages/aiops-governance-cli \
  node:24-bookworm \
  bash -lc "npm ci && npm run build && node dist/cli.js setup --yes --with none --project demo"

# 使用自定义技能源验证
docker run --rm -it \
  -v "$PWD":/repo \
  -w /repo/packages/aiops-governance-cli \
  node:24-bookworm \
  bash -lc "npm ci && npm run build && node dist/cli.js install --skills-source /repo/skills --skills-target /tmp/aiops-skills"

# VuePress 站点构建
docker run --rm -it \
  -v "$PWD":/repo \
  -w /repo/aiops-docs \
  node:24-bookworm \
  bash -lc "npm ci && npm run build"

# 启动 VuePress 开发服务器
cd aiops-docs && docker compose up
```

### 发布 CLI

```bash
# 预发布校验
NPM_TOKEN=<token> DRY_RUN=true scripts/publish-aiops-npm.sh

# 正式发布
NPM_TOKEN=<token> DRY_RUN=false scripts/publish-aiops-npm.sh
```

发布脚本在 `node:24-bookworm` 容器内运行，自动完成版本校验、技能打包、类型检查、`npm pack --dry-run` 和 `npm publish --access public`。

## CLI 架构

### 命令流程

```
aiops
├── install
│   ├── installSkills()       # 复制 7 个技能到 ~/.agents/skills, ~/.codex/skills
│   └── installToolchain()    # 安装辅助 npm 工具包到 ~/.aiops/tools
├── init
│   ├── discoverWorkspaceRoot()   # 发现或确认 .aiops/ 根目录
│   ├── inferProjectId()          # 从 package.json 或目录名推断项目 ID
│   ├── promptForAnswers()        # TUI 交互问答（--yes 跳过）
│   └── initializeWorkspace()     # 幂等生成目录、模板文件、Hook、平台配置
├── config-ui                   # 启动本地页面配置迭代绑定
├── link-docs                   # 源码仓库链接到独立文档仓库
└── setup = install + init
```

### 核心模块

| 模块 | 文件 | 职责 |
|-----|------|------|
| CLI 入口 | `src/cli.ts` | 命令路由、参数分发 |
| 参数解析 | `src/args.ts` | 命令行参数解析为 `ParsedArgs` |
| 技能安装 | `src/install.ts` | 技能源发现、技能目录对比（SHA256）、幂等复制 |
| 工作空间 | `src/workspace.ts` | `.aiops/` 目录创建、模板渲染、平台 Hook 配置追加 |
| 引导问答 | `src/questions.ts` | 项目 ID、产品域、治理等级、语言的数据模型和校验 |
| 交互 TUI | `src/tui.ts` | 基于 Node readline 的交互式问答 |
| 文件模板 | `src/templates.ts` | 所有生成文件的模板字符串 |
| 工具链 | `src/toolchain/` | npm 包安装、版本管理、shim 创建 |
| 平台适配 | `src/platforms/` | Claude Code 和 Codex 的 Hook 配置追加逻辑 |
| Hook 模板 | `src/hooks/` | Python Hook 脚本模板 |

### 模板系统

`init` 命令生成的所有文件内容由 `src/templates.ts` 集中管理，模板函数接收 `BootstrapAnswers` 参数：

```typescript
interface BootstrapAnswers {
  projectId: string;
  productDomains: string[];
  governanceLevel: GovernanceLevel;  // "low" | "medium" | "high" | "xhigh"
  knowledgeLanguage: string;          // "zh-CN" | "en"
}
```

## 架构决策记录

| ADR | 决策 | 影响 |
|-----|------|------|
| [0001](./docs/adr/0001-routed-aiops-knowledge-skills.md) | 按场景路由拆分技能（而非按处理阶段） | 技能职责边界清晰，用户按场景调用 |
| [0002](./docs/adr/0002-version-skill-source-in-repo.md) | 技能源随仓库版本管理 | 技能与 CLI 版本一致，避免兼容问题 |
| [0003](./docs/adr/0003-project-level-knowledge-governance.md) | 以项目为治理单元（而非文档） | 跨产品域共享治理配置，一个项目一个知识库 |

## 相关文档

- [README.md](./README.md) — 用户视角的使用说明
- [AGENTS.md](./AGENTS.md) — Agent 协作指南
- [CONTEXT.md](./CONTEXT.md) — 术语表与运行上下文
- [spec-aiops-governance-skills.md](./docs/spec-aiops-governance-skills.md) — 技能执行规格
