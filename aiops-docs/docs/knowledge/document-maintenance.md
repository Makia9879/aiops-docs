# 维护文档

维护文档的目标，是让项目知识随着代码和任务变化持续更新，避免文档在生成后快速失效。这里的维护不是让人定期想起来改文档，而是通过 hooks 记录变化、提醒 agent 判断影响面，并按治理等级决定是否自动推进。

文档维护服务的是整个 workspace 的知识库治理。一次接口改动可能同时影响 specs、architecture 和 workflows；一次部署方式调整可能同时影响 architecture、workflows 和 guides。维护流程必须按语义更新上下文，而不是只改被点名的单篇文档。

## 维护入口

日常维护的输入是 `.aiops/diff-records/pending.md`。它是语义变更记录，不是结构化数据库，也不是精确补丁列表。

推荐结构：

```text
.aiops/diff-records/
  pending.md
  archived/
```

`pending.md` 是活动治理输入。`archived/` 保存历史记录，但不纳入后续主动治理范围。

Codex 和 Claude Code 的 hooks 只负责记录、提醒和触发维护，不直接改 canonical docs。真正修改文档的动作仍由 agent 根据 pending 语义、workspace 召回结果和治理等级执行。

## 语义维护流程

触发维护时，agent 应按固定步骤工作：

1. 查看 `.aiops/diff-records/pending.md`。
2. 总结语义，提炼关键词。
3. 用关键词在整个 workspace 召回文件和内容上下文。
4. 根据召回结果同步修改相关文档。
5. 按治理等级决定是否提交 git 变更。

这个流程的关键点是“跨文档一致性”。例如 interface 文档变化后，如果数据流、调用流程、部署说明或人类阅读指南也受影响，就必须一起更新。否则文档表面被维护了，实际知识库已经分裂。

## 治理等级

为了降低使用者配置负担，维护策略使用四个等级预设：

| 等级 | 行为 |
| --- | --- |
| `low` | 只记录变化，不自动提交。 |
| `medium` | 记录变化并温和提醒，不自动提交。 |
| `high` | 默认等级；记录变化、提醒维护，达到阈值后可自动维护并提交文档变更。 |
| `xhigh` | 更严格；更早触发维护，必要时可阻断继续工作，成功维护后自动提交文档变更。 |

自动提交只允许包含文档和治理文件，不应把源码改动混进自动文档提交。提交信息建议使用：

```text
docs(aiops): 更新 <project> 知识库
```

如果知识库语言配置为英文，则提交标题使用英文。

## Hooks 的职责边界

hooks 是工具机制，不是知识判断本身。它们适合做三件事：

1. 在任务开始时注入相关知识库上下文。
2. 在任务结束或 git diff 出现时追加 pending 记录。
3. 在 pending 累积到阈值时提醒或触发 agent 维护。

hooks 不应该直接重写 PRD、architecture、specs、adr、workflows。直接改正文需要理解语义、召回上下文、判断影响面，这一步应交给 coding agent 或 subagent。

Codex 和 Claude Code 的 hook 配置都应保持追加式、幂等式安装。已有配置存在时，只追加 AIOps 条目；条目已存在时跳过；配置无法解析时停止并让人确认。

## 人类阅读与 Agent 召回

维护时要同时照顾两类读者。agent 需要稳定路径、明确事实、可召回关键词和影响面；人需要连续叙事、导航和变更背景。

因此正文事实仍写入 canonical docs：

```text
prd/
architecture/
specs/
adr/
workflows/
```

人类阅读入口写入：

```text
guides/
```

当维护动作影响了人类理解路径，例如项目定位、主要流程、接入方式、开发入口变化，也应该同步更新 guides。`README.md` 只做索引，不承载长篇叙事。

## 完成标准

一次合格的维护应满足：

- pending 里的语义变更已被理解，而不是机械复制。
- 关键词召回覆盖了整个 workspace，而不只当前文件。
- 相关 PRD、architecture、specs、adr、workflows 已保持一致。
- 必要时更新 guides，保证人仍能读懂项目现状。
- git 提交只包含文档和治理文件，除非人类明确要求一起提交源码。
