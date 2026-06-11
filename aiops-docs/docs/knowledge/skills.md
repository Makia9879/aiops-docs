# 技能说明

AIOps 治理体系包含 7 个技能，覆盖知识库从创建、召回到维护的完整生命周期。

## 技能之间的关系

```
aiops-knowledge-lifecycle（总调度）
  ├── aiops-governance-bootstrap（治理初始化）
  ├── aiops-historical-project-intake（历史项目入库）
  ├── aiops-dev-context-recall（文档召回辅助研发）
  ├── aiops-daily-doc-maintenance（日常维护）
  ├── aiops-new-project-briefing（新项目初始化）
  └── aiops-knowledge-review（质量审查）
```

`aiops-knowledge-lifecycle` 是入口——它根据你的需求判断该调用哪个子技能。其他 6 个各管一个具体任务。

大多数情况下你不需要手动选择技能。对 agent 说"帮我整理项目知识库"或"检查知识库是否需要更新"，lifecycle 会自动路由到正确的子技能。

## 技能速查

| 技能 | 触发语 | 输入 | 输出 |
|-----|-------|------|------|
| [知识生命周期](./skills/aiops-knowledge-lifecycle.md) | "整理知识库""更新文档""审查知识"等 | 任何知识管理请求 | 路由到正确的子技能 |
| [治理引导](./skills/aiops-governance-bootstrap.md) | "初始化 AIOps""安装治理工具" | 当前目录 | `.aiops/` 治理结构 |
| [历史项目入库](./skills/aiops-historical-project-intake.md) | "整理这个项目的知识库" | 已有代码、文档 | 完整的项目知识文档 |
| [文档召回辅助研发](./skills/aiops-dev-context-recall.md) | "先召回文档""按知识库辅助研发" | 研发任务、canonical docs | 项目约束、证据路径和验证建议 |
| [日常文档维护](./skills/aiops-daily-doc-maintenance.md) | "更新文档""检查知识库" | pending 变更记录 | 更新后的关联文档 |
| [新项目简报](./skills/aiops-new-project-briefing.md) | "为新项目初始化知识库" | 需求、PRD、会议记录 | 项目知识骨架 |
| [知识审查](./skills/aiops-knowledge-review.md) | "审查知识库""检查文档质量" | 已有知识文档 | 审查报告和改进建议 |

## 每个技能一页说明

点击上方链接查看每个技能的详细说明，包括触发条件、执行步骤、输入输出和完成标准。
