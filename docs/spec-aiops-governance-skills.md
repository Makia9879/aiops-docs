# AIOps Governance Skills Execution Spec

Date: 2026-06-09

Status: Partially superseded by `docs/adr/0004-human-reading-layer-and-graph-backed-agent-facts.md` and `docs/adr/0005-push-hook-commit-analysis-maintenance.md`.

Note: This spec remains useful for install/init/setup, hooks, governance levels, and iteration binding. Its canonical-docs-as-agent-fact-source model, PRD/specs-centered recall, `specs/` directories, and pending/threshold maintenance flow are no longer the current target design.

## 1. 原始场景与目标

将当前 AIOps skills 从“提示词式文档生成流程”升级为一套 workspace 级项目知识库治理系统，并把文档结构从第一版“项目 -> product domain”升级为：

```text
项目迭代 -> 产品版本 -> 微服务主分支
项目文档 -> 产品文档 -> 微服务文档
```

本 spec 的目标是让 coding agent 可以基于项目迭代绑定维护 canonical docs，同时让人可以通过项目级 guides 站点阅读项目、产品和微服务知识。

### 1.1 原始目标与实现章节

| 原始目标 | 目标说明 | 对应实现章节 |
| --- | --- | --- |
| 历史项目生成文档 | 从已有代码、已有文档、配置、图谱工具结果生成项目/产品/微服务三级 AIOps 知识库。 | `4. Target Workspace Structure`、`8. Project Config`、`14. Guides Site`、`15. Skill Changes` |
| 文档召回辅助研发 | coding agent 在实现、调试、评审、解释和测试前召回项目迭代、产品、微服务级 PRD、architecture、specs、ADR、workflows、open questions 和源码证据，作为研发约束。 | `4. Target Workspace Structure`、`8. Project Config`、`10. Hooks`、`12. Development Context Recall`、`15. Skill Changes` |
| 维护文档 | hooks 记录变更语义到 `pending.md`，LLM 先读取迭代绑定和源码分支，再根据 pending 语义做 workspace-wide 召回和跨文档一致性维护。 | `9. Governance Levels`、`10. Hooks`、`11. Diff Records`、`13. Semantic Maintenance` |
| 新项目初始化文档 | 从需求、会议记录、PRD 或粗略想法初始化项目、产品、微服务知识骨架。 | `5. Install Commands`、`6. Bootstrap Questions`、`8. Project Config`、`14. Guides Site`、`15. Skill Changes` |
| 人类阅读项目知识 | canonical docs 面向 agent 治理，guides 站点面向人类阅读，每个 project 自带可用 Docker Compose 打开的 VuePress 站点。 | `8. Project Config`、`14. Guides Site` |
| 降低安装和使用心智负担 | `install`、`init`、`setup` 幂等；`config-ui` 可视化维护项目迭代、产品版本、服务代码根和服务主分支；治理强度用 `low`、`medium`、`high`、`xhigh` 预设。 | `5. Install Commands`、`6. Bootstrap Questions`、`7. Config UI`、`9. Governance Levels` |
| 支持 Codex 与 Claude Code | hooks 覆盖 Codex 和 Claude Code，平台配置只做追加式幂等写入，hooks 文件作为普通治理文件提交。 | `10. Hooks` |
| 支持 Trellis 协同 | Trellis 作为任务和上下文注入层，不作为 canonical source；canonical source 仍是 `.aiops/projects/<project>/`。 | `8. Project Config`、`15. Skill Changes` |

这些目标的共同边界是知识库治理：让 coding agent 能依赖文档继续维护项目，同时让人可以通过 guides 站点阅读项目知识。

## 2. Source Decisions

本 spec 以以下文档为准：

- `CONTEXT.md`
- `docs/adr/0001-routed-aiops-knowledge-skills.md`
- `docs/adr/0002-version-skill-source-in-repo.md`
- `docs/adr/0003-project-level-knowledge-governance.md`
- `docs/spec-aiops-branch-bound-document-structure.md`

若本文与 ADR 冲突，以 ADR 为准；实现前应先更新 ADR 或本文。

## 3. Scope

本轮做：

