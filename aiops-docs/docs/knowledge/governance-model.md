# 治理模型

前面几篇文章讲了四个核心场景：历史项目入库、文档召回辅助研发、日常维护、新项目初始化。这篇文章把视角拉回来，讲它们背后的治理机制：治理等级怎么选、Hook 做什么不做什么、三级阅读层怎么落点、工具链怎么配合。

## 两层模型

AIOps 新模型把“人理解项目”和“agent 验证实现”分开：

| 层次 | 作用 | 载体 |
| --- | --- | --- |
| 人类阅读层 | 项目意图、产品边界、服务职责、架构、流程、ADR、风险、开放问题 | `.aiops/projects/<project>/`、`guides/` |
| Agent 事实层 | 接口、配置、数据结构、调用链、影响面、验证入口、实现行为 | 源码、测试、配置、Git 历史、CodeGraph、Understand Anything |

旧模型里的 Markdown `specs/` 被移除。代码加 CodeGraph 是实现 spec；Markdown 只保留人需要理解和维护的语义。

## 治理等级

不同团队对文档治理的强度需求不同。AIOps 用四个等级来控制自动化程度：

| 等级 | push hook 行为 | 自动提交文档 | 阻断 push |
|------|---------------|------------|----------|
| `low` | 只提示存在未分析提交 | 不自动 | 不阻断 |
| `medium` | 启动维护，但提交前询问 | 不自动 | 不阻断 |
| `high`（默认） | 启动 Claude Code 分析未分析提交 | 可自动提交文档 | 不阻断 |
| `xhigh` | 启动 Claude Code，失败时可阻断 | 可自动提交文档 | 可阻断 |

### 怎么选

- **low**：适合快速原型阶段，push hook 只提示有未分析提交，不自动维护。
- **medium**：适合小团队，push hook 可启动维护，但提交阅读层变更前要人确认。
- **high**：默认推荐。push hook 启动 Claude Code 分析未分析提交，并在安全时提交文档 Git。
- **xhigh**：适合对阅读层一致性要求极高的项目。维护失败或游标无法推进时可以阻断 push。

### 自动提交的范围

不管哪个等级，自动提交都有限制：

- 只提交 `.aiops/` 下的人类阅读层、治理文件和 `guides/`
- 不自动提交源码、配置、测试的改动
- 提交信息使用 `docs(aiops): 更新 <project> 阅读层` 格式

这个限制的原因是：文档维护不应该和代码变更混在同一个自动提交里。代码提交是人控制的，阅读层维护是系统控制的，分开才能追溯。

## Hook 机制

Hook 是连接代码活动和阅读层维护的桥梁。维护触发点是源码仓库的 `git push`。源码仓库和文档仓库可以是两套 Git；源码仓库通过本机 `.aiops-docs.yaml` 指向文档仓库，push hook 启动文档仓库中的 Claude Code 维护流程。

### Hook 做什么

两个入口各司其职：

| Hook | 触发时机 | 做什么 |
|------|---------|--------|
| `aiops_inject_context` | 任务开始时 | 注入项目入口、迭代绑定、阅读层导航和图谱工具提示 |
| `aiops_push_maintenance` | `git push` 前 | 启动 Claude Code，分析未分析提交并维护阅读层 |

### Hook 不做什么

这个边界很重要：**Hook 不改文档**。它不打开阅读层文档往里写内容，不更新架构图，不生成 ADR。

原因是 Hook 运行在受限的时机和上下文里。它只知道 push 范围和 Git refs。理解语义、读取提交 diff、召回源码和图谱、判断怎么更新，这些由 Claude Code 维护任务在完整技能流程里做。

如果 Claude Code runner 不可用，hook 应按治理等级报告失败或阻断 push；不能伪造提交分析记录，也不能推进 `commit-analysis.md`。

## 三级阅读层结构

项目级知识根仍是 `.aiops/projects/<project>/`，但其中的 Markdown 是人类阅读层：

```text
.aiops/projects/<project>/
  iterations/<project-iteration>/
    overview.md
    architecture.md
    release-scope.md
    risks.md
  products/<product>/
    overview.md
    architecture/
    workflows/
    adr/
    services/<service>/
      overview.md
      architecture/
      workflows/
      adr/
```

