# 快速上手

这篇文章从零开始，带你完成 AIOps 知识治理的安装和初始化。整个过程大约五分钟。

## 前提条件

- 你的开发机器上有 **Node.js ≥ 18**（运行 CLI 用）
- 安装了 **Docker**（启动文档站点用，可选）
- 在使用 **Claude Code** 或 **Codex** 作为 AI coding agent

## 第一步：安装

在你的项目根目录打开终端，执行：

```bash
npx -y @makia9879/aiops setup --yes --project my-project
```

这一行命令做了两件事：

1. 把 6 个治理技能安装到 agent 的运行时目录（`~/.agents/skills/` 和 `~/.codex/skills/`）
2. 在当前目录创建 `.aiops/` 知识治理结构

完成后你会看到类似这样的输出：

```
Skills source: /path/to/skills
Skills targets: ~/.agents/skills, ~/.codex/skills
Skills installed: 6
Tools installed: 3
Workspace: /path/to/your-project
AIOps root: /path/to/your-project/.aiops
Project: my-project
Created: 32
Updated: 0
Skipped existing: 0
```

## 第二步：看看生成了什么

初始化后，你的项目目录下多了一个 `.aiops/`：

```text
your-project/
├── .aiops/
│   ├── governance.yaml          # 治理配置
│   ├── hooks/                   # Agent Hook 脚本
│   ├── projects/my-project/
│   │   ├── project.yaml         # 项目元信息、产品注册表、文档路径
│   │   ├── iteration-bindings.yaml # 项目迭代、产品版本、微服务主分支绑定
│   │   ├── README.md            # 知识库导航
│   │   ├── open-questions.md    # 待确认问题
│   │   ├── iterations/          # 项目迭代文档
│   │   ├── products/            # 产品与微服务文档
│   │   └── guides/              # 开发指南站点
│   └── diff-records/
│       ├── pending.md           # 待处理的变更记录
│       └── archived/            # 已归档的历史记录
├── .claude/settings.json        # Claude Code Hook 配置
└── .codex/hooks.json            # Codex Hook 配置
```

目录已经建好了，但内容还需要你的 AI agent 来填充。这一步执行完之后，agent 已经具备了知识治理的能力。

## 第三步：触发第一次知识生成

现在你有两个选择，取决于项目的情况：

### 如果是已经有代码的历史项目

在 Claude Code 或 Codex 中对 agent 说：

> 帮我整理 my-project 的项目知识库，从代码和已有文档中提取项目结构、架构、核心流程和关键决策。

Agent 会执行 `aiops-historical-project-intake` 技能，扫描源码、配置、测试、已有文档，逆向生成 knowledge 文档。

### 如果是刚启动的新项目

> 根据我们的 PRD 和讨论，初始化 my-project 的知识库。

Agent 会执行 `aiops-new-project-briefing` 技能，从你的需求输入建立知识骨架。不确定的内容会标为"待确认"放入 `open-questions.md`。

### 如果只是想先验证一下

```bash
# 查看当前治理配置
cat .aiops/governance.yaml

# 查看项目配置
cat .aiops/projects/my-project/project.yaml
```

## 第四步：启动文档站点（可选）

如果你想让团队成员也能浏览项目知识，初始化时为每个项目生成了一个 VuePress 文档站点：

```bash
cd .aiops/projects/my-project/guides
docker compose up
```

浏览器打开 `http://localhost:8080`，就能看到给人阅读的项目知识站点。

## 第五步：后续日常使用

初始化只做一次。日常使用中，知识维护是自动的：

1. 你正常写代码，AI agent 辅助开发
2. Hook 自动把有语义价值的 agent 事件记录到文档仓库 `.aiops/diff-records/pending.md`
3. 达到治理阈值后，Claude Code 执行 `aiops-daily-doc-maintenance`，先读取 `iteration-bindings.yaml`，再根据 pending 记录更新相关文档
4. 你也可以随时对 agent 说：**"检查一下知识库是否需要更新"**

治理等级决定了自动化程度。默认是 `high`——pending 积累到一定量后异步维护并在安全时提交。详见[治理模型](./governance-model.md)。

## 常用操作速查

| 想做什么 | 命令或操作 |
|---------|-----------|
| 第一次安装 | `npx -y @makia9879/aiops setup --yes --project <name>` |
| 只更新技能 | `npx -y @makia9879/aiops install` |
| 在新的子目录里也给已有项目初始化 | `npx -y @makia9879/aiops init --yes --project <name>` |
| 交互式配置（手动回答） | 去掉 `--yes`，CLI 会逐项提问 |
| 指定多个产品 | `--products CA,RA,KMC,OCSP` |
| 配置迭代绑定 | `aiops-governance config-ui --project <name>` |
| 跳过工具链安装 | `--with none` |
| 降低治理等级 | `--level medium` |
| 让 agent 整理知识库 | "帮我整理项目知识库" |
| 让 agent 检查文档 | "检查一下知识库是否有需要更新的地方" |

详细命令参数见 [CLI 命令参考](./cli-reference.md)，每个技能的能力和边界见[技能说明](./skills.md)。三级结构见[项目、产品、微服务三级结构](./branch-bound-structure.md)，维护前预检见[迭代绑定](./iteration-bindings.md)。