- 更新共享 schema/reference，使目标结构迁移到 project/product/service 三级模型。
- 更新 `aiops-governance-bootstrap`、`aiops-dev-context-recall`、`aiops-daily-doc-maintenance`、`aiops-historical-project-intake`、`aiops-knowledge-review` 和 lifecycle router 的职责边界。
- 更新 `packages/aiops-governance-cli`，支持 schema v2、`iteration-bindings.yaml`、product/service 文件补齐和 `config-ui`。
- 更新 VuePress 知识库文章，说明三级治理结构、迭代绑定、分支预检和 `config-ui`。
- 保持 `install`、`init`、`setup` 幂等。
- 保持 hooks 只记录、提醒和触发维护，不直接改 canonical docs，不切换 Git 分支。

本轮不做：

- 不做 workspace 级 guides 聚合站点。
- 不要求每篇文档使用 frontmatter 或结构化 metadata。
- 不使用 JSONL 记录 diff records。
- 不实现 hook 自动升级/哈希追踪机制。
- 不创建独立跨产品或跨微服务文档层。
- 不定义微服务版本。
- 不把本地临时开发分支写入文档版本模型。

## 4. Target Workspace Structure

`init` 后 workspace 中应出现：

```text
.aiops/
  governance.yaml
  hooks/
    aiops_inject_context.py
    aiops_record_diff.py
    aiops_trigger_maintenance.py
  diff-records/
    pending.md
    archived/
  projects/
    <project>/
      project.yaml
      iteration-bindings.yaml
      README.md
      open-questions.md

      iterations/
        <project-iteration>/
          iteration.yaml
          prd.md
          architecture.md
          release-scope.md
          risks.md

      products/
        <product>/
          product.yaml
          prd/
          architecture/
          workflows/
          specs/
          adr/

          services/
            <service>/
              service.yaml
              architecture/
              specs/
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
          iterations/
          products/
          services/
          .vuepress/
            config.ts
  local/
  cache/
  tmp/
```

平台配置：

```text
.codex/
  hooks.json

.claude/
  settings.json
```

默认提交：

```text
.aiops/governance.yaml
.aiops/hooks/**
.aiops/diff-records/**
.aiops/projects/**
.codex/hooks.json
.claude/settings.json
```

默认忽略：

```text
.aiops/local/**
.aiops/cache/**
.aiops/tmp/**
```

## 5. Install Commands

### 5.1 `install`

职责：

- 安装或更新 AIOps skills 到 agent runtime。
- 安装前检查本地辅助工具链，汇总期望版本、当前版本和缺失项。
- 交互式终端提示是否由安装程序自动补齐工具链；非交互环境必须传 `--yes` 才自动补齐。
- 不修改当前 workspace。
- 不创建 `.aiops/`。
- 不安装 hooks。

幂等要求：

- 重复执行不能重复安装同名 skill。
- 如果 skill 已存在，应校验并按实现策略覆盖或提示，但不得产生重复目录。
- 工具链已完整时不重复执行包安装；工具链缺失、版本不符或 shim 不完整时，只补齐受影响工具。

### 5.2 `init`

职责：

- 将当前 workspace 接入 AIOps governance。
- 从当前目录向上递归查找已有 `.aiops/`。
- 找到则使用该 `.aiops/` 作为 workspace governance root。
- 找不到则在当前目录创建 `.aiops/`。
- 创建缺失文件和目录。
- 追加 Codex/Claude Code AIOps hook entry。
- 初始化 project/product/service 三级骨架和 `iteration-bindings.yaml` 的安全默认值。

幂等要求：

- 已存在 `.aiops/governance.yaml` 时读取并复用。
- 已存在 project 目录时只补缺失文件，不覆盖已有文档。
- 已存在 `project.yaml`、`iteration-bindings.yaml`、`product.yaml` 或 `service.yaml` 时，不覆盖人工维护内容。
- 已存在 AIOps hook entry 时跳过。
- 平台配置解析失败时停止并提示人工处理，不覆盖。

### 5.3 `setup`

职责：

- 顺序执行 `install` + `init`。

幂等要求：

- 继承 `install` 和 `init` 的幂等要求。

### 5.4 `config-ui`

职责：

- 从当前目录向上查找 `.aiops/`。
- 读取 `.aiops/projects/<project>/project.yaml`。
- 读取或创建 `.aiops/projects/<project>/iteration-bindings.yaml`。
- 启动只监听本机的 HTTP server，默认 `127.0.0.1`。
- 用无构建静态 HTML、CSS 和浏览器原生 JavaScript 展示项目 -> 产品 -> 微服务树。
- 支持配置项目迭代、产品版本、服务 `code_root` 和 `required_branch`。
- 保存时写 `iteration-bindings.yaml`，并可安全补齐缺失的 `product.yaml` 和 `service.yaml`。
- 保存前校验必填字段、重复 id、缺失服务、无效路径和 YAML 结构。

