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
          text: "总",
          children: [
            { text: "1. 知识库入口", link: "/knowledge/" },
            { text: "2. 核心理念", link: "/knowledge/overview.md" }
          ]
        },
        {
          text: "分",
          children: [
            { text: "3. 历史项目入库", link: "/knowledge/historical-project-documentation.md" },
            { text: "4. 日常文档维护", link: "/knowledge/document-maintenance.md" },
            { text: "5. 新项目初始化", link: "/knowledge/new-project-initialization.md" }
          ]
        },
        {
          text: "总",
          children: [
            { text: "6. 治理模型", link: "/knowledge/governance-model.md" }
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
