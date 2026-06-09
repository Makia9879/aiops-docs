# AIOps Branch-Bound Document Structure Spec

Date: 2026-06-09

## 1. 目标与范围

本 spec 记录 AIOps 文档治理结构的下一轮调整：把当前“项目 -> 产品域”的文档模型细化为“项目 -> n 个产品 -> n 个微服务”，并把文档维护锚定到项目迭代。

目标绑定模型：

```text
项目迭代 -> 产品版本 -> 微服务主分支
```

目标文档模型：

```text
项目文档 -> 产品文档 -> 微服务文档
```

本轮只记录规格和待改动范围，不直接修改 CLI、hooks、schema reference 或运行时 skill。

## 2. 现有边界

当前已落地或已定义的结构来自：

- `CONTEXT.md`：定义 Project-Level Knowledge Governance、Product Domain、Canonical Knowledge Layer、Reading Layer。
- `docs/adr/0003-project-level-knowledge-governance.md`：规定 `.aiops/projects/<project>/` 是长期项目知识根，`project.yaml` 归知识治理流程维护。
- `docs/spec-aiops-governance-skills.md`：定义第一版 `.aiops/` 工作区结构、bootstrap 问题、project config、hooks 和 diff records。
- `skills/aiops-knowledge-lifecycle/references/document-schema.md`：定义当前 canonical docs 结构为 `prd/`、`architecture/`、`specs/`、`adr/`、`workflows/`、`guides/`。

当前模型已经支持项目下有多个 product domain，但产品只是 `project.yaml` 中的领域和 canonical 目录下的可选子目录。它没有显式表达：

- 产品下的微服务集合。
- 项目迭代、产品版本、微服务主分支的绑定关系。
- 产品和微服务如何说明外部上下游调用关系。
- LLM 在维护前应如何提醒本地源码分支与迭代绑定不一致。

## 3. 设计原则

### 3.1 Git origin 边界

项目级文档必须能提交到项目级 Git origin repo。产品和微服务可以有独立版本语义，但不应被拆成只存在本地的临时文档副本。

推荐边界：

```text
一个项目级文档 repo origin
  -> 多个项目目录 .aiops/projects/<project>/
  -> 每个项目内管理多个产品
  -> 每个产品内管理多个微服务
```

文档维护以项目迭代为锚点。一次项目迭代定义本轮涉及的产品版本和微服务主分支；本地临时开发分支不进入文档版本模型，只触发提醒或人工确认。

### 3.2 文档事实源

Canonical docs 是长期事实源，面向 coding agent 和维护流程。

Guides docs 是阅读层，面向人类阅读、培训、交付和上手。Guides 可以重组信息，但必须回链 canonical docs，不能成为事实源。

### 3.3 迭代绑定优先于本地分支

LLM 修改 canonical docs 前必须先读取项目迭代绑定。源码本地分支与绑定的微服务主分支不一致时，默认不修改 canonical docs，只能：

- 提醒人工切换源码分支。
- 写入 `.aiops/diff-records/pending.md`。
- 写入项目或文档范围内的 `open-questions.md`。
- 在人工明确确认“本次文档仍基于该项目迭代绑定维护”后继续，并记录确认原因。

## 4. 目标 `.aiops` 结构

目标结构在现有 `.aiops/projects/<project>/` 下扩展，不新增额外顶层治理根。

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
```

## 5. Canonical Docs 结构

### 5.1 项目级文档

项目级文档描述项目迭代、全局架构、产品范围和共同约束。

```text
iterations/<project-iteration>/
  iteration.yaml
  prd.md
  architecture.md
  release-scope.md
  risks.md
```

适用内容：

- 项目迭代目标。
- 本迭代包含哪些产品版本。
- 产品范围和共同约束。
- 项目级风险和未决问题。
- 项目级部署、集成、交付节奏。

### 5.2 产品级文档

产品级文档描述产品版本、产品内能力、产品内架构、产品内微服务划分。

```text
products/<product>/
  product.yaml
  prd/
  architecture/
  workflows/
  specs/
  adr/
  services/
```

适用内容：

- 产品版本目标和范围。
- 产品级用户流程。
- 产品内微服务边界。
- 产品内数据流和能力组合。
- 产品对外部上下游产品的调用入口、责任边界和依赖假设。
- 产品级 ADR。

### 5.3 微服务级文档

微服务级文档描述单个代码服务的接口、模型、运行形态、业务规则和维护入口。

```text
products/<product>/services/<service>/
  service.yaml
  architecture/
  specs/
  workflows/
  adr/
