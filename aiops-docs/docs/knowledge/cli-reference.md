# CLI 命令参考

`@makia9879/aiops` CLI 是 AIOps 知识治理的命令行入口。所有命令都是幂等的——可以反复执行，不会产生重复或冲突的内容。

## 命令总览

```bash
aiops-governance <command> [options]
```

| 命令 | 作用 | 修改项目文件 |
|-----|------|------------|
| `install` | 安装 AIOps 技能到 agent 运行时目录 | 不修改 |
| `init` | 在当前项目初始化知识治理结构 | 修改 |
| `setup` | 先 `install` 再 `init` | 修改 |
| `help` | 显示帮助信息 | 不修改 |

## install

只安装技能和工具，不碰项目文件。

```bash
npx -y @makia9879/aiops install [options]
```

**安装了什么：**

- 6 个 AIOps 治理技能 → `~/.agents/skills/` 和 `~/.codex/skills/`
- 3 个辅助工具 → `~/.aiops/tools/`
  - `@colbymchenry/codegraph@0.9.9`
  - `@understand-anything/skill@2.7.6`
  - `@mindfoldhq/trellis@0.5.19`

**技能安装逻辑：**

技能目录按 SHA256 对比。目标目录不存在 → 全新安装。内容一致 → 跳过。内容不一致 → 覆盖更新。

**常用组合：**

```bash
# 只装技能，跳过工具链
npx -y @makia9879/aiops install --with none

# 只装部分工具
npx -y @makia9879/aiops install --with codegraph,trellis

# 从指定目录安装技能（开发调试用）
npx -y @makia9879/aiops install --skills-source /path/to/skills
```

## init

在当前项目初始化知识治理结构。会向上查找已有 `.aiops/` 目录——如果找到了就复用，没找到就新建。

```bash
npx -y @makia9879/aiops init [options]
```

**生成了什么：**

- `.aiops/` 目录（governance.yaml、hooks/、projects/、diff-records/ 等）
- `.aiops/projects/<project>/` 项目知识骨架
- `.claude/settings.json` 和 `.codex/hooks.json` Hook 配置（追加式写入，不覆盖已有内容）
- `guides/` VuePress 文档站点模板

**常用组合：**

```bash
# 最简单的用法
npx -y @makia9879/aiops init --yes --project my-app

# 多产品域项目
npx -y @makia9879/aiops init --yes --project cert-auth --products CA,RA,KMC,OCSP

# 最高治理等级
npx -y @makia9879/aiops init --yes --project my-app --level xhigh
```

## setup

等于 `install` + `init`，一步到位。大多数情况下用这个就够了。

```bash
npx -y @makia9879/aiops setup [options]
```

## 选项表

### CLI 行为

| 选项 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `-y, --yes` | flag | 关闭 | 跳过交互式问答，使用默认值或命令行参数 |
| `-h, --help` | flag | — | 显示帮助信息 |

### 项目配置

| 选项 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `--project <id>` | string | 自动推断 | 项目标识，用作 `.aiops/projects/<id>/` 的目录名。默认从 `package.json` 的 `name` 字段或当前目录名推断 |
| `--products <list>` | string | `core` | 逗号分隔的子产品域列表。例如 `CA,RA,KMC,OCSP` |
| `--level <level>` | string | `high` | 治理等级：`low`、`medium`、`high`、`xhigh` |
| `--language <lang>` | string | `zh-CN` | 知识文档语言 |

### 路径覆盖

| 选项 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `--skills-source <path>` | string | 自动发现 | 技能源目录。默认按顺序尝试：打包内置 → 当前目录 `./skills` → 父目录 `../skills` → ... |
| `--skills-target <path>` | string | `~/.agents/skills` 和 `~/.codex/skills` | 运行时技能安装目标目录。多个目录用系统路径分隔符分隔 |
| `--tools-root <path>` | string | `~/.aiops/tools` | 工具链安装根目录。各工具安装在此目录下，可执行 CLI 的 shim 放在 `<tools-root>/../bin` |

### 工具链

| 选项 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `--with <tools>` | string | `default` | `default` 安装全部三个工具；`none` 跳过全部；逗号分隔列表选择安装。可选项：`codegraph`、`understand-anything`、`trellis` |

## 环境变量

CLI 也可以用环境变量覆盖部分配置：

| 变量 | 对应选项 |
|------|---------|
| `AIOPS_SKILLS_SOURCE` | `--skills-source` |
| `AIOPS_SKILLS_TARGETS` | `--skills-target`（用系统路径分隔符） |
