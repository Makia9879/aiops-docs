import { defineUserConfig } from "vuepress";
import { viteBundler } from "@vuepress/bundler-vite";
import { defaultTheme } from "@vuepress/theme-default";

export default defineUserConfig({
  lang: "zh-CN",
  title: "AIOps Docs",
  description: "AIOps knowledge base for coding-agent-friendly project documentation",
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
          text: "知识库",
          children: [
            "/knowledge/",
            "/knowledge/historical-project-aiops-docs.md"
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