```

适用内容：

- 服务入口、路由、handler、logic、model、配置。
- API contract、RPC contract、数据库表、消息协议。
- 服务内部业务流程。
- 服务调用外部上游或下游服务的入口、协议、错误口径和验证路径。
- 服务级 ADR 和回归验证命令。

## 6. Guides Docs 结构

Guides docs 保持项目级站点，不按每个产品或微服务单独拆站点。

```text
guides/docs/
  README.md
  overview.md
  onboarding.md
  change-playbook.md

  iterations/
    <project-iteration>.md

  products/
    <product>/
      overview.md
      versions.md
      services.md

  services/
    <service>.md
```

Guides 规则：

- 以人类阅读路径组织，不要求与 canonical docs 一一同构。
- 每个 guides 页面必须能追溯到 canonical docs。
- 不在 guides 中承载唯一业务规则。
- 站点仍归 `.aiops/projects/<project>/guides/` 所有。

## 7. 配置模型

### 7.1 `project.yaml`

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

  - id: kmc
    name: KMC 管理端
    path: products/kmc
    services:
      - kmc-admin
```

### 7.2 `iteration-bindings.yaml`

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

      - id: kmc
        version: develop_1.0.0
        docs_path: products/kmc
        services:
          - id: kmc-admin
            code_root: /Users/makia98/lij/work/CA/kmc_admin
            required_branch: develop_1.0.0
