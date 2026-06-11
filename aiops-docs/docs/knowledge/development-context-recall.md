# 文档召回辅助研发

文档召回辅助研发的目标，是让 coding agent 在写代码、调试、评审、解释和补测试之前，先拿到项目知识库里的约束和证据，而不是只靠当前打开的几个源码文件猜上下文。

这和“日常文档维护”不同：维护文档是代码变更后把知识库更新回来；文档召回辅助研发是代码变更前或变更中，把 canonical docs 变成研发任务的上下文。

## 什么时候用

适合这些场景：

- 做功能前，需要确认 PRD、架构边界、接口契约和历史 ADR。
- 调 bug 前，需要理解业务流程、配置项、数据模型和验证入口。
- Code review 前，需要确认这次改动有没有违背既有设计。
- 写测试或解释代码前，需要知道产品和微服务上下文。
- 用户明确说“先看文档”“召回文档”“按 AIOps 知识库辅助研发”。

如果只是代码已经改完、需要同步知识库，那应该进入[日常文档维护](./document-maintenance.md)。

## 召回顺序

Agent 不应该漫无目的地全文搜索。推荐顺序是：

1. 读取 `.aiops/projects/<project>/project.yaml`。
2. 读取 `.aiops/projects/<project>/iteration-bindings.yaml`。
3. 确认本次任务属于哪个项目迭代、产品和微服务。
4. 读取项目迭代文档：`iterations/<project-iteration>/`。
5. 读取相关产品文档：`products/<product>/{prd,architecture,specs,workflows,adr}/`。
6. 读取相关微服务文档：`products/<product>/services/<service>/{architecture,specs,workflows,adr}/`。
7. 读取 `open-questions.md`，确认有没有不确定约束。
8. 必要时读取 `guides/docs/` 帮助人类叙事理解，但不把 guides 当事实源。
9. 回到源码、测试、配置、迁移、manifest 和已有文档核验证据。

这个顺序的核心是：先确定治理对象和迭代绑定，再按项目、产品、微服务逐层缩小范围，最后用源码验证。

## 分支预检

服务级研发任务也要看 `iteration-bindings.yaml`：

```text
项目迭代 -> 产品版本 -> 微服务主分支
```

如果当前服务源码分支和绑定的 `required_branch` 不一致，agent 不能把 canonical docs 当成本地分支现状直接使用。它应该说明：

```text
当前 <service> 在 <current branch>，但项目迭代 <iteration> 要求 <required_branch>。
我可以继续把文档作为目标迭代上下文参考，或你可以先切换源码分支。
```

这样可以避免把临时开发分支上的行为误写成目标迭代的事实，也避免 agent 按过期上下文修改代码。

## 输出什么

一次合格的召回不需要长篇总结。它应该给出足够执行当前任务的上下文：

- 当前项目迭代、产品、微服务和分支绑定。
- 本次任务相关的 PRD、architecture、specs、ADR、workflow 约束。
- 需要重点核验的源码路径、测试路径、配置路径或命令。
- 已发现的文档漂移、开放问题或分支不一致风险。

小任务可以只在内部完成召回，然后直接进入实现；风险较高的任务应先把召回结果列出来，等人确认范围后再动代码。

## 和维护文档的关系

文档召回辅助研发默认不修改 canonical docs。它只把文档作为研发上下文。

如果研发过程中发现文档和源码不一致，有两种处理方式：

- 本次任务只做代码：把漂移记录在最终说明里，hook 会把有语义价值的事件写入 pending。
- 用户要求同步文档：转入 `aiops-daily-doc-maintenance`，按 pending 语义和源码证据更新 canonical docs。

这样形成闭环：**研发前召回知识，研发中按知识约束实现，研发后由维护流程更新知识库。**
