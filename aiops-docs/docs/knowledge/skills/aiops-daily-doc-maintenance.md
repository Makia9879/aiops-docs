# 日常文档维护

`aiops-daily-doc-maintenance` 在 `git push` 时由 push hook 启动，分析未处理的 Git 提交，并更新所有受影响的人类阅读文档。

## 触发条件

- 源码仓库执行 `git push`，push hook 启动 Claude Code 维护
- 你主动要求："分析未处理的提交并更新文档"
- 维护失败后需要重跑某个 source repo + branch 的提交分析

## 维护输入

维护不再使用 `pending.md` 队列，也不再按 pending 阈值触发。

输入来自：

- push hook 传入的 source repo、branch、old commit、new commit
- `.aiops/projects/<project>/commit-analysis.md`
- 未分析 Git commits
- 源码、测试、配置、manifest、CodeGraph、Understand Anything

## 执行步骤

1. 读取 `project.yaml` 和 `iteration-bindings.yaml`
2. 读取 `commit-analysis.md`
3. 确认 source branch 是项目主分支或服务 `required_branch`
4. 找出该 source repo + branch 上次已分析 commit
5. 列出游标之后的未分析 commits
6. 按时间顺序逐个分析 commit
7. 对每个 commit 判断是否影响 overview、architecture、workflows、ADR、risks、guides 或 open-questions
8. 更新阅读层
9. 每分析完一个 commit，写入 commit hash 和 commit time

## 主分支原则

一切基于原来的项目主分支原则来做。

- 项目级文档基于 `docs_branch`
- 服务级文档基于 `required_branch`
- feature branch 不创建新文档版本
- 分支不匹配时不推进 `commit-analysis.md`

## 关键原则

### 提交语义优先

维护不是按文件名替换文字。Agent 要看 commit message、diff、源码上下文和图谱影响面，判断这个提交是否改变了人需要理解的业务流程、架构边界、ADR 或上手路径。

### 每个提交独立推进

Claude Code 每完成一个 commit 分析，就在 `commit-analysis.md` 记录 commit hash 和 commit time。后续失败不会导致已经完成的提交重复分析。

### 不写 specs

接口、CLI、配置、协议和数据结构变化不进入 Markdown specs。只有当它们影响人类理解时，才更新 reading docs，并通过源码和 CodeGraph 指向实现事实。

## 完成标准

一次合格的维护应该满足：

- 已读取提交分析游标
- 未分析 commits 已按时间顺序处理
- 只基于主分支或绑定服务主分支维护
- 所有完成分析的 commits 都记录了 hash 和 commit time
- 相关 overview、architecture、workflows、ADR、guides 已保持一致
- 失败时没有错误推进游标
