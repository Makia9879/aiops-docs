# AIOps Governance Skills Execution Spec

Date: 2026-06-07

## 1. 原始场景与目标

将当前 AIOps skills 从“提示词式文档生成流程”升级为一套 workspace 级项目知识库治理系统。

### 1.1 原始场景

本 spec 覆盖三个原始使用场景：

1. 历史项目生成文档：从已有代码、已有文档、配置、图谱工具结果生成项目级 AIOps 知识库。
2. 维护文档：hooks 记录变更语义到 `pending.md`，LLM 根据 pending 语义做 workspace-wide 召回和跨文档一致性维护。
3. 新项目初始化文档：从需求、会议记录、PRD 或粗略想法初始化项目知识库。

这些场景的共同目标是知识库治理：让 coding agent 能依赖文档继续维护项目，同时让人可以通过 guides 站点阅读项目知识。

### 1.2 实现章节位置

实现相关内容从以下章节开始：

- `5. Install Commands`：定义 `install`、`init`、`setup` 的幂等动作。
- `6. Bootstrap Questions`：定义 TypeScript/TUI 引导问题模型。
- `10. Hooks`：定义 Codex/Claude Code hook 边界。
- `11. Diff Records`：定义 `pending.md` 和归档规则。
- `12. Semantic Maintenance`：定义语义维护流程。
- `14. Skill Changes`：定义需要新增和改造的 skills。
- `15. Implementation Order`：定义实际落地顺序。

### 1.3 第一版目标

第一版目标：

- 支持 `install`、`init`、`setup` 三个幂等动作。
- 在 workspace 下生成 `.aiops/` 治理结构。
- 为每个 project 生成 canonical knowledge 目录。
- 为每个 project 生成可用 Docker Compose 打开的 VuePress guides 站点。
- 安装 Codex 与 Claude Code hooks。
- hooks 只记录和提醒，不直接改文档。
- `aiops-daily-doc-maintenance` 基于 `.aiops/diff-records/pending.md` 做语义维护。

## 2. Source Decisions

本 spec 以以下文档为准：

- `CONTEXT.md`
- `docs/adr/0001-routed-aiops-knowledge-skills.md`
- `docs/adr/0002-version-skill-source-in-repo.md`
- `docs/adr/0003-project-level-knowledge-governance.md`

若本文与 ADR 冲突，以 ADR 为准；实现前应先更新 ADR 或本文。

## 3. Scope

本轮做：

- 新增 `aiops-governance-bootstrap` skill。
- 改写共享 schema/reference，使目标结构从旧 `00-project-card.md` 风格迁移到 `.aiops/projects/<project>/` 风格。
- 定义 TypeScript bootstrap question model 和 TUI 执行路径。
- 定义 CLI 命令边界：`install`、`init`、`setup`。
- 定义 `.aiops/` 目录、project 目录、guides VuePress 站点、hooks、diff records。
- 更新 existing skills 的职责边界和执行顺序。

本轮不做：

- 不实现复杂 hook 升级机制。
- 不要求每篇文档使用 frontmatter 或结构化 metadata。
- 不使用 JSONL 记录 diff records。
- 不做 workspace 级 guides 聚合站点。
- 不做 installer 对 `.aiops/hooks/**` 的版本升级管理。

## 4. Target Workspace Structure

`init` 后 workspace 中应出现：

```text
.aiops/
  governance.yaml
  hooks/
    aiops_inject_context.py
    aiops_record_diff.py
    aiops_trigger_maintenance.py
  diff-records/
    pending.md
    archived/
  projects/
    <project>/
      project.yaml
      README.md
      open-questions.md
      prd/
      architecture/
      specs/
      adr/
      workflows/
      guides/
        package.json
        docker-compose.yaml
        docs/
          README.md
          overview.md
          onboarding.md
          change-playbook.md
          .vuepress/
            config.ts
  local/
  cache/
  tmp/
```

平台配置：

```text
.codex/
  hooks.json

.claude/
  settings.json
```

默认提交：

```text
.aiops/governance.yaml
.aiops/hooks/**
.aiops/diff-records/**
.aiops/projects/**
.codex/hooks.json
.claude/settings.json
```

默认忽略：

```text
.aiops/local/**
.aiops/cache/**
.aiops/tmp/**
```

## 5. Install Commands

### 5.1 `install`

职责：

- 安装或更新 AIOps skills 到 agent runtime。
- 不修改当前 workspace。
- 不创建 `.aiops/`。
- 不安装 hooks。

幂等要求：

- 重复执行不能重复安装同名 skill。
- 如果 skill 已存在，应校验并按实现策略覆盖或提示，但不得产生重复目录。

