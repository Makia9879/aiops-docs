# 日常文档维护

`aiops-daily-doc-maintenance` 根据代码变更的语义记录，做跨文档一致性更新。它理解变更的影响面，更新所有受影响的文档。

## 触发条件

- Hook 自动触发：pending 记录累积到阈值时
- 你说"更新一下文档"、"同步知识库"、"检查哪些文档需要改"
- 定期例行维护（取决于治理等级）

## 维护输入

维护的起点是 `.aiops/diff-records/pending.md`。这是一份语义变更记录，每条描述"什么变了"和"可能影响什么"。

Hook 负责往 pending 里追加记录。Agent 负责读取 pending、理解语义、执行跨文档更新。

## 执行步骤

1. 读取 `.aiops/diff-records/pending.md`
2. 理解变更的语义——不只是"接口 X 的参数改了"，而是"这个改动意味着什么"
3. 识别影响范围：项目、产品、微服务
4. 读取 `.aiops/projects/<project>/iteration-bindings.yaml`，确认项目迭代、产品版本和微服务主分支
5. 对受影响微服务执行分支预检：当前源码分支必须等于绑定的 `required_branch`，否则提醒人工切换或确认
6. 提炼关键词，在整个 workspace 里搜索受影响的内容
7. 确定哪些文档需要更新：

| 变更类型 | 更新范围 |
|---------|---------|
| 项目迭代范围或交付风险变更 | `iterations/<project-iteration>/` |
| 产品需求或能力变更 | `products/<product>/prd/` |
| 架构、模块、依赖、数据流变更 | `products/<product>/architecture/` 或服务级 `architecture/` |
| 接口、CLI、配置、协议变更 | 服务级 `specs/` |
| 架构决策变更 | 产品级或服务级 `adr/` |
| 业务流程、操作流程变更 | 产品级或服务级 `workflows/` |
| 影响人类阅读体验 | `guides/docs/` |

8. 跨文档同步更新——一个接口改了，specs、workflows、architecture、guides 里关于它的描述都要一致
9. 把已处理的 pending 记录移到 `archived/YYYY-MM-DD.md`，从 `pending.md` 里删掉
10. 运行审查清单，确认没有遗漏
11. 按治理等级决定是否自动提交

## 关键原则

### 跨文档一致性是核心

文档维护最大的问题是"改了一处忘了另一处"。改了接口规格，但架构图还指向旧接口；改了部署方式，但接入指南还是老流程——这比不改还糟糕，因为读者不知道该信哪个。

agent 在维护时必须沿关联链路一路检查：specs ← architecture ← workflows ← guides。改一个节点，就要沿着关联走到所有受影响的叶子。

### 语义理解优先于文本替换

pending 记录写的是"文件 X 的 login 函数签名改了"，但维护要做的不只是把新签名写到 specs 里。Agent 需要判断：
- 这个改动是局部的还是影响了认证流程的整体设计？
- 调用 login 的 workflow 描述要不要改？
- 架构决策里有没有相关的前提被这个改动推翻了？

机械替换只能保证字面正确，语义理解才能保证知识库一致。

### 人类可参与也可不参与

`high` 和 `xhigh` 等级下 agent 自动维护并提交。`low` 和 `medium` 下 agent 提醒但等人确认。

不管哪种模式，自动提交都只包含文档和治理文件，不会把源码改动混进文档提交。

## 完成标准

一次合格的维护应该满足：
- pending 的语义变化已被充分理解
- 已确认项目迭代、产品版本和微服务主分支绑定
- 受影响服务源码分支通过预检，或已有人工确认继续维护
- 关键词召回覆盖了整个 workspace，而不只是变更所在的文件
- 所有相关的 PRD、architecture、specs、adr、workflows 已保持一致
- 人类可读的 guides 在必要时也已更新
- 已处理的 pending 已归档，`pending.md` 里只留未处理的
