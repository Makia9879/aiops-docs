# 项目、产品、微服务三级结构

AIOps 文档治理的目标结构从“项目 -> 产品域”升级为“项目 -> 产品 -> 微服务”。这个规则来自 `docs/spec-aiops-branch-bound-document-structure.md`，并延续 `CONTEXT.md`、`docs/adr/0003-project-level-knowledge-governance.md` 中已经确认的项目级知识根：`.aiops/projects/<project>/`。

## 结构总览

项目级 Git origin 仍是提交边界。一个项目文档仓库可以管理多个项目目录，每个项目目录下管理多个产品，每个产品下管理多个微服务。

```text
.aiops/projects/<project>/
  project.yaml
  iteration-bindings.yaml
  iterations/
  products/
    <product>/
      product.yaml
      prd/
      architecture/
      workflows/
      specs/
      adr/
      services/
        <service>/
          service.yaml
          architecture/
          specs/
          workflows/
          adr/
  guides/
```

这不是三套互不相干的文档。项目、产品、微服务都归属同一个项目知识根，维护结果仍提交到项目级文档 repo。

## 项目级文档

项目级文档描述本项目的迭代、全局架构、产品范围和共同约束。典型落点是：

```text
iterations/<project-iteration>/
  iteration.yaml
  prd.md
  architecture.md
  release-scope.md
  risks.md
```

项目级文档适合写：

- 本轮项目迭代目标。
- 本迭代包含哪些产品版本。
- 产品范围、共同约束、部署和集成节奏。
- 项目级风险、未决问题和交付边界。

## 产品级文档

产品是项目下的一级治理对象。产品级文档描述产品版本、产品内能力、产品内微服务划分，以及对外部上下游产品的责任边界。

```text
products/<product>/
  product.yaml
  prd/
  architecture/
  workflows/
  specs/
  adr/
  services/
```

产品级文档适合写：

- 产品版本目标和范围。
- 产品级用户流程。
- 产品内微服务边界。
- 产品内数据流和能力组合。
- 产品对外部上下游的调用入口、责任边界和依赖假设。
- 产品级 ADR。

## 微服务级文档

微服务是产品下的二级治理对象。微服务级文档描述单个代码服务的接口、模型、运行形态、业务规则和维护入口。

```text
products/<product>/services/<service>/
  service.yaml
  architecture/
  specs/
  workflows/
  adr/
```

微服务级文档适合写：

- 服务入口、路由、handler、logic、model、配置。
- API contract、RPC contract、数据库表、消息协议。
- 服务内部业务流程。
- 服务调用外部上下游服务的入口、协议、错误口径和验证路径。
- 服务级 ADR 和回归验证命令。

## Guides 仍是阅读层

`guides/` 仍是面向人类的阅读层，不按每个产品或微服务单独拆站点。它可以按阅读路径重组内容，但必须回链 canonical docs，不能承载唯一业务规则。

```text
guides/docs/
  overview.md
  onboarding.md
  change-playbook.md
  iterations/
  products/
  services/
```

维护时先改 canonical docs；当项目定位、主要流程、产品边界、服务入口或交付路径影响人类理解时，再同步更新 guides。

## 外部上下游关系

不单独维护跨产品或跨微服务文档层。外部上下游关系写在发起调用或承载业务依赖的一方自己的产品或微服务文档中。

检索顺序是：

1. 先读当前产品或微服务自己的 canonical docs。
2. 从当前文档中的外部上下游说明定位对方产品或服务。
3. 再读取对方自己的 canonical docs 作为接口和行为事实补充。
4. 如果当前文档没有说明外部调用关系，先补当前文档，把调用入口、协议、责任边界、错误口径和验证路径写清楚。

这个规则避免产生独立的 `cross/`、`integration.yaml` 或跨域版本矩阵，也避免让上下游关系脱离拥有业务语义的一方。