项目级文档描述项目迭代、产品范围、共同约束和交付风险。产品级文档描述产品版本、能力边界、产品内微服务划分和产品级流程。微服务级文档描述单个代码服务的职责、运行角色、关键流程和决策。

外部上下游关系不创建独立跨域文档层。由发起调用或承载业务依赖的一方在自己的产品或微服务文档中说明业务关系、责任边界和源码/图谱导航；调用入口、协议、错误口径和验证路径由源码和图谱确认。

## 阅读文档的写法

### Overview

写的是**这个对象是什么、为什么存在、服务谁、不服务谁**。

- 写：项目/产品/服务的定位、能力边界、主要参与方
- 不写：接口字段、配置项逐项说明、函数级实现
- 关联：指向 architecture、workflows、ADR 和源码入口

### Architecture

写的是**系统长什么样**。

- 写：系统边界、产品关系、模块职责、依赖方向、数据流、部署形态
- 不写：单条 API 的参数细节、函数内部执行顺序
- 关联：指向 CodeGraph / Understand Anything 查询和关键源码目录

### Workflows

写的是**端到端业务流程**。

- 写：触发条件、参与模块、数据流转、异常路径、对应源码和图谱导航
- 不写：单个函数的完整执行细节
- 关联：经过 architecture 中的模块，由源码和图谱确认实现路径

### ADR

写的是**已经做出的选择和背后的权衡**。

- 写：决策背景、备选方案、选择理由、后果和限制
- 不写：待讨论想法，待讨论内容放 `open-questions.md`
- 关联：被 overview、architecture 和 workflows 引用

### Open Questions

写的是**证据不足或需要人确认的内容**。

- 写：旧文档与源码冲突、缺少证据的业务解释、分支不一致确认
- 不写：已被源码和图谱明确证明的事实

## 证据优先级

阅读层里的说法要有依据，尤其是从历史项目逆向生成的知识。依据分五个等级：

1. **源码、测试、迁移脚本、配置文件、构建脚本**。
2. **Git 历史和最新提交**。
3. **图谱工具结果**：CodeGraph、Understand Anything。
4. **已有 README、设计文档、接口文档**。
5. **人的补充说明**。

一条底线：**不能证明的内容不要写成人类阅读层里的确认事实**。放进 `open-questions.md`，标注哪些是推测、需要什么证据来确认。

## 迭代绑定

文档维护以项目迭代为锚点，绑定关系写在 `.aiops/projects/<project>/iteration-bindings.yaml`：

```text
项目迭代 -> 产品版本 -> 微服务主分支
```

Agent 修改阅读层前，应先读取 `project.yaml` 和 `iteration-bindings.yaml`，解析本次迭代包含的产品版本和微服务主分支。产品只定义版本，微服务只定义主分支；不定义微服务版本，也不把本地临时源码分支写入配置。

如果受影响微服务的本地源码分支与 `required_branch` 不一致，默认提醒人工切换源码分支或确认继续。确认后维护结果仍归属该项目迭代，不为本地临时分支创建文档版本。

## 工具链

CLI 在安装技能时，会检查并可自动补齐三个辅助工具：

| 工具 | 用途 |
|------|------|
| CodeGraph | Agent 事实层：代码调用关系、调用方、被调用方和影响范围 |
| Understand Anything | Agent 事实层：从源码提炼项目结构、架构层和业务概念 |
| Trellis | 任务执行和上下文注入层（辅助，不作为事实源） |

安装程序会先汇总本地工具链版本和缺失项，交互式终端询问是否自动补齐；带 `--yes` 时自动补齐。可以跳过工具链安装（`--with none`）或选择性安装（`--with codegraph,trellis`）。

### Trellis 的定位

Trellis 在这里是一个辅助工具。明确分工：

- `.aiops/projects/<project>/`：人类阅读层
- 源码 + CodeGraph + Understand Anything：Agent 事实层
- `.trellis/spec/`：任务执行用的操作描述
- `.trellis/tasks/`：任务执行记录和证据
- `.trellis/workspace/`：会话记忆，不作为事实来源

Trellis 中要进入阅读层的信息，需要经过 agent 判断和人类确认，不能直接把临时任务状态当事实。
