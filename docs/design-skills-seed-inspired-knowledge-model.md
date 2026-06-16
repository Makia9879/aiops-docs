# Skills Seed Inspired Knowledge Model

Date: 2026-06-16

## 背景

本轮调整来自对 `silaswei-io/skills-seed` 的本地克隆分析：

```text
clone path: /private/tmp/skills-seed-aiops-docs-20260616
commit: 03b8a3e feat: apply git ignore in global file filter
```

这不是引入或包装 `skills-seed`，而是吸收它的工作原理，重构 AIOps 文档语义。

## Skills Seed 的工作原理

`skills-seed` 的核心流程是：

```text
init -> learn current / learn history -> curate patterns -> generate skills -> check
```

关键机制：

- `init` 建立本地 `.skills-seed` 配置、prompt 片段和存储。
- `learn current` 读取当前代码、目录、manifest、README 和结构化扫描结果，形成项目画像、模块、业务方法、工具方法和 patterns。
- `learn history` 读取 Git 提交历史，从长期反复出现的改动中学习团队规则。
- 候选 patterns 先经过策展和校验再入库；生成阶段只消费已入库数据，不在生成时临时合并或发明规则。
- `generate skills` 输出一个很薄的 `SKILL.md` 入口，再把完整信息放到 `references/`。Agent 按任务读取最小必要参考。
- `check` 用已学习 patterns 检查后续改动，并把命中反馈回规则质量。

它的设计重点不是“生成漂亮文档”，而是把真实代码、提交历史、检查命中和项目画像压缩成 agent 可加载的工作上下文。

## 对 AIOps 的迁移原则

AIOps 不直接使用 `skills-seed`，但照搬四个原则：

1. **Existing-code-first**：历史项目的事实从源码、测试、配置、提交历史、图谱和旧文档中提取。
2. **Thin entry, deep references**：入口文档只负责导航和召回，详细内容按项目、产品、微服务拆到稳定路径。
3. **Generate from stored facts**：维护文档时先读取本轮提交、图谱和已有阅读层，再更新文档；不要在写作阶段凭空补规则。
4. **Feedback-driven maintenance**：后续改动通过 git push hook 触发，Claude Code 像 `skills-seed learn history` 一样回顾未分析提交，维护结果再进入下一轮召回。

## 新的两层语义

### Agent 事实层

Agent 查看和验证事实时，优先使用：

- 源码、测试、配置、迁移、manifest、运行脚本。
- `codegraph` 的调用关系、调用方、被调用方和影响面。
- `understand-anything` 的项目结构、领域流和架构图谱。
- 最新 Git 提交和 diff。

这层替代原来的“agent 查看 Markdown canonical docs”。代码加图谱就是最好的可执行 spec，所以 Markdown 不再维护 `specs/` 目录作为事实源。

### 人类阅读层

`.aiops/projects/<project>/` 下的 Markdown 变成人类阅读层。它继承原 agent 文档的粒度：

- project iteration
- product
- service
- architecture
- workflows
- ADR
- open questions

但去掉 `specs/`。接口、配置、协议、数据结构、调用链、验证入口等实现细节应由源码、`codegraph` 和 `understand-anything` 召回；人类阅读层只写业务含义、边界、流程、决策、风险和导航，并链接到代码或图谱证据。

## 四个场景

### 1. 历史项目初始化文档

使用 `skills-seed` 的工作原理：

```text
读取已有代码和历史 -> 建立图谱/画像 -> 提炼业务边界和流程 -> 生成人类阅读层
```

这里不是执行 `skills-seed`，而是让 AIOps agent 通过 `understand-anything`、`codegraph`、源码、测试、旧文档和提交历史完成类似的“项目画像生成”。第一轮目标是让人能理解项目、产品、微服务、流程和决策；实现级 spec 留给代码和图谱。

### 2. 维护文档

维护触发逻辑参考 `skills-seed learn history`，但触发点改为 Git push：

```text
完成开发 commit -> git push -> push hook 启动 Claude Code -> 分析未分析提交 -> 更新人类阅读层 -> 写入提交分析游标
```

维护不再依赖 `pending.md` 和治理阈值。push hook 运行脚本启动 Claude Code 进程；Claude Code 读取项目主分支或绑定服务主分支上尚未分析的 Git commits，按提交顺序总结代码变化对业务流程、架构边界、ADR、上手路径的影响，只更新人类需要理解的部分。每完成一个 commit 分析，就在阅读层记录 commit hash 和 commit time；下次从该游标之后继续。

### 3. 新项目初始化

新项目没有既有代码，所以不能假装已有源码证据。流程是：

```text
用户引导 -> 初始化人类阅读层骨架 -> 记录假设和开放问题 -> 进入维护文档循环
```

代码出现后，后续维护从最新提交和图谱中替换假设。实现细节仍然回到源码和图谱，不在 Markdown `specs/` 中提前承诺。

### 4. Agent 召回

Agent 召回顺序调整为：

```text
先读人类阅读层了解业务 -> 再读源码 -> 再用 codegraph/understand-anything 召回调用关系、影响面和结构证据
```

人类阅读层给 agent 提供业务地图和术语；代码和图谱给 agent 提供实现事实。两者冲突时，以代码和图谱证据为准，并把阅读层漂移交给维护流程处理。

## 目录调整

目标结构：

```text
.aiops/projects/<project>/
  project.yaml
  iteration-bindings.yaml
  README.md
  open-questions.md
  commit-analysis.md

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
```

`guides/` 可以继续作为 VuePress 站点，但它与 `.aiops/projects/<project>/` 下的人类阅读文档不再是“事实源 vs 派生层”的关系，而是同一人类阅读层的站点呈现。
