# 迭代绑定

`iteration-bindings.yaml` 是 AIOps 分支绑定模型的核心配置。它把一次项目迭代绑定到本轮产品版本和微服务主分支：

```text
项目迭代 -> 产品版本 -> 微服务主分支
```

规则来自 `docs/spec-aiops-branch-bound-document-structure.md`。它解决的问题是：LLM 维护文档前必须知道当前文档属于哪个项目迭代，不以本地临时源码分支为准。

## 配置位置

`iteration-bindings.yaml` 放在项目知识根下：

```text
.aiops/projects/<project>/iteration-bindings.yaml
```

`project.yaml` 记录项目稳定身份、产品注册表和文档路径；`iteration-bindings.yaml` 记录具体项目迭代里的产品版本和微服务主分支。两者不要混用。

## 示例

```yaml
schema_version: 1
project: certificate-system

iterations:
  - id: develop_1.0.0
    docs_branch: develop_1.0.0
    docs_path: iterations/develop_1.0.0

    products:
      - id: ca
        version: develop_1.0.0
        docs_path: products/ca
        services:
          - id: ca-admin
            code_root: /Users/makia98/lij/work/CA/ca_admin
            required_branch: develop_1.0.0
```

字段含义：

| 字段 | 含义 |
| --- | --- |
| `iterations[].id` | 项目迭代标识。 |
| `iterations[].docs_branch` | 该项目迭代对应的项目级文档 Git 分支。 |
| `products[].version` | 该项目迭代选定的产品版本。 |
| `services[].code_root` | 微服务源码根目录。 |
| `services[].required_branch` | 该项目迭代选定的微服务主分支。 |

产品只定义版本，微服务只定义主分支。不定义“微服务版本”，也不把本地临时开发分支写入配置。

## 维护前预检

LLM 修改 canonical docs 前必须先读取 `iteration-bindings.yaml`，再按影响范围做预检。

### 项目级文档

修改 `iterations/<project-iteration>/` 前，确认文档 repo 当前分支等于该迭代的 `docs_branch`。如果不一致，需要人工确认本次仍基于该项目迭代维护。

### 产品级文档

修改 `products/<product>/` 前，确认：

```text
project iteration = selected iteration
product version = iteration-bindings.yaml 中该产品的 version
```

产品文档只围绕项目迭代绑定的产品版本展开。

### 微服务级文档

修改 `products/<product>/services/<service>/` 前，确认：

```text
service code root = iteration-bindings.yaml 中该服务的 code_root
required branch = iteration-bindings.yaml 中该服务的 required_branch
current branch = git -C <code_root> branch --show-current
```

如果当前源码分支与 `required_branch` 不一致，默认不修改 canonical docs。LLM 应提醒：

```text
当前 <service> 在 <current branch>，但项目迭代 <iteration> 要求 <required branch>。
请切换源码分支，或确认本次文档仍基于 <iteration> 的绑定关系维护。
```

人工确认后可以继续，但维护结果仍归属该项目迭代，不为本地临时分支创建文档版本。

## 维护总结要记录什么

一次文档维护完成后，维护总结、diff record 或提交信息里应记录：

- 项目迭代。
- 相关产品版本。
- 相关微服务主分支。
- 如果本地源码分支不一致但人工确认继续，记录确认原因。

这能让后来的人和 agent 知道文档事实基于哪一轮项目迭代，以明确的项目迭代为准。
