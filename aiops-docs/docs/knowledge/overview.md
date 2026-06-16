# 核心理念

这篇文章解释 AIOps 知识治理的新设计：人通过文档理解项目，agent 通过文档进入业务语境，再回到源码和图谱确认实现事实。

## 问题：Agent 需要业务地图，也需要实现事实

一个典型场景：

> 让 Codex 修改认证模块。它读了几份说明，知道认证属于账号体系，但真正改代码时还需要确认 handler、service、model、配置、测试和调用链。

如果 Markdown 文档试图同时承担“人类阅读”和“实现 spec”，会出现两个问题：

1. 人类文档会变得太碎，像接口清单，不适合理解业务。
2. Agent 仍然必须回源码验证，因为代码和调用图才是最新实现。

因此新模型把两层分开：

| 层次 | 作用 | 典型载体 |
| --- | --- | --- |
| 人类阅读层 | 解释项目、产品、微服务、流程、架构边界和 ADR | `.aiops/projects/<project>/`、`guides/` |
| Agent 事实层 | 验证实现细节、接口、配置、调用关系和影响面 | 源码、测试、配置、Git 历史、CodeGraph、Understand Anything |

Markdown 不再维护 `specs/` 作为实现事实源。代码 + CodeGraph 才是最好的 spec。

## 设计一：用 Skills Seed 的工作原理，不直接使用它

`skills-seed` 的价值在于工作方式：

```text
读取真实代码和历史 -> 学习项目模式 -> 策展入库 -> 生成薄入口 + 深 references -> 用检查命中反哺规则质量
```

AIOps 借用这个思想，但不直接调用 `skills-seed`：

- 历史项目入库时，从源码、测试、配置、旧文档、Git 历史、`understand-anything` 和 `codegraph` 提炼项目画像。
- 维护文档时，git push hook 启动 Claude Code，回顾未分析提交，总结本次变化对业务、架构、流程和决策的影响。
- 新项目初始化时先通过用户引导建立阅读层骨架；代码出现后再由维护流程用源码和图谱替换假设。
- Agent 召回时先读阅读层理解业务，再读源码和图谱确认实现。

这套机制强调“从证据生成文档”，而不是让文档替代证据。

## 设计二：项目、产品、微服务三级阅读层

项目级 Git origin 仍是治理边界。一个项目可以包含多个产品，每个产品可以包含多个微服务。

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

阅读层仍按项目、产品、微服务组织，粒度和旧模型一致，但删除 `specs/`：

- 项目迭代：目标、范围、共同架构、发布范围、风险。
- 产品：产品定位、能力边界、产品内架构、流程、ADR。
- 微服务：服务职责、运行角色、关键流程、ADR、源码和图谱导航。

接口参数、RPC contract、数据库字段、配置项、调用链和验证命令不再复制到 Markdown specs。它们应通过源码、测试、CodeGraph 和 Understand Anything 召回。

## 设计三：维护由 git push 触发

Hook 仍然只负责触发，不直接改文档：

| Hook | 触发时机 | 做什么 |
| --- | --- | --- |
| `aiops_inject_context` | 任务开始时 | 注入阅读层入口和项目绑定信息 |
| `aiops_push_maintenance` | `git push` 前 | 启动 Claude Code 分析未分析提交并维护阅读层 |

维护 agent 不能只看变更文件名。它应读取 `commit-analysis.md` 找到上次分析位置，再按提交顺序读取未分析提交、diff、源码、图谱影响面和现有阅读层，判断哪些业务说明、架构边界、流程、ADR 或上手路径需要更新。每分析完一个提交，就记录 commit hash 和 commit time。

## 设计四：四个场景，同一套结构

AIOps 知识治理按输入来源和使用方向分成四个场景：

- **历史项目入库**：按 skills-seed 的工作原理，从已有代码和历史生成阅读层。
- **文档召回辅助研发**：先读阅读层理解业务，再用源码和图谱定位实现。
- **日常文档维护**：根据未分析 Git 提交和图谱影响面更新阅读层。
- **新项目初始化**：通过用户引导初始化阅读层，后续循环进入维护场景。

不管从哪个入口进入，使用的都是同一套 `.aiops/projects/<project>/` 项目结构。区别只在证据来源和更新方向。

## 这套方案不做什么

- **不让 Markdown specs 替代代码**。实现细节以源码、测试和图谱为准。
- **不替代人做决策**。Agent 可以整理事实、发现不一致、提出建议，架构决策和产品方向仍由人确认。
- **不追求一次写完**。第一轮建立可用阅读层，后续通过维护流程持续修正。
- **不绑定单一 agent**。技能和结构可被 Codex、Claude Code 等平台使用。

## 下一步

- 手上有老项目要整理 -> [历史项目入库](./historical-project-documentation.md)
- 要让 agent 先理解项目再研发 -> [文档召回辅助研发](./development-context-recall.md)
- 项目在持续开发中 -> [日常文档维护](./document-maintenance.md)
- 刚启动一个新项目 -> [新项目初始化](./new-project-initialization.md)
- 想了解背后的规则设计 -> [治理模型](./governance-model.md)
