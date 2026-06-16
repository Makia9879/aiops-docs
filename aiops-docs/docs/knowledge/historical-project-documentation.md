# 历史项目生成文档

历史项目生成文档的目标，是把已有代码、配置、测试、Git 历史、旧文档和图谱分析结果，沉淀成一套人类能读懂、agent 能用来进入业务语境的项目阅读层。

这里借鉴 `skills-seed` 的工作原理，但不直接使用 `skills-seed`：

```text
读取真实项目 -> 建立项目画像 -> 策展可信结论 -> 生成薄入口和分层 references -> 后续用变更持续更新
```

AIOps 的区别是：实现事实不写进 Markdown specs，而是保留在源码、测试、CodeGraph 和 Understand Anything 里。

## 治理对象

治理对象是 workspace 下的项目级知识。一个项目可以包含多个产品，每个产品下可以包含多个微服务。例如数字证书认证系统里可能同时存在 CA、RA、KMC、OCSP 等产品，并分别对应独立代码服务。

推荐落点：

```text
.aiops/projects/<project>/
  project.yaml
  iteration-bindings.yaml
  README.md
  open-questions.md
  iterations/
  products/
  guides/
```

其中 `README.md` 只做导航索引；`iterations/`、`products/` 和服务目录是人类阅读层；`guides/` 是阅读站点。Agent 需要实现细节时，应回到源码和图谱。

## 生成顺序

历史项目不要一开始就追求文档齐全。第一轮应先解决“人能理解项目，agent 能定位下一步证据”的最低闭环。

1. 识别 workspace、项目、产品和微服务边界。
2. 扫描源码入口、manifest、配置、测试、已有文档。
3. 读取 Git 历史，识别长期存在的业务边界、架构取舍和高频变更区域。
4. 使用 `understand-anything` 建立项目结构和领域流，使用 `codegraph` 定位调用关系和影响面。
5. 生成项目索引、开放问题和图谱导航线索。
6. 按项目、产品、微服务三级落点生成人类阅读层：overview、architecture、workflows、ADR、risks。
7. 为人补一份 `guides/` 阅读入口。

第一轮最重要的是 architecture 和 workflows。architecture 让人知道模块、产品和服务之间的边界；workflows 让人知道关键业务链路如何流经系统。实现级 contract 不写成 `specs/`，而是通过源码和图谱确认。

## 文档怎么写

`overview.md` 写项目、产品或微服务为什么存在，服务谁，承担什么业务责任，不承担什么责任。

`architecture/` 写系统边界、产品关系、微服务职责、依赖方向、运行时组件、数据流和部署形态。对于包含 CA、RA、KMC、OCSP 这类产品的项目，architecture 必须说明它们之间的责任边界和交互路径。

`workflows/` 写端到端流程，例如证书签发、密钥托管、吊销查询、定时同步、异常处理。每条流程都要尽量连接到源码路径、配置路径、测试路径或图谱查询。

`adr/` 写已经确认的架构选择、取舍和边界。历史项目里没有原始 ADR 时，可以从代码现状补写“已发生决策”，但必须标明证据和不确定性。

`open-questions.md` 写证据不足、旧文档和源码冲突、需要人类确认的产品语义。

不再写 `specs/`。接口、命令、配置、数据结构、协议、任务和行为约束由源码、测试、CodeGraph 和 Understand Anything 召回。

## 证据规则

历史项目最容易出现的问题，是 agent 把“看起来合理”的系统解释写成事实。文档应区分已确认事实、推断和待确认问题。不能证明的内容不要塞进正文，应进入 `open-questions.md`。

优先证据来源：

1. 源码、测试、迁移、配置、构建脚本。
2. Git 历史和最新提交。
3. `understand-anything` 和 `codegraph` 的图谱结果。
4. 已有 README、设计文档、接口文档。
5. 人类补充说明。

如果源码和旧文档冲突，以源码和当前分支图谱为准，并把冲突写进开放问题或 ADR。

## 完成标准

合格的历史项目阅读层，应让人和 agent 能回答这些问题：

- workspace 里有哪些项目、产品和微服务？
- 每个产品和微服务的职责边界是什么？
- 核心业务流程经过哪些模块和文件？
- 修改某类能力时应该先读哪些阅读文档，再查哪些源码或图谱？
- 哪些结论证据不足，需要人类确认？
- 哪些实现事实必须回到代码、测试和 CodeGraph 验证？

达到这个标准后，历史项目文档才从“给人看的总结”变成“可持续维护的项目阅读层”。
