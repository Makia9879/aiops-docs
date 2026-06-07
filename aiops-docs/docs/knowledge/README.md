# 知识库

这里说明 AIOps 文档治理的三个核心使用场景：历史项目生成文档、维护文档、新项目初始化文档。

AIOps 文档的最终目标不是“生成几篇文章”，而是在 workspace 内建立可持续维护的项目级知识库，让 coding agent 能稳定召回项目事实、理解影响面，并在后续开发中持续更新文档。

## 三个场景

- [历史项目生成文档](./historical-project-documentation.md)：把已有代码、配置、测试和历史文档整理成项目级知识库。
- [维护文档](./document-maintenance.md)：通过 hooks、pending 记录和语义召回，让文档随着代码变化持续更新。
- [新项目初始化文档](./new-project-initialization.md)：在项目初期建立 `.aiops/projects/<project>/` 结构和治理机制。

## 文档粒度

AIOps 文档按项目级治理，不按零散页面治理。一个项目可以包含多个子产品，例如 CA、RA、KMC、OCSP。

第一版固定使用五类核心粒度：

- `prd/`
- `architecture/`
- `specs/`
- `adr/`
- `workflows/`

面向人阅读的叙事入口放在 `guides/`，项目索引放在 `README.md`，未确认事实放在 `open-questions.md`。
