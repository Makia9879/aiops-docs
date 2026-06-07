# 治理引导

`aiops-governance-bootstrap` 负责在工作空间中安装和初始化 AIOps 知识治理的基础设施。

## 触发条件

- 你明确说"初始化 AIOps 治理"、"安装治理工具"、"setup"
- 其他技能发现 `.aiops/` 不存在时，自动先调 bootstrap
- 执行 CLI 的 `install`、`init`、`setup` 命令时

## 做什么

### install（安装技能）

把 6 个技能从源目录复制到 agent 运行时目录。对比 SHA256，内容一致就跳过，不一致就覆盖。

默认目标目录：
- `~/.agents/skills/` — Claude Code 技能目录
- `~/.codex/skills/` — Codex 技能目录

同时安装辅助工具链到 `~/.aiops/tools/`：
- CodeGraph — 代码调用关系分析
- Understand Anything — 通用代码理解
- Trellis — 任务管理与上下文注入

### init（初始化工作空间）

在当前目录创建 `.aiops/` 结构。向上查找已有的 `.aiops/` 目录——找到就复用，没找到就新建。

幂等操作——目录和文件已存在时跳过，Hook 配置已有时只追加不覆盖。

### setup（全部）

先 `install` 再 `init`。

## 引导问题

初始化时可以交互式回答 4 个核心问题（加 `--yes` 则全部使用默认值）：

| 问题 | 默认值 | 说明 |
|-----|-------|------|
| 项目 ID | 从 `package.json` 或目录名推断 | kebab-case 格式 |
| 子产品域 | `core` | 多个子产品用逗号分隔 |
| 治理等级 | `high` | low / medium / high / xhigh |
| 文档语言 | `zh-CN` | 影响文档和提交信息的语言 |

高级选项默认折叠——不需要理解全部配置就能完成初始化。

## 产出物

```
.aiops/
├── governance.yaml          # 治理配置
├── hooks/                   # 三个 Python Hook 脚本
├── projects/<project>/      # 项目知识目录（带 guides 站点模板）
├── diff-records/            # pending.md + archived/
├── local/                   # 本地配置
├── cache/                   # 缓存
└── tmp/                     # 临时文件
```

外加平台配置：
- `.claude/settings.json` — Claude Code Hook
- `.codex/hooks.json` — Codex Hook

## 完成标准

- 技能已安装到 agent 运行时目录
- `.aiops/` 结构已创建
- 项目知识目录和 guides 站点已生成
- Hook 配置已追加到平台文件
- 所有操作幂等——再执行一次不会产生重复或冲突
