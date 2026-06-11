import { defineUserConfig } from "vuepress";
import { viteBundler } from "@vuepress/bundler-vite";
import { defaultTheme } from "@vuepress/theme-default";

export default defineUserConfig({
  lang: "zh-CN",
  title: "AIOps Docs",
  description: "面向 coding agent 的项目知识治理方案",
  bundler: viteBundler(),
  theme: defaultTheme({
    navbar: [
      {
        text: "知识库",
        link: "/knowledge/"
      }
    ],
    sidebar: {
      "/knowledge/": [
        {
          text: "开篇",
          children: [
            { text: "1. 项目概述", link: "/knowledge/" },
            { text: "2. 快速上手", link: "/knowledge/quick-start.md" },
            { text: "3. 核心理念", link: "/knowledge/overview.md" }
          ]
        },
        {
          text: "场景",
          children: [
            { text: "4. 历史项目入库", link: "/knowledge/historical-project-documentation.md" },
            { text: "5. 文档召回辅助研发", link: "/knowledge/development-context-recall.md" },
            { text: "6. 日常文档维护", link: "/knowledge/document-maintenance.md" },
            { text: "7. 新项目初始化", link: "/knowledge/new-project-initialization.md" }
          ]
        },
        {
          text: "How it works",
          children: [
            { text: "8. 治理模型", link: "/knowledge/governance-model.md" },
            { text: "9. 三级结构", link: "/knowledge/branch-bound-structure.md" },
            { text: "10. 迭代绑定", link: "/knowledge/iteration-bindings.md" },
            { text: "11. config-ui", link: "/knowledge/config-ui.md" }
          ]
        },
        {
          text: "资料",
          children: [
            { text: "CLI 命令参考", link: "/knowledge/cli-reference.md" },
            { text: "技能说明", link: "/knowledge/skills.md" },
            { text: "知识生命周期（总调度）", link: "/knowledge/skills/aiops-knowledge-lifecycle.md" },
            { text: "治理引导", link: "/knowledge/skills/aiops-governance-bootstrap.md" },
            { text: "历史项目入库", link: "/knowledge/skills/aiops-historical-project-intake.md" },
            { text: "文档召回辅助研发", link: "/knowledge/skills/aiops-dev-context-recall.md" },
            { text: "日常文档维护", link: "/knowledge/skills/aiops-daily-doc-maintenance.md" },
            { text: "新项目简报", link: "/knowledge/skills/aiops-new-project-briefing.md" },
            { text: "知识审查", link: "/knowledge/skills/aiops-knowledge-review.md" }
          ]
        }
      ]
    }
  }),
  base: "/",
  markdown: {
    headers: {
      level: [2, 3]
    }
  }
});
