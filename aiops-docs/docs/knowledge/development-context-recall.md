# 文档召回辅助研发

文档召回辅助研发的目标，是让 coding agent 在写代码、调试、评审、解释和补测试之前，先通过人类阅读层理解项目业务，再通过源码、测试、配置、CodeGraph 和 Understand Anything 确认实现事实。

这和“日常文档维护”不同：维护文档是代码变更后把阅读层更新回来；文档召回辅助研发是代码变更前或变更中，把阅读层和图谱变成研发任务的上下文。

## 什么时候用

适合这些场景：

- 做功能前，需要理解产品目标、架构边界、业务流程和历史 ADR。
- 调 bug 前，需要理解业务语义、配置入口、数据流和验证路径。
- Code review 前，需要确认这次改动有没有违背既有设计。
- 写测试或解释代码前，需要知道产品和微服务上下文。
- 用户明确说“先看文档”“召回文档”“按 AIOps 知识库辅助研发”。

如果只是代码已经改完、需要同步阅读层，那应该进入[日常文档维护](./document-maintenance.md)。

## 召回顺序

Agent 不应该漫无目的地全文搜索。推荐顺序是：

1. 读取 `.aiops/projects/<project>/project.yaml`。
2. 读取 `.aiops/projects/<project>/iteration-bindings.yaml`。
3. 确认本次任务属于哪个项目迭代、产品和微服务。
4. 读取项目迭代阅读文档：`iterations/<project-iteration>/`。
5. 读取相关产品阅读文档：`products/<product>/{overview.md,architecture,workflows,adr}/`。
6. 读取相关微服务阅读文档：`products/<product>/services/<service>/{overview.md,architecture,workflows,adr}/`。
7. 读取 `open-questions.md`，确认有没有不确定约束。
8. 回到源码、测试、配置、迁移、manifest 和已有文档核验证据。
9. 使用 `codegraph` 查询 symbol、callers、callees、impact 和受影响测试。
10. 使用 `understand-anything` 图谱查看架构层、领域流和导览。
11. 必要时读取 `guides/docs/` 帮助人类叙事理解。

这个顺序的核心是：阅读层给业务地图，源码和图谱给实现事实。两者冲突时，以源码和图谱为准，并把阅读层漂移交给维护流程。

## 分支预检

服务级研发任务也要看 `iteration-bindings.yaml`：

```text
项目迭代 -> 产品版本 -> 微服务主分支
```

如果当前服务源码分支和绑定的 `required_branch` 不一致，agent 不能把阅读层当成本地分支现状直接使用。它应该说明：

```text
当前 <service> 在 <current branch>，但项目迭代 <iteration> 要求 <required_branch>。
我可以继续把阅读层作为目标迭代上下文参考，或你可以先切换源码分支。
```

这样可以避免把临时开发分支上的行为误写成目标迭代的事实，也避免 agent 按过期上下文修改代码。

## 输出什么

一次合格的召回不需要长篇总结。它应该给出足够执行当前任务的上下文：

- 当前项目迭代、产品、微服务和分支绑定。
- 本次任务相关的业务目标、架构边界、workflow、ADR 和开放问题。
- 需要重点核验的源码路径、测试路径、配置路径或图谱查询。
- CodeGraph / Understand Anything 中发现的调用关系或影响面。
- 已发现的阅读层漂移、开放问题或分支不一致风险。

小任务可以只在内部完成召回，然后直接进入实现；风险较高的任务应先把召回结果列出来，等人确认范围后再动代码。

## 和维护文档的关系

文档召回辅助研发默认不修改阅读层。它只把文档作为业务上下文，把源码和图谱作为实现事实。

如果研发过程中发现阅读层和源码不一致，有两种处理方式：

- 本次任务只做代码：把漂移记录在最终说明里；后续 push hook 会在分析提交时处理阅读层维护。
- 用户要求同步文档：转入 `aiops-daily-doc-maintenance`，按未分析提交、源码和图谱证据更新阅读层。

这样形成闭环：**研发前读阅读层，研发中按源码和图谱实现，研发后由维护流程更新阅读层。**