选项：

```text
--project <id>       指定项目 id
--host <host>        默认 127.0.0.1
--port <port>        默认自动选择可用端口
--no-open            只启动 server，不自动打开浏览器
--read-only          只查看，不允许保存
```

安全边界：

- 不执行 `git checkout`。
- 不自动创建、删除或合并分支。
- 不自动提交。
- 不写 `.aiops/local/` 之外的临时状态。
- 只允许写当前项目的 `iteration-bindings.yaml`、缺失的 `product.yaml` 和缺失的 `service.yaml`。
- 自动补齐不得覆盖已有人工维护内容；遇到字段冲突时停止保存并提示人工处理。

## 6. Bootstrap Questions

Bootstrap 提问必须固化为 TypeScript question model，并被 CLI/TUI 与 skill 共同复用。

默认核心问题：

1. Project id.
2. Products.
3. Services for each product.
4. Product repositories.
5. Governance level.
6. Knowledge language.

默认答案：

```text
project id: 从 manifest 或当前目录推断，kebab-case，需用户确认
products: 留空则使用 core
services: 留空则为每个 product 使用 <product>-service
product repositories: 可选；支持 repo 路径列表或 product=repo 映射；填写后自动生成同名 service、写入 code_root，并读取当前 Git 分支作为 required_branch
governance_level: high
knowledge_language: zh-CN
```

高级配置默认折叠：

- project iteration
- docs branch
- product version
- service code roots
- service required branches
- knowledge root
- Codex hooks
- Claude Code hooks
- Trellis integration
- auto commit override

服务 `code_root` 和 `required_branch` 在 bootstrap 阶段可以使用安全占位或推断值。对于已成型多仓库项目，CLI 必须支持一键传入产品仓库映射并直接生成正确 `code_root` 和 `required_branch`，不要求用户初始化后手工改 YAML。

## 7. Governance Config

`.aiops/governance.yaml` 是 workspace 级共享配置，默认版本化，不得写入机器本地绝对路径。

建议字段：

```yaml
schema_version: 1
governance_level: high
knowledge_language: zh-CN
projects_root: .aiops/projects
diff_records: .aiops/diff-records/pending.md
platform_hooks:
  codex:
    status: installed
    file: .codex/hooks.json
  claude_code:
    status: installed
    file: .claude/settings.json
```

机器本地状态放入：

```text
.aiops/local/
```

## 8. Project Config

`.aiops/projects/<project>/project.yaml` 归 knowledge workflow 维护。installer 可创建和补齐安全字段，但不得覆盖已有项目知识。

### 8.1 `project.yaml`

`project.yaml` 记录项目基本信息、产品注册表和文档路径，不直接承载具体迭代的分支绑定。

```yaml
schema_version: 2
project: certificate-system
display_name: 数字证书认证系统
governance_level: high
knowledge_language: zh-CN

canonical_paths:
  iterations: iterations/
  products: products/
  guides: guides/

products:
  - id: ca
    name: CA 管理端
    path: products/ca
    services:
      - ca-admin
```

### 8.2 `iteration-bindings.yaml`

`iteration-bindings.yaml` 是文档维护的核心配置。每次项目迭代必须在这里声明本轮产品版本和微服务主分支。

```yaml
schema_version: 1
project: certificate-system

iterations:
  - id: develop_1.0.0
    docs_branch: develop_1.0.0
    docs_path: iterations/develop_1.0.0

    products:
      - id: ca
        version: develop_1.0.0
        docs_path: products/ca
        services:
          - id: ca-admin
            code_root: /Users/makia98/lij/work/CA/ca_admin
            required_branch: develop_1.0.0
```

规则：

- `iterations[].id` 是项目迭代标识。
- `iterations[].docs_branch` 是该项目迭代对应的项目级文档 Git 分支。
- `products[].version` 是该项目迭代选定的产品版本。
- `services[].required_branch` 是该项目迭代选定的微服务主分支。
- 产品只定义版本，微服务只定义主分支。
- 本地临时源码分支不写入 `iteration-bindings.yaml`。
- LLM 更新文档时只检查当前源码分支是否符合 `required_branch`，不维护额外的源码分支到文档分支映射。

