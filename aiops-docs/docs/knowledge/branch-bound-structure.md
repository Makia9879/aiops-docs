# 项目、产品、微服务三级结构

AIOps 文档治理仍按“项目 -> 产品 -> 微服务”组织，但语义发生变化：这些 Markdown 文档是人类阅读层，不再是 agent 的实现事实源。Agent 需要实现事实时，应回到源码、测试、配置、CodeGraph 和 Understand Anything。

## 结构总览

项目级 Git origin 仍是提交边界。一个项目文档仓库可以管理多个项目目录，每个项目目录下管理多个产品，每个产品下管理多个微服务。

```text
.aiops/projects/<project>/
  project.yaml
  iteration-bindings.yaml
  README.md
  open-questions.md
  iterations/
    <project-iteration>/
      iteration.yaml
      overview.md
      architecture.md
      release-scope.md
      risks.md
  products/
    <product>/
      product.yaml
      overview.md
      architecture/
      workflows/
      adr/
      services/
        <service>/
          service.yaml
          overview.md
          architecture/
          workflows/
          adr/
  guides/
```

旧模型中的 `specs/` 被移除。接口、配置、协议、数据结构、调用链和验证入口由源码与图谱召回。

## 项目级阅读文档

项目级文档描述本项目的迭代、全局架构、产品范围和共同约束。典型落点是：

```text
iterations/<project-iteration>/
  iteration.yaml
  overview.md
  architecture.md
  release-scope.md
  risks.md
```

项目级文档适合写：

- 本轮项目迭代目标。
- 本迭代包含哪些产品版本。
- 产品范围、共同约束、部署和集成节奏。
- 项目级风险、未决问题和交付边界。

## 产品级阅读文档

产品是项目下的一级治理对象。产品级文档描述产品版本、产品内能力、产品内微服务划分，以及对外部上下游产品的责任边界。

```text
products/<product>/
  product.yaml
  overview.md
  architecture/
  workflows/
  adr/
  services/
```

产品级文档适合写：

- 产品版本目标和范围。
- 产品级用户流程。
- 产品内微服务边界。
- 产品内数据流和能力组合。
- 产品对外部上下游的业务责任边界。
- 产品级 ADR。
- 指向源码、图谱或测试的导航线索。

## 微服务级阅读文档

微服务是产品下的二级治理对象。微服务级文档描述单个代码服务的职责、运行角色、关键流程和决策。

```text
products/<product>/services/<service>/
  service.yaml
  overview.md
  architecture/
  workflows/
  adr/
```

微服务级文档适合写：

- 服务职责和所属产品能力。
- 服务入口区域、运行形态、依赖方向和关键配置位置。
- 服务内部业务流程。
- 服务调用外部上下游服务的业务语义和责任边界。
- 服务级 ADR。
- 建议使用的 CodeGraph / Understand Anything 查询入口。

不适合写：

- API 参数完整清单。
- RPC contract 全量字段。
- 数据库字段逐项说明。
- 配置项逐项说明。
- 函数级执行细节。

这些实现细节以源码和图谱为准。

## Guides 是站点呈现

`guides/` 仍是面向人类的 VuePress 站点，不按每个产品或微服务单独拆站点。它可以按阅读路径重组内容，但不替代源码和图谱事实。

```text
guides/docs/
  overview.md
  onboarding.md
  change-playbook.md
  iterations/
  products/
  services/
```

维护时先更新 `.aiops/projects/<project>/` 下的人类阅读层；当项目定位、主要流程、产品边界、服务入口或交付路径影响上手体验时，再同步更新 guides。

## 外部上下游关系

不单独维护跨产品或跨微服务文档层。外部上下游关系写在发起调用或承载业务依赖的一方自己的产品或微服务文档中。

检索顺序是：

1. 先读当前产品或微服务自己的阅读文档，了解业务语义和责任边界。
2. 从当前文档中的外部上下游说明定位对方产品、服务和源码根。
3. 用 CodeGraph / Understand Anything / 源码确认调用入口、协议、错误口径和验证路径。
4. 如果当前文档没有说明外部调用关系，维护阅读层，把业务语义和图谱导航补清楚。

这个规则避免产生独立的 `cross/`、`integration.yaml` 或跨域版本矩阵，也避免让上下游关系脱离拥有业务语义的一方。
