# 维护文档

维护文档的目标，是让项目知识随着代码和任务变化持续更新，避免文档在生成后快速失效。维护通过 hooks 记录变化、提醒 agent 判断影响面，并按治理等级决定是否自动推进。

文档维护服务的是整个 workspace 的知识库治理。一次接口改动可能同时影响微服务 specs、产品 architecture、项目迭代 release scope 和 guides；一次部署方式调整可能同时影响项目、产品和微服务多个层级。维护流程按语义更新上下文，沿着关联链路更新所有受影响的文档。

## 维护入口

日常维护的输入是文档仓库里的 `.aiops/diff-records/pending.md`。它记录的是 hook 捕获到的 agent 运行轨迹摘要，例如用户目标、工具输出、final output、subagent summary、源码仓库位置和分支提示。它不是完整源码 diff，也不是要求 coding LLM 主动填写的结束表单。

推荐结构：

```text
.aiops/diff-records/
  pending.md
  archived/
```

`pending.md` 是活动治理输入。`archived/` 保存历史记录，但不纳入后续主动治理范围。

Codex 和 Claude Code 的 hooks 只负责记录、提醒和触发维护，不直接改 canonical docs。达到治理阈值后，hook 会启动 Claude Code 执行维护；如果 Claude Code 不可用，只把 fallback prompt 输出给当前 coding LLM，让当前 LLM 使用 subagent 维护，不把 runner 故障追加进 `pending.md`。

hook runner 的执行环境是 Docker-first：优先用临时 Python 容器运行记录和触发脚本；源码开发或外部用户环境缺 Docker 时，可降级到本机 `python3` / `python`，但仍只记录 agent event summary，不记录 runner 降级噪音。

如果代码和文档是两套 Git，源码仓库只需要一个本机指针文件：

```yaml
docs_repo: /path/to/aiops-docs
```

这个文件是源码仓库根目录的 `.aiops-docs.yaml`，默认和生成的 `.aiops-hook-runner.sh` 一起加入源码仓库 `.gitignore`。源码仓库不复制完整 `.aiops/`；pending、canonical docs、归档和文档 Git 提交都发生在文档仓库。

## 语义维护流程

触发维护时，agent 应按固定步骤工作：

1. 查看 `.aiops/diff-records/pending.md`。
2. 总结语义，提炼关键词。
3. 识别影响范围：项目、产品、微服务。
4. 识别或询问当前项目迭代。
5. 读取 `.aiops/projects/<project>/project.yaml` 和 `iteration-bindings.yaml`。
6. 根据项目迭代解析产品版本和微服务主分支。
7. 检查受影响微服务源码当前分支是否等于 `required_branch`。
8. 用关键词在整个 workspace 召回文件和内容上下文。
9. 根据召回结果同步修改相关 canonical docs，必要时同步 guides。
10. 按治理等级决定是否提交文档 Git 变更。

这个流程的关键点是“跨文档一致性”。例如 interface 文档变化后，如果数据流、调用流程、部署说明或人类阅读指南也受影响，就必须一起更新。否则文档表面被维护了，实际知识库已经分裂。

## 分支预检

维护 canonical docs 前必须先读取 `.aiops/projects/<project>/iteration-bindings.yaml`。它声明本轮项目迭代对应的产品版本和微服务主分支。

微服务级维护需要检查：

```text
service code root = iteration-bindings.yaml 中该服务的 code_root
required branch = iteration-bindings.yaml 中该服务的 required_branch
current branch = git -C <code_root> branch --show-current
```

如果 `current branch != required_branch`，默认不修改 canonical docs。Agent 应提醒人工切换源码分支，或确认本次文档仍基于该项目迭代维护。人工确认后可以继续，但维护总结中要记录确认原因。

## 治理等级

为了降低使用者配置负担，维护策略使用四个等级预设：

| 等级 | 行为 |
| --- | --- |
| `low` | 只记录变化，不自动提交。 |
| `medium` | 记录变化并温和提醒，不自动提交。 |
| `high` | 默认等级；pending 达到阈值后异步启动 Claude Code 维护，成功后可提交文档变更。 |
| `xhigh` | 更严格；只要存在 pending 就同步启动 Claude Code 维护，成功后默认提交文档变更。 |

自动提交只允许包含文档和治理文件，不应把源码改动混进自动文档提交。提交信息建议使用：

```text
docs(aiops): 更新 <project> 知识库
```

如果知识库语言配置为英文，则提交标题使用英文。

## Hooks 的职责边界

hooks 是工具机制，负责记录和触发。它们适合做三件事：

1. 在任务开始时注入相关知识库上下文。
2. 在有语义价值的 hook event 出现时追加 pending 记录。
3. 在 pending 累积到阈值时调用 Claude Code 维护，或在不可用时提示当前 LLM 使用 subagent。

hooks 不应该直接重写 PRD、architecture、specs、adr、workflows。直接改正文需要理解语义、召回上下文、判断影响面，这一步应交给 Claude Code 维护任务或当前 LLM 启动的 subagent。

Codex 和 Claude Code 的 hook 配置都应保持幂等安装。已有配置存在时，只追加或更新 AIOps 条目；配置无法解析时停止并让人确认。

## 人类阅读与 Agent 召回

维护时要同时照顾两类读者。agent 需要稳定路径、明确事实、可召回关键词和影响面；人需要连续叙事、导航和变更背景。

因此正文事实仍写入 canonical docs：

```text
iterations/<project-iteration>/
products/<product>/
products/<product>/services/<service>/
```

人类阅读入口写入：

```text
guides/
```

当维护动作影响了人类理解路径，例如项目定位、主要流程、接入方式、开发入口变化，也应该同步更新 guides。`README.md` 只做索引，不承载长篇叙事。

## 完成标准

一次合格的维护应满足：

- pending 里的语义变更已被充分理解。
- 已确认项目迭代、产品版本和微服务主分支绑定。
- 受影响微服务的源码分支已通过预检，或已有人工确认继续维护。
- 关键词召回覆盖了整个 workspace，而不只当前文件。
- 相关 PRD、architecture、specs、adr、workflows 已保持一致。
- 必要时更新 guides，保证人仍能读懂项目现状。
- git 提交只包含文档和治理文件，除非人类明确要求一起提交源码。