### 5.2 `init`

职责：

- 将当前 workspace 接入 AIOps governance。
- 从当前目录向上递归查找已有 `.aiops/`。
- 找到则使用该 `.aiops/` 作为 workspace governance root。
- 找不到则在当前目录创建 `.aiops/`。
- 创建缺失文件和目录。
- 追加 Codex/Claude Code AIOps hook entry。

幂等要求：

- 已存在 `.aiops/governance.yaml` 时读取并复用。
- 已存在 project 目录时只补缺失文件，不覆盖已有文档。
- 已存在 AIOps hook entry 时跳过。
- 平台配置解析失败时停止并提示人工处理，不覆盖。

### 5.3 `setup`

职责：

- 顺序执行 `install` + `init`。

幂等要求：

- 继承 `install` 和 `init` 的幂等要求。

## 6. Bootstrap Questions

Bootstrap 提问必须固化为 TypeScript question model，并被 CLI/TUI 与 skill 共同复用。

默认核心问题：

1. Project id
2. Product domains
3. Governance level
4. Knowledge language

默认答案：

```text
project id: 从 manifest 或当前目录推断，kebab-case，需用户确认
product domains: 留空则使用 core
governance_level: high
knowledge_language: zh-CN
```

高级配置默认折叠：

- source roots
- knowledge root
- Codex hooks
- Claude Code hooks
- Trellis integration
- auto commit override

`source_roots` 在 bootstrap 阶段只推断，不强制准确；历史项目 intake 后再确认。

## 7. Governance Config

`.aiops/governance.yaml` 是 workspace 级共享配置，默认版本化，不得写入机器本地绝对路径。

建议字段：

```yaml
schema_version: 1
governance_level: high
knowledge_language: zh-CN
projects_root: .aiops/projects
diff_records: .aiops/diff-records/pending.md
platform_hooks:
  codex:
    status: installed
    file: .codex/hooks.json
  claude_code:
    status: installed
    file: .claude/settings.json
```

机器本地状态放入：

```text
.aiops/local/
```

## 8. Project Config

`.aiops/projects/<project>/project.yaml` 归 knowledge workflow 维护。installer 可创建和补齐安全字段，但不得覆盖已有项目知识。

建议字段：

```yaml
schema_version: 1
project: cert-system
display_name: 数字证书认证系统
governance_level: high
knowledge_language: zh-CN
knowledge_status: draft
products:
  - id: core
    name: Core
source_roots: []
source_roots_status: inferred
canonical_paths:
  prd: prd/
  architecture: architecture/
  specs: specs/
  adr: adr/
  workflows: workflows/
  guides: guides/
tools:
  understand_anything: unknown
  codegraph: unknown
  trellis: unknown
```

## 9. Governance Levels

```text
low
  只记录 pending.md，最低打扰，不自动 commit。

medium
  记录 + 温和提醒，不自动 commit。

high
  默认推荐。记录 + 提醒 + 累计阈值后自动维护。
  自动维护成功后，可以自动提交 documentation-only/governance-only changes。

xhigh
  强治理。更早自动维护，必要时 Stop hook 阻止结束。
  自动维护成功后默认提交，前提是不混入未处理的非文档变更。
```

自动 commit message：

```text
docs(aiops): <动作> <project> 知识库
```

英文知识库使用英文 subject。

## 10. Hooks

Hooks 一等支持 Codex 和 Claude Code。

Hook 脚本边界：

- 只记录和提醒。
- 不直接改 canonical docs。
- 不做大范围知识重写。
- 写入 `.aiops/diff-records/pending.md`。
- 按治理等级触发或提示 `aiops-daily-doc-maintenance`。

Hook 文件：

```text
.aiops/hooks/aiops_inject_context.py
.aiops/hooks/aiops_record_diff.py
.aiops/hooks/aiops_trigger_maintenance.py
```

平台配置策略：

- `.codex/hooks.json` 不存在则创建。
- `.claude/settings.json` 不存在则创建。
- 存在则只追加 AIOps hook entry。
- 已有 AIOps hook entry 则跳过。
- 无法安全解析则停止并提示人工处理。

## 11. Diff Records

只使用 Markdown。

Active input：

```text
.aiops/diff-records/pending.md
```

Archive：

```text
.aiops/diff-records/archived/YYYY-MM-DD.md
```

`pending.md` 是语义变更线索，不是精确 edit list。

示例：

```md
# Pending AIOps Diff Records

## cert-system

### 2026-06-07 15:30 - CA protocol change candidate

Status: pending
Source: hook:PostToolUse

Changed files:
- proto/ca/certificate.proto

Semantic direction:
- CA certificate issuance API may have changed.
- Check interface, workflow, and related guide context.
```