### 8.3 `product.yaml`

`product.yaml` 记录产品稳定身份和服务清单，不重复记录每个迭代的分支关系。

```yaml
product: ca
project: certificate-system
name: CA 管理端

services:
  - id: ca-admin
    code_root: /Users/makia98/lij/work/CA/ca_admin
    docs_path: services/ca-admin
```

### 8.4 `service.yaml`

`service.yaml` 记录微服务稳定身份、代码根和文档路径，不记录本地开发分支。

```yaml
service: ca-admin
product: ca
project: certificate-system
code_root: /Users/makia98/lij/work/CA/ca_admin
docs_path: products/ca/services/ca-admin
```

## 9. Governance Levels

```text
low
  只记录 pending.md，最低打扰，不自动 commit。

medium
  记录 + 温和提醒，不自动 commit。

high
  默认推荐。记录 + 提醒 + 累计阈值后自动维护。
  自动维护成功后，可以自动提交 documentation-only/governance-only changes。

xhigh
  强治理。更早自动维护，必要时 Stop hook 阻止结束。
  自动维护成功后默认提交，前提是不混入未处理的非文档变更。
```

自动 commit message：

```text
docs(aiops): <动作> <project> 知识库
```

英文知识库使用英文 subject。

## 10. Hooks

Hooks 一等支持 Codex 和 Claude Code。

Hook 脚本边界：

- 记录有语义价值的 agent 事件，不要求 coding LLM 主动填写记录。
- 不直接改 canonical docs。
- 不做大范围知识重写。
- 不执行 `git checkout` 或其他分支切换。
- 写入文档仓库的 `.aiops/diff-records/pending.md`。
- 按治理等级调用 Claude Code 执行 `aiops-daily-doc-maintenance`，或在 Claude Code 不可用时提示当前 LLM 使用 subagent 维护。
- 在注入或提醒中提示 canonical docs 维护必须先读取 `iteration-bindings.yaml`。
- 在用户开始研发任务时提示可运行 `aiops-dev-context-recall`，按项目迭代、产品、微服务顺序召回 canonical docs，再核对源码证据。

Hook 文件：

```text
.aiops/hooks/aiops_hook_runner.sh
.aiops/hooks/aiops_inject_context.py
.aiops/hooks/aiops_record_diff.py
.aiops/hooks/aiops_trigger_maintenance.py
```

Hook runner 在源码开发和外部用户使用阶段优先通过临时 Docker Python 容器执行 hook 脚本；当 Docker CLI、Docker daemon 或容器执行不可用时，允许降级到本机 `python3` / `python`。降级只用于继续记录和触发治理，不改变 pending 的语义，也不把 runner 降级信息追加到 `pending.md`。

源码仓库不复制完整 `.aiops/`。如果源码仓库需要把 hook 事件投递到独立文档仓库，使用本机文件：

```yaml
# <source-repo>/.aiops-docs.yaml
docs_repo: /path/to/aiops-docs
```

`.aiops-docs.yaml` 和生成的 `.aiops-hook-runner.sh` 是源码仓库本地文件，默认加入源码仓库 `.gitignore`，不提交到源码 Git。

维护 runner 配置放在文档仓库 `.aiops/governance.yaml`：

```yaml
maintenance_runner:
  type: claude_code
  command: claude
  fallback: prompt_subagent
  modes:
    high: async
    xhigh: sync
```

治理等级触发规则：

- `low`：只记录，不自动维护。
- `medium`：只提醒，不自动维护。
- `high`：pending 达到阈值后异步启动 Claude Code 维护。
- `xhigh`：只要存在 pending，就同步启动 Claude Code 维护。

维护执行者负责 upsert docs、归档 pending、按治理等级提交文档 Git。hook wrapper 不归档 pending、不提交 Git。Claude Code 不可用时，hook 只把 fallback prompt 输出给当前 coding LLM，不向 `pending.md` 追加 runner 故障记录。

平台配置策略：

- `.codex/hooks.json` 不存在则创建。
- `.claude/settings.json` 不存在则创建。
- 存在则只追加或更新 AIOps hook entry。
- 已有 AIOps hook entry 则更新为当前受管命令，不重复追加。
- 无法安全解析则停止并提示人工处理。

## 11. Diff Records

只使用 Markdown。

Active input：

