# 文档召回辅助研发

`aiops-dev-context-recall` 在研发任务开始或进行中召回 AIOps canonical docs，帮助 agent 带着项目约束写代码、调试、评审、解释和补测试。

## 触发条件

- 你说“先看文档”“召回项目文档”“按知识库辅助研发”
- 你要求 agent 开发、调 bug、review、解释或写测试，并且当前 workspace 已接入 AIOps
- lifecycle 判断这是代码任务，但需要先理解项目上下文

## 执行步骤

1. 检查 `.aiops/governance.yaml`
2. 读取 `project.yaml`
3. 读取 `iteration-bindings.yaml`
4. 识别项目迭代、产品和微服务
5. 读取项目迭代、产品、微服务的 canonical docs
6. 读取 `open-questions.md`
7. 必要时读取 guides 作为阅读辅助
8. 回到源码、测试、配置和迁移核验证据
9. 输出本次研发需要遵守的约束和下一步证据路径

## 分支预检

服务级任务要检查 `code_root` 当前分支是否等于 `required_branch`。如果不一致，agent 必须说明当前分支和目标迭代分支的差异，不能把 canonical docs 静默当成本地分支事实。

## 输出

| 内容 | 说明 |
|-----|------|
| 项目迭代 | 当前任务对应的迭代和文档分支 |
| 产品/微服务 | 本次研发影响的治理对象 |
| 关键约束 | PRD、architecture、specs、ADR、workflow 中和任务相关的事实 |
| 证据路径 | 下一步需要读的源码、测试、配置或命令 |
| 风险 | open questions、文档漂移、分支不一致 |

## 边界

这个技能默认不改文档。发现文档漂移后，可以在代码任务结束后转入 `aiops-daily-doc-maintenance`，由维护流程更新 canonical docs 并归档 pending。
