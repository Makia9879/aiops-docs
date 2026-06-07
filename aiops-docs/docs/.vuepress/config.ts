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
          text: "概念",
          children: [
            { text: "1. 知识库入口", link: "/knowledge/" },
            { text: "2. 核心理念", link: "/knowledge/overview.md" },
            { text: "3. 快速上手", link: "/knowledge/quick-start.md" }
          ]
        },
        {
          text: "场景",
          children: [
            { text: "4. 历史项目入库", link: "/knowledge/historical-project-documentation.md" },
            { text: "5. 日常文档维护", link: "/knowledge/document-maintenance.md" },
            { text: "6. 新项目初始化", link: "/knowledge/new-project-initialization.md" }
          ]
        },
        {
          text: "How it works",
          children: [
            { text: "7. 治理模型", link: "/knowledge/governance-model.md" }
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
