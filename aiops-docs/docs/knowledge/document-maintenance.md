# 维护文档

维护文档的目标，是让人类阅读层随着代码提交持续更新。新模型不再使用 `pending.md + 阈值触发`，而是使用 **Git push hook + Claude Code 提交分析游标**。

核心流程：

```text
完成代码开发 -> 创建 commit -> git push -> push hook 启动 Claude Code
  -> Claude Code 回顾未分析提交 -> 总结并更新阅读层
  -> 每分析完一个提交，记录 commit hash 和 commit time
```

## 维护入口

日常维护由源码仓库的 git push hook 触发。Hook 运行一个本地脚本，脚本从源码仓库定位 AIOps 文档仓库，然后启动 Claude Code 进程执行 `aiops-daily-doc-maintenance`。

维护输入包括：

1. push hook 传入的 source repo、local ref、remote ref、old commit、new commit。
2. `.aiops/projects/<project>/commit-analysis.md` 中记录的上次已分析提交。
3. 当前项目主分支或绑定微服务主分支上的未分析 commits。
4. 源码、测试、配置、manifest、Git diff、CodeGraph、Understand Anything。

`pending.md` 不再作为维护队列；治理等级也不再通过 pending 阈值触发维护。

## 提交分析游标

每个项目维护一个提交分析记录：

```text
.aiops/projects/<project>/commit-analysis.md
```

推荐结构：

```md
# Commit Analysis

| Source repo | Branch | Commit | Commit time | Project | Product | Service | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /path/to/service | main | abc1234 | 2026-06-16T10:30:00+08:00 | cert | ca | ca-admin | updated workflows |
```

Claude Code 每完成一个 commit 分析，就写入该 commit 的 hash 和 commit time。下一次 push hook 启动时，从该 source repo + branch 的最后一条记录之后继续分析。

如果某个 commit 因分支不匹配、证据不足或 Claude Code 失败而没有完成分析，不推进游标。这样下次仍会从该 commit 开始。

## 主分支原则

一切基于原来的项目主分支原则来做：

- 项目级文档维护基于 `iteration-bindings.yaml` 中的 `docs_branch`。
- 服务级文档维护基于该服务的 `required_branch`。
- push 到 feature branch 或本地临时分支时，不创建新的文档版本。
- 如果当前分支不是绑定主分支，默认不更新阅读层，也不推进 `commit-analysis.md`。

这避免把临时开发分支上的行为误写成项目主线事实。

## 执行流程

Claude Code 被 push hook 启动后，应按固定步骤工作：

1. 读取 `.aiops/projects/<project>/project.yaml`。
2. 读取 `.aiops/projects/<project>/iteration-bindings.yaml`。
3. 读取 `.aiops/projects/<project>/commit-analysis.md`。
4. 根据 source repo 和 branch 找到上次已分析 commit。
5. 枚举上次游标之后、当前 push 范围内的未分析 commits。
6. 按 commit 时间从旧到新逐个分析。
7. 对每个 commit：
   - 读取 commit message、commit time、changed files 和 diff。
   - 读取必要源码、测试、配置和旧文档。
   - 使用 CodeGraph / Understand Anything 判断调用关系、影响面和架构变化。
   - 判断是否影响人类阅读层。
   - 更新 overview、architecture、workflows、ADR、risks、guides 或 open-questions。
   - 写入 `commit-analysis.md`，记录 commit hash 和 commit time。

这个流程参考 `skills-seed learn history`：不是每次重新理解整个项目，而是从未分析的 Git 历史增量学习并更新文档。

## 维护范围

| 变更类型 | 更新范围 |
| --- | --- |
| 项目迭代范围、交付风险、共同约束变化 | `iterations/<project-iteration>/` |
| 产品目的、能力或边界变化 | `products/<product>/overview.md` |
| 架构、模块、依赖、数据流变化 | `architecture/` |
| 业务流程、操作流程、维护流程变化 | `workflows/` |
| 架构决策、取舍或后果变化 | `adr/` |
| 人类上手路径变化 | `guides/docs/` |
| 证据不足或分支不匹配 | `open-questions.md` |

接口、CLI、配置、协议、数据结构变化不写 Markdown specs。它们只在影响人类理解时更新阅读层，并通过源码和图谱验证实现细节。

## Hooks 的职责边界

push hook 适合做三件事：

1. 在 `git push` 前定位文档仓库和项目配置。
2. 启动 Claude Code 维护进程。
3. 把 push 范围、source repo、branch、old/new commit 传给维护进程。

push hook 不应该直接改文档，不应该总结业务语义，也不应该推进 `commit-analysis.md`。这些都由 Claude Code 完成。

## 完成标准

一次合格的维护应满足：

- 已读取项目配置、迭代绑定和提交分析游标。
- 只分析主分支或绑定服务主分支上的提交。
- 未分析 commits 已按时间顺序处理。
- 每个完成分析的 commit 都记录了 hash 和 commit time。
- 相关 overview、architecture、workflows、ADR、risks 或 guides 已保持一致。
- 没有新增 Markdown `specs/` 作为实现事实源。
- 若维护失败，没有错误推进提交游标。