```

规则：

- `iterations[].id` 是项目迭代标识。
- `iterations[].docs_branch` 是该项目迭代对应的项目级文档 Git 分支。
- `products[].version` 是该项目迭代选定的产品版本。
- `services[].required_branch` 是该项目迭代选定的微服务主分支。
- 产品只定义版本，微服务只定义主分支；不再定义“微服务版本”。
- 本地临时源码分支不写入 `iteration-bindings.yaml`。
- LLM 更新文档时只检查当前源码分支是否符合 `required_branch`，不维护额外的源码分支到文档分支映射。

### 7.3 `product.yaml`

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

### 7.4 `service.yaml`

`service.yaml` 记录微服务稳定身份、代码根和文档路径，不记录本地开发分支。

```yaml
service: ca-admin
product: ca
project: certificate-system
code_root: /Users/makia98/lij/work/CA/ca_admin
docs_path: products/ca/services/ca-admin
```

## 8. 迭代绑定闭环

LLM 和 hooks 在维护 canonical docs 前必须先读取 `iteration-bindings.yaml`。

### 8.1 单项目迭代文档

修改 `iterations/<project-iteration>/` 前必须确认文档 repo 当前分支等于该迭代的 `docs_branch`，或由人工确认本次仍基于该迭代维护。

### 8.2 单产品文档

修改 `products/<product>/` 下的产品级文档前必须确认：

```text
project iteration = selected iteration
product version = iteration-bindings.yaml 中该产品的 version
```

产品文档更新只围绕项目迭代绑定的产品版本展开。

### 8.3 单微服务文档

修改 `products/<product>/services/<service>/` 前必须确认：

```text
service code root = iteration-bindings.yaml 中该服务的 code_root
required branch = iteration-bindings.yaml 中该服务的 required_branch
current branch = git -C <code_root> branch --show-current
```

如果 `current branch != required branch`，LLM 只提醒人工：

```text
当前 <service> 在 <current branch>，但项目迭代 <iteration> 要求 <required branch>。
请切换源码分支，或确认本次文档仍基于 <iteration> 的绑定关系维护。
```

人工确认后可以继续维护文档，但维护结果仍归属该项目迭代，不为本地临时分支创建文档版本。

## 9. LLM 执行流程

LLM 处理文档维护任务时按以下顺序执行：

1. 识别任务影响范围：项目、产品、微服务。
2. 识别或询问当前项目迭代。
3. 读取 `.aiops/projects/<project>/project.yaml`。
4. 读取 `.aiops/projects/<project>/iteration-bindings.yaml`。
5. 根据项目迭代解析产品版本和微服务主分支。
6. 读取受影响的 `product.yaml`、`service.yaml`。
7. 读取受影响服务代码仓库当前分支。
8. 如果源码当前分支与 `required_branch` 不一致，提醒人工确认。
9. 修改 canonical docs。
10. 必要时同步更新 guides docs。
11. 在 diff record、提交信息或维护总结中记录项目迭代、产品版本和微服务主分支。

### 9.1 外部上下游调用检索

不单独维护跨产品或跨微服务文档。涉及外部上下游时，LLM 按以下顺序检索：

1. 先读当前产品或微服务自己的 canonical docs。
2. 从当前文档中的外部上下游说明定位被调用或调用方产品/服务。
3. 再读取对方产品或微服务自己的 canonical docs 作为补充。
4. 如果当前文档没有说明外部调用关系，更新当前产品或微服务文档，把调用入口、协议、责任边界、错误口径和验证路径写清楚。

规则：

- 外部上下游关系由发起调用或承载业务依赖的一方在本方文档中说明。
- 被调用方文档只作为接口、协议和行为事实的补充证据。
- 不创建 `cross/`、`integration.yaml` 或独立跨域版本矩阵。

## 10. CLI 可视化配置子命令

`packages/aiops-governance-cli` 需要新增一个子命令，用于启动本地 HTTP server，并打开浏览器页面可视化配置项目、产品、微服务的迭代版本分支关系。

建议命令：

```bash
aiops-governance config-ui --project certificate-system
```

职责：

- 从当前目录向上查找 `.aiops/`。
- 读取 `.aiops/projects/<project>/project.yaml`。
- 读取或创建 `.aiops/projects/<project>/iteration-bindings.yaml`。
- 启动只监听本机的 HTTP server，默认 `127.0.0.1`。
- 在浏览器中展示项目 -> 产品 -> 微服务树。
- 支持配置项目迭代、产品版本、微服务 `code_root` 和 `required_branch`。
- 保存时写 `iteration-bindings.yaml`，并可安全补齐缺失的 `product.yaml` 和 `service.yaml`。
- 保存前校验必填字段、重复 id、缺失服务、无效路径和 YAML 结构。
- 保存后提示 LLM 和 hooks 将按新的迭代绑定关系维护文档。

建议选项：

```text
--project <id>       指定项目 id
--host <host>        默认 127.0.0.1
--port <port>        默认自动选择可用端口
--no-open            只启动 server，不自动打开浏览器
--read-only          只查看，不允许保存
```

页面能力：

- 项目迭代列表：新增、复制、删除、修改 `docs_branch`。
- 产品版本矩阵：为每个产品选择或填写版本。
- 微服务分支矩阵：为每个服务填写 `code_root` 和 `required_branch`。
- 检查面板：显示当前本地源码分支与 `required_branch` 是否一致。
- 预览面板：展示将写入的 `iteration-bindings.yaml`。

实现规则：

- 前端使用无构建静态 HTML、CSS 和浏览器原生 JavaScript。
- 页面必须支持加载现有配置、编辑配置、保存配置。
- 自动补齐只允许创建缺失的 `product.yaml`、`service.yaml` 或补充缺失字段。
- 自动补齐不得覆盖已有人工维护内容；遇到字段冲突时停止保存并提示人工处理。

安全边界：

- 不执行 `git checkout`。
- 不自动创建、删除或合并分支。
- 不自动提交。
- 不写 `.aiops/local/` 之外的临时状态。
- 只允许写当前项目的 `iteration-bindings.yaml`、缺失的 `product.yaml` 和缺失的 `service.yaml`。

## 11. 强制执行顺序

后续落地必须按以下顺序推进，不能先实现 CLI 再回补文档规则。

1. 更新 `CONTEXT.md` 术语。
   - 固化 Project Iteration、Product Version、Service Main Branch、Iteration Binding。
   - 不再引入微服务版本、本地文档分支副本或跨域文档层术语。

2. 更新 ADR。
   - 修改 `docs/adr/0003-project-level-knowledge-governance.md`。
   - 记录项目级 git origin repo 是提交边界。
   - 记录文档结构为项目、产品、微服务三级，不创建独立跨产品或跨微服务文档层。

3. 更新总 spec。
   - 修改 `docs/spec-aiops-governance-skills.md`。
   - 将 target structure、project config、bootstrap questions、hooks 预检改为迭代绑定模型。

4. 更新 schema reference。
   - 修改 `skills/aiops-knowledge-lifecycle/references/document-schema.md`。
   - 增加 `iteration-bindings.yaml`、`iterations/`、`products/`、`services/`。
   - 明确外部上下游调用关系写入产品或微服务自己的文档。

5. 更新 skills。
   - `aiops-governance-bootstrap`：初始化 products/services 和 `iteration-bindings.yaml`。
   - `aiops-daily-doc-maintenance`：维护前读取迭代绑定并检查源码分支。
   - `aiops-historical-project-intake`：识别产品、微服务和外部上下游调用关系。
   - `aiops-knowledge-review`：检查三级结构和迭代绑定完整性。

6. 实现 CLI schema 和文件读写。
   - 在 `packages/aiops-governance-cli` 增加 `iteration-bindings.yaml` 的解析、校验和写入能力。
   - 增加安全补齐 `product.yaml`、`service.yaml` 的逻辑。
   - 保证已有人工内容不被覆盖。

7. 实现 `config-ui` 子命令。
   - 启动本地 HTTP server。
   - 使用无构建静态 HTML 页面。
   - 支持加载、编辑、校验、预览、保存迭代绑定配置。

8. 更新 VuePress 知识库文章。
   - 解释项目、产品、微服务三级结构。
   - 解释项目迭代、产品版本、微服务主分支绑定。
   - 增加 `config-ui` 使用说明。

9. 验证。
   - 使用 Dockerized Node 流程构建 CLI。
   - 使用 Dockerized VuePress 构建文档站点。
   - 不在宿主机直接运行 `npm`、`npx`、`node` 或 `python`。

## 12. 需要修改的文件

后续落地时至少需要更新：

- `CONTEXT.md`
  - 新增 Project Iteration、Product Version、Service Main Branch、Iteration Binding 等术语。
- `docs/adr/0003-project-level-knowledge-governance.md`
  - 将 Product Domain 模型升级为 Project/Product/Service 三级治理对象。
  - 明确项目级 git origin repo 是提交边界。
- `docs/spec-aiops-governance-skills.md`
  - 更新 target workspace structure。
  - 更新 project config schema。
  - 更新 bootstrap questions。
  - 更新 hooks 和 semantic maintenance 的迭代绑定预检要求。
- `skills/aiops-knowledge-lifecycle/references/document-schema.md`
  - 更新 `.aiops/projects/<project>/` 目录结构。
  - 新增 iterations、products、services 的文档规则。
  - 明确不创建独立跨产品或跨微服务文档层。
- `skills/aiops-governance-bootstrap/SKILL.md`
  - 初始化问题从 product domains 扩展到 products 和 services。
- `skills/aiops-daily-doc-maintenance/SKILL.md`
  - 在维护前新增 `iteration-bindings.yaml` 读取和源码分支提醒。
- `skills/aiops-historical-project-intake/SKILL.md`
  - 历史项目入库时识别产品、微服务边界和外部上下游调用关系。
- `skills/aiops-knowledge-review/SKILL.md`
  - review 时检查三级结构和迭代绑定关系。
- `packages/aiops-governance-cli`
  - CLI schema、bootstrap question model、目录生成、`config-ui` 本地 HTTP server 和分支检查界面。
- `aiops-docs/docs/knowledge/**`
  - 更新面向人类的使用说明。

## 13. Review 结论

当前第一版项目级治理结构仍然有效，但粒度不足。它可以作为本次升级的基础，不需要推翻 `.aiops/projects/<project>/` 作为项目知识根的决策。

需要调整的核心是：

- `products` 不再只是扁平 product domain；它应成为项目下的一级治理对象。
- `services` 应成为产品下的二级治理对象。
- `iterations` 应承载项目迭代级文档。
- 外部上下游调用关系应写在相关产品或微服务自己的文档中。
- `iteration-bindings.yaml` 必须成为 LLM 修改 canonical docs 前的强制预检。
- 本地临时开发分支不进入文档版本模型，只触发提醒和人工确认。

## 14. 验收口径

后续实现完成后，应满足：

- 新项目初始化能生成 Project/Product/Service 三级文档骨架。
- `iteration-bindings.yaml` 能表达项目迭代、产品版本、微服务主分支。
- 单产品、单微服务文档都有明确落点。
- 外部上下游调用关系能在产品或微服务自己的文档中说明清楚。
- LLM 能在修改文档前输出项目迭代绑定关系。
- 本地源码分支与微服务主分支不一致时默认提醒，不静默按本地分支改写 canonical docs。
- Guides 站点仍能从项目级入口阅读项目、产品和微服务文档。
- 所有文档变更仍能提交到项目级 Git origin repo。
- CLI 提供 `config-ui` 子命令，通过本地浏览器页面维护 `iteration-bindings.yaml`。

## 15. 已确认规则

- 微服务只有主分支，产品只有版本；不定义微服务版本。
- `config-ui` 前端使用无构建静态 HTML，必须支持加载配置、编辑配置和保存配置。
- `config-ui` 保存时可以自动补齐缺失的 `product.yaml` 和 `service.yaml`，但不得覆盖已有人工维护内容。

## 16. 本轮不做

- 不修改现有 schema reference。
- 不修改 CLI。
- 不修改 hooks。
- 不修改 VuePress 站点。
- 不运行构建。
- 不执行 Git 分支或 worktree 操作。
