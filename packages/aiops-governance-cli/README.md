# AIOps Governance CLI

AIOps 知识治理命令行工具，为 AI 辅助开发的工程团队提供标准化的项目知识治理基础设施。

## 核心能力

- `install`: 安装 AIOps 治理技能到 agent 运行时目录。
- `init`: 初始化 `.aiops/`，生成项目、产品、微服务三级知识骨架。
- `setup`: 顺序执行 `install` 和 `init`。
- `config-ui`: 启动本地浏览器页面，维护项目迭代、产品版本、微服务代码根和微服务主分支绑定。
- `link-docs`: 在源码仓库写入本机文档仓库指针，并安装 Codex/Claude Code hook 配置。

安装后的技能包含 `aiops-dev-context-recall`，用于在研发、调试、评审、解释和测试前召回 canonical docs，把项目迭代、产品、微服务、PRD、架构、规格、ADR、流程和开放问题作为 coding agent 的上下文。

## 工作空间结构

```text
.aiops/
  governance.yaml
  hooks/
  diff-records/
    pending.md
    archived/
  projects/
    <project>/
      project.yaml
      iteration-bindings.yaml
      README.md
      open-questions.md
      iterations/<project-iteration>/
      products/<product>/
        product.yaml
        prd/
        architecture/
        specs/
        workflows/
        adr/
        services/<service>/
          service.yaml
          architecture/
          specs/
          workflows/
          adr/
      guides/
  local/
  cache/
  tmp/
```

`project.yaml` 记录稳定项目和产品/服务注册表。`iteration-bindings.yaml` 记录：

```text
项目迭代 -> 产品版本 -> 微服务主分支
```

维护 canonical docs 前，agent 必须读取迭代绑定，并检查服务 `code_root` 当前分支是否等于 `required_branch`。

研发任务开始前，agent 可以通过 `aiops-dev-context-recall` 按项目迭代、产品、微服务顺序召回 canonical docs，再回到源码证据核验当前行为。

## 使用

```bash
aiops-governance <command> [options]
```

| 命令 | 说明 |
| --- | --- |
| `install` | 安装 AIOps 技能到 agent 运行时目录 |
| `init` | 初始化当前工作空间的 AIOps 治理结构 |
| `setup` | 依次执行 `install` + `init` |
| `config-ui` | 启动本地配置 UI |
| `link-docs` | 将源码仓库 hook 连接到独立 AIOps 文档仓库 |

### init

```bash
aiops-governance init --yes --project cert-system --products ca,kmc --services ca:ca-admin,kmc:kmc-admin
```

可选绑定默认值：

```bash
aiops-governance init --yes \
  --project cert-system \
  --products ca \
  --services ca:ca-admin \
  --iteration develop_1.0.0 \
  --docs-branch develop_1.0.0 \
  --service-branch develop_1.0.0 \
  --code-root /Users/makia98/lij/work/CA/ca_admin
```

### config-ui

```bash
aiops-governance config-ui --project cert-system
```

选项：

```text
--project <id>       指定项目 id
--host <host>        默认 127.0.0.1
--port <port>        默认自动选择可用端口
--no-open            只启动 server，不自动打开浏览器
--read-only          只查看，不允许保存
```

保存边界：

- 只写当前项目的 `iteration-bindings.yaml`。
- 只补齐缺失的 `product.yaml` 和 `service.yaml`。
- 不覆盖已有人工维护字段。
- 不执行 `git checkout`。
- 不自动创建、删除或合并分支。
- 不自动提交。

### link-docs

代码仓库和文档仓库分开管理时，在源码仓库运行：

```bash
aiops-governance link-docs --docs-repo ../aiops-docs
```

该命令只在源码仓库写入本机文件：

```text
.aiops-docs.yaml
.aiops-hook-runner.sh
```

并把它们加入源码仓库 `.gitignore`。源码仓库不复制完整 `.aiops/`；hook 事件会投递到文档仓库 `.aiops/diff-records/pending.md`。达到治理阈值后，hook 从文档仓库启动 Claude Code 维护任务；Claude Code 不可用时，只提示当前 LLM 使用 subagent 维护。

生成的 hook runner 在源码开发和外部用户使用阶段优先用临时 Docker Python 容器运行 hook 脚本；Docker CLI、daemon 或容器执行不可用时，会降级到本机 `python3` / `python`。降级只影响脚本运行方式，不会把 runner 故障追加进 `pending.md`。

### install

```bash
aiops-governance install --with none
```

默认安装固定版本工具链，可用 `--with none` 跳过。

## 选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `-y, --yes` | 关闭 | 跳过交互式问答 |
| `--project <id>` | 自动推断 | 项目标识 |
| `--products <list>` | `core` | 逗号分隔的产品列表 |
| `--services <groups>` | `<product>-service` | 服务分组，例如 `ca:ca-admin+ca-worker,kmc:kmc-admin` |
| `--iteration <id>` | `current` | 初始项目迭代 |
| `--docs-branch <branch>` | `main` | 初始文档分支 |
| `--service-branch <branch>` | docs branch | 初始服务主分支 |
| `--code-root <path>` | 当前目录 | 初始服务代码根 |
| `--level <level>` | `high` | `low` / `medium` / `high` / `xhigh` |
| `--language <lang>` | `zh-CN` | 知识文档语言 |
| `--skills-source <path>` | 自动发现 | 覆盖技能源目录 |
| `--skills-target <path>` | runtime 默认目录 | 覆盖运行时技能目录 |
| `--with <tools>` | `default` | `default` / `none` / 逗号分隔工具列表 |
| `--tools-root <path>` | `~/.aiops/tools` | 工具安装根目录 |
| `--docs-repo <path>` | 无 | `link-docs` 使用的文档仓库路径 |

## Docker 验证

在本仓库内不要直接运行宿主机 `npm`、`npx`、`node` 或 `python`。开发验证使用 Docker：

```bash
docker run --rm -v "$PWD":/repo -w /repo/packages/aiops-governance-cli node:24-bookworm \
  bash -lc "npm ci && npm run check && npm run build"
```

## 发布

当前版本：`0.1.3`，发布标签：`v0.1.3`。

发布脚本 `scripts/publish-aiops-npm.sh` 在 `node:24-bookworm` 容器内运行，`NPM_TOKEN` 从环境变量或 CI secret 提供。