```text
.aiops/diff-records/pending.md
```

Archive：

```text
.aiops/diff-records/archived/YYYY-MM-DD.md
```

`pending.md` 是 hook 记录的 agent 运行轨迹摘要队列，不是完整源码 diff，也不是 coding LLM 的强制结束表单。记录应尽量包含 source agent、hook event、source repo、source branch、source head、touched paths、工具输入/输出摘要、final output 或 subagent summary。project iteration、product、service、product version、service required branch 可以由维护流程从 `iteration-bindings.yaml` 和源码证据中补齐。

示例：

```md
## Hook Events

### 2026-06-10 16:40 - codex PostToolUse

Status: pending
Source agent: codex
Hook event: PostToolUse
Source repo: /Users/makia98/lij/work/CA/ca_admin
Source branch: develop_1.0.0
Source HEAD: abc1234 adjust certificate issuing flow
Tool: apply_patch

Touched paths:
- internal/logic/uploadusercsr.go

Event summary:
Tool output:
  updated certificate issuing flow and KMC interaction call path

Maintenance direction:
- Treat this as an asynchronous coding-agent trace, not as a complete source diff.
- Maintenance executor should inspect referenced source repos directly before changing canonical docs.
```

归档规则：

- 处理完成后，从 `pending.md` 移除对应 section。
- 将原记录和处理结果追加到 `archived/YYYY-MM-DD.md`。
- `archived/` 提交到 Git，但不参与 active governance recall、不参与维护债务计算。

## 12. Development Context Recall

`aiops-dev-context-recall` 执行文档召回辅助研发。

适用场景：

- 实现功能前需要理解 PRD、架构约束或历史决策。
- 调试 bug 前需要确认流程、接口、配置、数据模型和验证入口。
- 评审、解释、写测试或做技术方案前需要召回项目上下文。
- 用户明确说“先看文档”“召回文档”“按 AIOps 知识库辅助研发”。

执行顺序：

1. 检查 `.aiops/governance.yaml`。
2. 读取 `.aiops/projects/<project>/project.yaml`。
3. 读取 `.aiops/projects/<project>/iteration-bindings.yaml`。
4. 识别当前研发任务对应的项目迭代、产品和微服务。
5. 读取项目迭代文档：`iterations/<project-iteration>/`。
6. 读取相关产品文档：`products/<product>/{prd,architecture,specs,workflows,adr}/`。
7. 读取相关微服务文档：`products/<product>/services/<service>/{architecture,specs,workflows,adr}/`。
8. 读取 `open-questions.md`。
9. 必要时读取 `guides/docs/` 作为人类阅读层，但不把 guides 当事实源。
10. 回到源码、测试、配置、迁移、manifest 和已有文档核验证据。

服务级研发任务必须执行分支预检：从 `iteration-bindings.yaml` 读取服务 `code_root` 和 `required_branch`，再检查源码仓库当前分支。当前分支不一致时，不静默把 canonical docs 当作本地分支现状；agent 必须说明差异，并把文档视作目标迭代上下文，或等待用户切换分支/确认继续。

输出要求：

- 简要列出项目迭代、产品、微服务和分支绑定。
- 列出本次研发最相关的 PRD、architecture、specs、ADR、workflow 约束。
- 列出下一步要读的源码路径或验证命令。
- 不修改 canonical docs；如发现文档漂移，等代码任务结束后由 hook 记录或转入 `aiops-daily-doc-maintenance`。

## 13. Semantic Maintenance

`aiops-daily-doc-maintenance` 执行语义维护。

必须先做迭代绑定预检：

1. 识别任务影响范围：项目、产品、微服务。
2. 识别或询问当前项目迭代。
3. 读取 `.aiops/projects/<project>/project.yaml`。
4. 读取 `.aiops/projects/<project>/iteration-bindings.yaml`。
5. 根据项目迭代解析产品版本和微服务主分支。
6. 读取受影响的 `product.yaml`、`service.yaml`。
7. 读取受影响服务代码仓库当前分支。
8. 如果源码当前分支与 `required_branch` 不一致，提醒人工确认。

分支不一致时默认不修改 canonical docs，只能：

- 提醒人工切换源码分支。
- 写入 `.aiops/diff-records/pending.md`。
- 写入项目或文档范围内的 `open-questions.md`。
- 在人工明确确认“本次文档仍基于该项目迭代绑定维护”后继续，并记录确认原因。

