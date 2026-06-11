# 知识生命周期（总调度）

`aiops-knowledge-lifecycle` 是所有 AIOps 知识管理任务的入口。它不亲自干活——它根据你的需求判断该调用哪个子技能。

## 触发条件

当你对 agent 说以下任何话时，lifecycle 会被触发：

- "帮我整理项目知识库"
- "先召回文档辅助研发"
- "更新一下文档"
- "检查知识库有没有问题"
- "为新项目建一套知识文档"
- "install / init / setup"

## 执行逻辑

```
你说"先召回文档辅助研发"
  → lifecycle 被触发
    → 检查当前目录有没有 .aiops/governance.yaml
      → 有 → 判断你的意图（入库？研发召回？维护？审查？）
        → 路由到对应的子技能
      → 没有 → 先调用 governance-bootstrap 初始化
        → 然后再路由到对应子技能
```

## 路由规则

| 你说的话包含... | lifecycle 路由到 |
|--------------|----------------|
| "整理""入库""历史""老项目" | `aiops-historical-project-intake` |
| "开发""调试""评审""解释""测试""召回""辅助研发" | `aiops-dev-context-recall` |
| "更新""维护""同步""pending" | `aiops-daily-doc-maintenance` |
| "新建""初始化""新项目""briefing" | `aiops-new-project-briefing` |
| "审查""检查""review""质量" | `aiops-knowledge-review` |
| "安装""init""setup""bootstrap" | `aiops-governance-bootstrap` |

## 你不需要手动选择

大多数情况下你对 agent 说的话就是日常工作语境——"帮我看看知识库要不要更新"、"把这次的改动同步到文档里"。lifecycle 自己判断该用哪个技能。

只有在你明确知道要用哪个技能时，才需要直接说技能名称，比如"执行 knowledge-review 检查一下文档完整性"。

## 共享资源

不管路由到哪个子技能，它们都共享同一套基础资源：

- **文档结构规范**：五类文档（PRD/Architecture/Specs/ADR/Workflows）的写法约定
- **证据规则**：怎么判断一个说法是否可以写入 canonical 文档
- **审查清单**：文档质量检查项
- **工具链**：CodeGraph、Understand Anything、Trellis 的使用约定
