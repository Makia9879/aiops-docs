# 历史项目生成 AIOps 文档

历史项目生成 AIOps 文档的目标，不是把仓库 README 重新总结一遍，而是把已有代码、文档、配置和图谱结果整理成一套 coding agent 可以持续使用的结构化知识库。

这个流程由 `aiops-historical-project-intake` skill 执行，配合 `aiops-knowledge-lifecycle` 中的共享规范完成。它适用于已有项目、遗留项目、开源项目或团队内部长期维护但缺少结构化知识沉淀的项目。

## 输入

历史项目整理通常需要以下输入：

- 项目源码目录，例如 `jzero/`
- 已有 README、docs、配置文件和测试
- 项目 manifest，例如 `go.mod`、`package.json`、`Cargo.toml`
- 可选的图谱工具输出，例如 `understand-anything` 的 knowledge graph
- 用户指定的目标知识库目录，例如 `knowledge/projects/jzero/`

如果用户只给出项目路径，skill 会先从源码和已有文档中识别项目边界、入口文件、模块结构和主要能力。

## 输出结构

历史项目最终会生成标准 AIOps 项目知识结构：

```text
knowledge/projects/<project>/
  00-project-card.md
  01-architecture.md
  02-domain-model.md
  03-capabilities.md
  04-workflows.md
  05-interfaces.md
  06-data-and-state.md
  07-operations.md
  08-extension-points.md
  09-maintenance-guide.md
  90-open-questions.md
```

这些文档优先服务 coding agent。每份文档都应尽量包含证据路径、影响范围、维护规则和验证方式。

## 执行流程

### 1. 识别项目和目标目录

skill 会先确认项目根目录和知识库输出目录。

以 `jzero` 为例：

```text
项目源码：jzero/
知识库目录：knowledge/projects/jzero/
```

如果目标目录不存在，skill 会按标准 schema 创建目录和文档。

### 2. 读取共享规范

`aiops-historical-project-intake` 不单独决定文档格式，而是读取 `aiops-knowledge-lifecycle` 的共享规范：

- `document-schema.md`：定义项目知识库文件结构
- `evidence-rules.md`：定义证据、引用、不确定性规则
- `toolchain.md`：定义 understand-anything、codegraph 和 fallback 探索方式
- `review-checklist.md`：定义最终质量检查

这样可以保证历史项目、新项目和日常维护使用同一套知识结构。

### 3. 建立项目理解上下文

优先使用图谱工具建立项目全局理解。

推荐流程：

```text
/understand <project-path> --full --language zh
/understand-domain
```

`understand-anything` 负责生成项目级知识图谱和领域流图，帮助 agent 快速识别模块、依赖、入口和流程。

预期产物：

```text
<project>/.understand-anything/knowledge-graph.json
<project>/.understand-anything/domain-graph.json
```

如果项目后续还需要频繁维护，可以再建立 codegraph 索引：

```bash
cd <project>
codegraph init -i
```

`codegraph` 更适合后续按问题定位源码和调用关系。

### 4. 收集证据源

skill 会按证据优先级收集材料：

1. 源码和测试
2. manifest、配置、构建脚本、迁移文件
3. 现有项目文档
4. 图谱工具输出
5. 用户补充说明

每个重要结论都应能回到某个源码路径、配置路径、文档路径或图谱节点。

对 `jzero` 这类 Go CLI 项目，重点证据通常包括：

```text
jzero/cmd/jzero/main.go
jzero/cmd/jzero/internal/command/
jzero/core/
jzero/docs/src/
jzero/README.md
jzero/README.zh-CN.md
jzero/go.mod
```

### 5. 先生成核心文档

历史项目第一轮不追求一次填满所有内容，而是先生成最能帮助 agent 理解项目的核心文档：

- `00-project-card.md`：项目定位、边界、技术栈、证据来源
- `01-architecture.md`：入口、模块、分层、依赖方向
- `03-capabilities.md`：能力清单和功能地图
- `04-workflows.md`：关键流程、步骤、源码路径和副作用

这四份文档决定后续 agent 是否能快速进入项目。

### 6. 补齐维护型文档

核心文档稳定后，再补齐其余文档：

- `02-domain-model.md`：项目术语、领域概念、实体关系
- `05-interfaces.md`：CLI、API、事件、配置和文件格式
- `06-data-and-state.md`：数据、状态、缓存、生成产物、迁移
- `07-operations.md`：安装、构建、测试、运行、发布、排障
- `08-extension-points.md`：插件、模板、hook、adapter 和扩展边界
- `09-maintenance-guide.md`：coding agent 修改规则、影响面、验证命令
- `90-open-questions.md`：证据不足、待确认、需要人工决策的问题

这些文档不是补充说明，而是后续 daily maintenance 的基础。

## 证据规则

历史项目整理必须避免“看起来合理但没有证据”的总结。

skill 使用四类不确定性标签：

- `Confirmed`：源码、测试、配置或文档直接证明
- `Inference`：多个弱信号支持，但不是直接事实
- `Assumption`：用户或 agent 的假设，需要确认
- `Unknown`：当前没有可靠证据

如果某个结论不能被确认，应写入 `90-open-questions.md`，而不是混进正文。

## 质量检查

完成第一轮文档后，运行 `aiops-knowledge-review` 做检查。

检查重点：

- schema 是否完整
- 关键结论是否有证据路径
- 文档是否真正服务 coding agent
- 是否记录了入口、影响面和验证方式
- 是否存在代码与文档冲突
- 是否把不确定内容写入 open questions
- 是否避免了 README 式营销总结

如果发现问题，优先修正文档结构和证据，而不是继续扩写内容。

## 推荐 Prompt

可以这样安排 agent 执行历史项目整理：

```text
使用 aiops-historical-project-intake，把 jzero 整理成 AIOps 结构化知识库。

项目路径：jzero/
输出目录：aiops-docs/docs/knowledge/projects/jzero/

要求：
1. 优先使用 understand-anything 建立项目图谱。
2. 关键结论必须引用源码、配置或已有文档路径。
3. 第一轮先生成 00-project-card.md、01-architecture.md、03-capabilities.md、04-workflows.md。
4. 面向 coding agent 写，不写营销介绍。
5. 不确定内容写入 90-open-questions.md。
```

如果图谱工具不可用，可以要求 agent 使用 fallback：

```text
如果 understand-anything 或 codegraph 不可用，使用 rg、rg --files、manifest 和源码入口做本地探索，并在文档中说明图谱工具不可用带来的置信度限制。
```

## 结果标准

一份合格的历史项目 AIOps 文档，应让新的 coding agent 能回答以下问题：

- 这个项目解决什么问题，不解决什么问题？
- 入口文件在哪里？
- 核心模块如何分层？
- 主要能力有哪些？
- 关键流程经过哪些源码文件？
- 对外接口、命令、配置和文件格式是什么？
- 哪些地方可以扩展？
- 修改某类功能时应该看哪些文件？
- 修改后应该如何验证？
- 哪些信息还没有证据，需要人工确认？

达到这些标准后，历史项目就从“只能靠人肉理解的代码仓库”，转变成了可以被 coding agent 持续维护的 AIOps 知识资产。