预检通过或人工确认后：

1. 总结 pending 语义，提炼关键词。
2. 用关键词在整个 workspace 召回文件和内容上下文。
3. 根据召回内容修改相关 canonical docs，保持上下文一致。
4. 必要时同步更新 guides docs。
5. 归档处理过的 pending section。
6. 按治理等级决定是否提交 git 变更。

文档落点：

- 项目迭代目标、共同约束、发布范围、项目级风险 -> `iterations/<project-iteration>/`。
- 产品版本目标、产品级能力、产品内架构、产品级工作流、产品级 ADR -> `products/<product>/`。
- 服务入口、API/RPC contract、数据库表、消息协议、服务内部业务流程、服务级 ADR、验证命令 -> `products/<product>/services/<service>/`。
- Human-facing explanation -> `guides/docs/`，但必须回链 canonical docs。
- Unresolved or weak evidence -> `open-questions.md`。

外部上下游调用检索：

1. 先读当前产品或微服务自己的 canonical docs。
2. 从当前文档中的外部上下游说明定位被调用或调用方产品/服务。
3. 再读取对方产品或微服务自己的 canonical docs 作为补充。
4. 如果当前文档没有说明外部调用关系，更新当前产品或微服务文档，把调用入口、协议、责任边界、错误口径和验证路径写清楚。

规则：

- 不只按路径改单个文件。
- 要检查关联语义，例如 interface 变化是否影响 workflows、architecture、guides。
- 不创建 `cross/`、`integration.yaml` 或独立跨域版本矩阵。
- 修改后归档处理过的 pending section。

## 14. Guides Site

每个 project 自带一个最小 VuePress guides 站点。

边界：

- 一个 project 一个 guides 站点。
- 不做 workspace 级 guides 聚合。
- 不跨 project 聚合。
- VuePress 只渲染 `guides/docs/`。
- canonical docs 仍在 `iterations/`、`products/` 和 `products/<product>/services/`。
- guides 可以重组阅读路径，但必须回链 canonical docs，不能成为唯一事实源。

运行：

```bash
cd .aiops/projects/<project>/guides
docker compose up --build
```

默认页面：

```text
guides/docs/README.md
guides/docs/overview.md
guides/docs/onboarding.md
guides/docs/change-playbook.md
guides/docs/iterations/
guides/docs/products/
guides/docs/services/
```

## 15. Skill Changes

### 15.1 `aiops-governance-bootstrap`

职责：

- 检查 `.aiops/governance.yaml` marker。
- 引导或调用 bootstrap question model。
- 创建 `.aiops/` 治理目录。
- 创建 project/product/service 三级 skeleton。
- 创建 `iteration-bindings.yaml` 的安全默认值。
- 创建 guides VuePress 站点。
- 安装 Codex/Claude Code hook entry。
- 检测 Trellis。
- 不覆盖已有人工维护的 canonical docs 或 YAML。

### 15.2 `aiops-knowledge-lifecycle`

职责：

- 路由到 bootstrap、historical intake、dev context recall、new briefing、daily maintenance、knowledge review。
- 任何治理 skill 执行前先检查 `.aiops/governance.yaml`。
- marker 缺失时提醒并运行 bootstrap，除非人类反对。
- 写入或 review canonical docs 前读取 schema reference。
- 维护 canonical docs 前读取 iteration binding 并执行分支预检。

### 15.3 `aiops-dev-context-recall`

职责：

- 为研发、调试、评审、解释和测试任务召回 canonical docs。
- 读取 `project.yaml` 和 `iteration-bindings.yaml`。
- 识别项目迭代、产品和微服务范围。
- 对服务级任务执行 `required_branch` 预检。
- 按项目迭代 -> 产品 -> 微服务 -> open questions -> guides -> 源码证据的顺序提供研发上下文。
- 默认不修改 canonical docs。

### 15.4 `aiops-historical-project-intake`

职责：

- 使用 understand-anything 建立历史项目理解。
- 识别项目、产品、服务、服务代码根、入口、部署单元和外部上下游调用关系。
- 生成或补齐 `.aiops/projects/<project>/` 下的三级 canonical docs。
- 生成或补齐 `project.yaml`、`iteration-bindings.yaml`、`product.yaml`、`service.yaml`。
- 不再生成旧 `00-project-card.md` 到 `09-maintenance-guide.md` 结构。
- 不创建独立跨产品或跨服务文档层。

