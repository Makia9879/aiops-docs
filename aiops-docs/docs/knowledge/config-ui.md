# config-ui 使用说明

`config-ui` 是 AIOps CLI 子命令，用于在本地浏览器中维护项目、产品、微服务的迭代绑定关系。它的来源是 `docs/spec-aiops-branch-bound-document-structure.md` 第 10 节。

建议命令：

```bash
aiops-governance config-ui --project certificate-system
```

它的目标不是替代文档维护流程，而是降低编辑 `iteration-bindings.yaml` 的门槛。

## 它会读取什么

启动后，`config-ui` 从当前目录向上查找 `.aiops/`，然后读取：

```text
.aiops/projects/<project>/project.yaml
.aiops/projects/<project>/iteration-bindings.yaml
```

如果 `iteration-bindings.yaml` 不存在，页面可以按 `project.yaml` 中的产品和服务注册表创建一份新配置草稿。

## 页面能力

页面展示项目 -> 产品 -> 微服务树，并提供四类编辑区：

| 区域 | 用途 |
| --- | --- |
| 项目迭代列表 | 新增、复制、删除迭代，修改 `docs_branch`。 |
| 产品版本矩阵 | 为每个产品选择或填写本迭代产品版本。 |
| 微服务分支矩阵 | 为每个服务填写 `code_root` 和 `required_branch`。 |
| 检查面板 | 显示本地源码当前分支与 `required_branch` 是否一致。 |

页面还应提供预览面板，展示保存后会写入的 `iteration-bindings.yaml`。

## 保存边界

`config-ui` 允许写：

- 当前项目的 `iteration-bindings.yaml`。
- 缺失的 `product.yaml`。
- 缺失的 `service.yaml`。

自动补齐只能创建缺失文件或补充缺失字段，不得覆盖已有人工维护内容。遇到字段冲突时应停止保存，并提示人工处理。

它不允许做这些事：

- 不执行 `git checkout`。
- 不自动创建、删除或合并分支。
- 不自动提交。
- 不写 `.aiops/local/` 之外的临时状态。
- 不创建独立跨产品或跨微服务文档层。

## 建议选项

```text
--project <id>       指定项目 id
--host <host>        默认 127.0.0.1
--port <port>        默认自动选择可用端口
--no-open            只启动 server，不自动打开浏览器
--read-only          只查看，不允许保存
```

默认监听 `127.0.0.1`，避免把配置页面暴露到局域网。

## 和维护流程的关系

`config-ui` 保存的是迭代绑定配置。LLM 和 hooks 后续会按这份配置做维护前预检：

1. 识别当前项目迭代。
2. 读取 `project.yaml` 和 `iteration-bindings.yaml`。
3. 解析产品版本和微服务主分支。
4. 检查受影响微服务源码当前分支。
5. 分支不一致时提醒人工切换或确认。
6. 在确认后的迭代绑定范围内维护 canonical docs。

因此，配置完成后还需要让 agent 按 [迭代绑定](./iteration-bindings.md) 的规则执行文档维护。
