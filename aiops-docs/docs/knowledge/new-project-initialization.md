# 新项目初始化文档

新项目初始化文档的目标，是在代码还没有变复杂之前，先建立项目阅读层和维护机制。它让项目从第一天开始就有稳定的项目、产品、微服务边界，并为后续 agent 召回源码和图谱留下清晰入口。

新项目没有足够源码证据，所以不能假装已有实现 spec。初始化阶段依赖用户引导；代码出现后，文档维护循环再用最新提交、源码、CodeGraph 和 Understand Anything 替换假设。

## 初始化结果

初始化后，workspace 中应出现项目级知识目录：

```text
.aiops/projects/<project>/
  project.yaml
  iteration-bindings.yaml
  README.md
  open-questions.md
  iterations/
    <project-iteration>/
      iteration.yaml
      overview.md
      architecture.md
      release-scope.md
      risks.md
  products/
    <product>/
      product.yaml
      overview.md
      architecture/
      workflows/
      adr/
      services/
        <service>/
          service.yaml
          overview.md
          architecture/
          workflows/
          adr/
  guides/
    package.json
    docker-compose.yaml
    docs/
      README.md
      overview.md
      onboarding.md
      change-playbook.md
      .vuepress/
        config.ts
```

`.aiops/projects/<project>/` 是人类阅读层。`guides/` 是面向人阅读的 VuePress 站点模板，可用 Docker Compose 直接打开静态页面查看。

`project.yaml` 记录项目稳定身份、产品注册表和文档路径。`iteration-bindings.yaml` 记录项目迭代、产品版本和微服务主分支，不记录本地临时源码分支。

不创建 `specs/`。新项目阶段的接口、数据结构、配置和协议只能作为假设或开放问题记录；代码出现后，由源码和图谱成为事实。

## 引导问题

初始化应使用 TypeScript question model 和 TUI 引导人类回答，skills 也复用同一套问题模型来指导 LLM 提问。默认答案要足够好，让使用者不必理解全部配置。

核心问题应覆盖项目、产品、微服务和迭代绑定：

| 问题 | 默认策略 |
| --- | --- |
| project id | 从 manifest 或当前目录推断为 kebab-case，但需要人确认。 |
| products | 为空时默认 `core`。 |
| services | 根据产品和源码根推断；无法确认时先放入待确认问题。 |
| project iteration | 从当前文档分支或人类输入确认。 |
| product versions | 默认跟随项目迭代，可由人类覆盖。 |
| service main branches | 默认使用当前源码主分支；必须写入 `iteration-bindings.yaml`。 |
| governance level | 默认 `high`。 |
| knowledge language | 默认 `zh-CN`。 |

高级配置默认折叠，包括 source roots、knowledge root、Codex hooks、Claude Code hooks、Trellis、自动提交策略等。用户以后可以改，但初始化时不应该被配置复杂度挡住。

## Workspace 发现

初始化命令从当前目录开始，递归向上查找已有 `.aiops/`。如果找到，就在已有 workspace 下创建项目知识目录；如果没找到，就在当前目录创建 `.aiops/`。

```text
当前目录
  向上查找 .aiops/
    找到：使用已有 workspace
    未找到：在当前目录创建 .aiops/
```

初始化动作必须幂等。目录已存在时不重复创建冲突内容，hooks 已安装时不重复追加，已有配置可解析时只补缺失项。

## Install、Init、Setup

命令边界应保持简单：

| 命令 | 作用 |
| --- | --- |
| `install` | 只安装 skills，不修改 workspace。 |
| `init` | 初始化当前 workspace 的治理结构、项目阅读层和 hooks。 |
| `setup` | 执行 `install + init`。 |

`install` 不应偷偷改项目文件。`init` 和 `setup` 可以改 workspace，但必须是幂等动作。

发布后推荐通过独立 CLI 或 `npx` 原生安装和初始化：

```bash
# 全局安装 CLI
npm install -g @makia9879/aiops
aiops setup --yes --project cert-auth --products CA,RA,KMC,OCSP

# 或通过 npx 直接运行
npx -y @makia9879/aiops setup --yes --project cert-auth --products CA,RA,KMC,OCSP
```

后续 `config-ui` 子命令落地后，可以用本地浏览器页面维护 `iteration-bindings.yaml`，避免手写项目迭代、产品版本和微服务主分支矩阵。

`install` 默认会安装 AIOps skills，并按固定版本安装 `codegraph`、`understand-anything`、`trellis` 工具链。固定版本号集中维护在 CLI 包的 `src/toolchain/versions.json`。

在本 workspace 内开发和验证 CLI 时，遵守运行约束，不在宿主机直接执行 `npm`、`npx`、`node`，而是用临时 Docker node 镜像运行：

```bash
docker run --rm -it \
  -v "$PWD":/repo \
  -w /repo/packages/aiops-governance-cli \
  node:24-bookworm \
  bash -lc "npm ci && npm run build && node dist/cli.js setup --yes --with none --project cert-auth --products CA,RA,KMC,OCSP"
```

## Trellis 的位置

Trellis 是辅助工具，不是事实源。

推荐分工：

- `.aiops/projects/<project>/`：人类阅读层。
- 源码 + CodeGraph + Understand Anything：Agent 事实层。
- `.trellis/spec/`：任务执行用的操作镜像。
- `.trellis/tasks/`：任务证据。
- `.trellis/workspace/`：会话记忆，不作为确认事实来源。

当 Trellis 信息要进入阅读层时，需要经过 agent 语义判断和人类确认，不能把临时任务状态直接当成项目事实。

## 完成标准

一次合格的新项目初始化，应满足：

- workspace 和 project 边界清楚。
- products 和 services 已被记录，即使一开始只有 `core`。
- `iteration-bindings.yaml` 能表达项目迭代、产品版本和微服务主分支。
- 项目、产品、微服务三级阅读层落点已经建立。
- 不创建 Markdown `specs/`。
- 不确定实现细节进入 `open-questions.md`，等待代码和图谱替换。
- guides 可服务人类阅读。
- Codex 和 Claude Code hooks 可以被幂等安装。
- 默认配置足够可用，普通 engineer 不需要先理解整套治理理论。