归档规则：

- 处理完成后，从 `pending.md` 移除对应 section。
- 将原记录和处理结果追加到 `archived/YYYY-MM-DD.md`。
- `archived/` 提交到 Git，但不参与 active governance recall、不参与维护债务计算。

## 12. Semantic Maintenance

`aiops-daily-doc-maintenance` 执行语义维护：

1. LLM 查看 `.aiops/diff-records/pending.md`。
2. 总结语义，提炼关键词。
3. 用关键词在整个 workspace 召回文件和内容上下文。
4. 根据召回内容修改相关文件和上下文，保持跨文档一致。
5. 按治理等级决定是否提交 git 变更。

要求：

- 不只按路径改单个文件。
- 要检查关联语义，例如 interface 变化是否影响 workflows、architecture、guides。
- 修改后归档处理过的 pending section。

## 13. Guides Site

每个 project 自带一个最小 VuePress guides 站点。

边界：

- 一个 project 一个 guides 站点。
- 不做 workspace 级 guides 聚合。
- 不跨 project 聚合。
- VuePress 只渲染 `guides/docs/`。
- canonical docs 仍在 `prd/`、`architecture/`、`specs/`、`adr/`、`workflows/`。

运行：

```bash
cd .aiops/projects/<project>/guides
docker compose up --build
```

默认页面：

```text
guides/docs/README.md
guides/docs/overview.md
guides/docs/onboarding.md
guides/docs/change-playbook.md
```

## 14. Skill Changes

### 14.1 `aiops-governance-bootstrap`

新增。

职责：

- 检查 `.aiops/governance.yaml` marker。
- 引导或调用 bootstrap question model。
- 创建 `.aiops/` 治理目录。
- 创建 project skeleton。
- 创建 guides VuePress 站点。
- 安装 Codex/Claude Code hook entry。
- 检测 Trellis。

### 14.2 `aiops-knowledge-lifecycle`

更新。

职责：

- 路由到 bootstrap、historical intake、new briefing、daily maintenance、knowledge review。
- 任何治理 skill 执行前先检查 `.aiops/governance.yaml`。
- marker 缺失时提醒并运行 bootstrap，除非人类反对。

### 14.3 `aiops-historical-project-intake`

更新。

职责：

- 使用 understand-anything 建立历史项目理解。
- 生成或补齐 `.aiops/projects/<project>/` 下的 canonical docs。
- 不再生成旧 `00-project-card.md` 到 `09-maintenance-guide.md` 结构。

### 14.4 `aiops-new-project-briefing`

更新。

职责：

- 从需求/会议/PRD 初始化 `.aiops/projects/<project>/`。
- 未确认内容写入 `open-questions.md`。

### 14.5 `aiops-daily-doc-maintenance`

更新。

职责：

- 读取 `pending.md`。
- 做 semantic maintenance。
- 归档处理过的 pending records。
- 按 governance level 决定是否 commit。

### 14.6 `aiops-knowledge-review`

保留。

职责：

- 审查 `.aiops/projects/<project>/` 是否完整、可信、agent 可用、人类可读。
- 不要求生成 `reviews/` 目录。

## 15. Implementation Order

1. 新增本 spec。
2. 更新 `document-schema.md` 为 `.aiops/projects/<project>/` 结构。
3. 新增 `aiops-governance-bootstrap` skill。
4. 更新现有 scenario skills 的路径和职责。
5. 新增 TS bootstrap question model。
6. 新增 CLI/TUI skeleton。
7. 新增 `.aiops/hooks` 模板。
8. 新增 guides VuePress 模板。
9. 实现 `install/init/setup` 幂等逻辑。
10. 用当前 workspace 做一次 dry-run 或 fixture 验证。

## 16. Acceptance Criteria

- `install` 重复运行不产生重复 skill。
- `init` 从嵌套目录运行时能向上找到已有 `.aiops/`。
- 没有 `.aiops/` 时，`init` 在当前目录创建 `.aiops/`。
- `init` 重复运行不覆盖 `.aiops/projects/<project>/**` 已有文档。
- `.codex/hooks.json` 和 `.claude/settings.json` 只追加 AIOps hook entry，重复运行不重复追加。
- `.aiops/diff-records/pending.md` 使用 Markdown。
- `aiops-daily-doc-maintenance` 按 pending 语义做 workspace-wide 召回。
- guides VuePress 站点可以通过 Docker Compose 启动。
- 默认知识库语言为中文。
- 默认 governance level 为 `high`。

## 17. Open Questions

当前无阻塞确认项。实现中若发现平台 hook JSON 结构与预期不一致，先更新本文和 ADR，再改实现。