### 15.5 `aiops-new-project-briefing`

职责：

- 从需求/会议/PRD 初始化 `.aiops/projects/<project>/`。
- 初始化项目迭代、产品、服务骨架。
- 未确认内容写入 `open-questions.md`。

### 15.6 `aiops-daily-doc-maintenance`

职责：

- 读取 `pending.md`。
- 识别项目迭代和影响范围。
- 读取并检查 `iteration-bindings.yaml`。
- 对服务级变更检查源码当前分支与 `required_branch`。
- 做 semantic maintenance。
- 归档处理过的 pending records。
- 按 governance level 决定是否 commit。

### 15.7 `aiops-knowledge-review`

职责：

- 审查 `.aiops/projects/<project>/` 是否符合 project/product/service 三级结构。
- 审查 `iteration-bindings.yaml` 是否完整、无微服务版本、无本地临时分支。
- 检查 service `code_root` 和当前分支是否与 `required_branch` 一致。
- 检查外部上下游关系是否写在当前产品或微服务自己的 canonical docs 中。
- 检查 guides 页面是否回链 canonical docs。
- 不要求生成 `reviews/` 目录。

## 16. Implementation Order

后续落地必须按以下顺序推进，不能先实现 CLI 再回补文档规则。

1. 更新 `CONTEXT.md` 术语。
2. 更新 `docs/adr/0003-project-level-knowledge-governance.md`。
3. 更新本 spec。
4. 更新 `skills/aiops-knowledge-lifecycle/references/document-schema.md`。
5. 更新 repo-local skills。
6. 实现 CLI schema 和文件读写。
7. 实现 `config-ui` 子命令。
8. 更新 VuePress 知识库文章。
9. 使用 Dockerized Node 流程构建 CLI。
10. 使用 Dockerized VuePress 构建文档站点。

验证不得在宿主机直接运行 `npm`、`npx`、`node` 或 `python`。

## 17. Acceptance Criteria

- `install` 重复运行不产生重复 skill。
- `init` 从嵌套目录运行时能向上找到已有 `.aiops/`。
- 没有 `.aiops/` 时，`init` 在当前目录创建 `.aiops/`。
- `init` 重复运行不覆盖 `.aiops/projects/<project>/**` 已有文档。
- 新项目初始化能生成 Project/Product/Service 三级文档骨架。
- `project.yaml` 使用 schema v2，记录 products registry 和 canonical paths。
- `iteration-bindings.yaml` 能表达项目迭代、产品版本、微服务主分支。
- `product.yaml` 和 `service.yaml` 能记录稳定身份、服务清单和代码根。
- 单产品、单微服务文档都有明确落点。
- 外部上下游调用关系能在产品或微服务自己的文档中说明清楚。
- LLM 能在修改 canonical docs 前输出项目迭代绑定关系。
- LLM 能在实现、调试、评审、解释和测试任务前按 `aiops-dev-context-recall` 召回项目迭代、产品、微服务和 open questions 上下文。
- 本地源码分支与微服务主分支不一致时默认提醒，不静默按本地分支改写 canonical docs。
- Guides 站点仍能从项目级入口阅读项目、产品和微服务文档。
- `.codex/hooks.json` 和 `.claude/settings.json` 只追加或更新 AIOps hook entry，重复运行不重复追加。
- `.aiops/diff-records/pending.md` 使用 Markdown。
- `aiops-daily-doc-maintenance` 按 pending 语义做 workspace-wide 召回。
- guides VuePress 站点可以通过 Docker Compose 启动。
- 默认知识库语言为中文。
- 默认 governance level 为 `high`。
- CLI 提供 `config-ui` 子命令，通过本地浏览器页面维护 `iteration-bindings.yaml`。
- CLI TypeScript check/build 通过。
- npm package name is `@makia9879/aiops`, current version is `0.1.3`, and release tag is `v0.1.3`.
- npm publish is driven by Docker script `scripts/publish-aiops-npm.sh` with `NPM_TOKEN` supplied from environment or CI secret.
- Fixed external tool versions are maintained in `packages/aiops-governance-cli/src/toolchain/versions.json`.

## 18. Open Questions

当前无阻塞确认项。实现中若发现平台 hook JSON 结构、YAML 安全补齐或 config-ui 写入边界与预期不一致，先更新本文和 ADR，再改实现。
