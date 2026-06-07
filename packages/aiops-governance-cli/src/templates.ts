import type { BootstrapAnswers } from "./questions.js";

export function governanceYaml(answers: BootstrapAnswers): string {
  return `schema_version: 1
default_project: ${answers.projectId}
governance_level: ${answers.governanceLevel}
knowledge_language: ${answers.knowledgeLanguage}
projects_root: .aiops/projects
diff_records: .aiops/diff-records/pending.md
projects:
  - ${answers.projectId}
platform_hooks:
  codex:
    status: installed
    file: .codex/hooks.json
  claude_code:
    status: installed
    file: .claude/settings.json
local_state:
  - .aiops/local
  - .aiops/cache
  - .aiops/tmp
`;
}

export function projectYaml(
  answers: BootstrapAnswers,
  tools: { trellis: "detected" | "unknown" } = { trellis: "unknown" }
): string {
  return `schema_version: 1
project: ${answers.projectId}
display_name: ${answers.projectId}
governance_level: ${answers.governanceLevel}
knowledge_language: ${answers.knowledgeLanguage}
knowledge_status: draft
products:
${answers.productDomains.map((domain) => `  - id: ${domain}\n    name: ${domain}`).join("\n")}
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
  trellis: ${tools.trellis}
`;
}

export function gitignoreEntries(): string {
  return `.aiops/local/**
.aiops/cache/**
.aiops/tmp/**
`;
}

export function projectReadme(answers: BootstrapAnswers): string {
  return `# ${answers.projectId}

This directory is the canonical AIOps knowledge base for this project.

## Navigation

- PRD: ./prd/
- Architecture: ./architecture/
- Specs: ./specs/
- ADR: ./adr/
- Workflows: ./workflows/
- Human guides: ./guides/

## Product Domains

${answers.productDomains.map((domain) => `- ${domain}`).join("\n")}
`;
}

export function openQuestions(): string {
  return `# Open Questions

Use this file for unresolved project knowledge questions that need human confirmation.
`;
}

export function pendingMd(): string {
  return `# Pending AIOps Diff Records

Hooks and agents append semantic maintenance notes here.

## Pending

`;
}

export function categoryReadme(title: string): string {
  return `# ${title}

Add ${title.toLowerCase()} knowledge for this project here.
`;
}

export function guidesPackageJson(projectId: string): string {
  return `{
  "name": "${projectId}-aiops-guides",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vuepress dev docs --host 0.0.0.0",
    "build": "vuepress build docs"
  },
  "devDependencies": {
    "@vuepress/bundler-vite": "^2.0.0-rc.24",
    "vue": "^3.5.0",
    "vuepress": "^2.0.0-rc.24"
  }
}
`;
}

export function guidesDockerCompose(): string {
  return `services:
  guides:
    image: node:24-bookworm
    working_dir: /workspace
    volumes:
      - ./:/workspace
    ports:
      - "8080:8080"
    command: sh -lc "npm install && npm run dev -- --port 8080"
`;
}

export function guidesIndex(projectId: string): string {
  return `# ${projectId} Guides

This site is the human-readable guide layer for the project knowledge base.

- [Overview](./overview.md)
- [Onboarding](./onboarding.md)
- [Change Playbook](./change-playbook.md)
`;
}

export function guidesOverview(projectId: string): string {
  return `# Overview

Summarize what ${projectId} does, who uses it, and which product domains it contains.
`;
}

export function guidesOnboarding(): string {
  return `# Onboarding

Summarize the fastest path for a developer or coding agent to understand this project.
`;
}

export function guidesChangePlaybook(): string {
  return `# Change Playbook

Summarize how to use this knowledge base when planning, implementing, reviewing, and documenting changes.
`;
}

export function vuepressConfig(projectId: string): string {
  return `import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";

export default defineUserConfig({
  lang: "zh-CN",
  title: "${projectId} Guides",
  description: "Human-readable AIOps project guides.",
  bundler: viteBundler(),
  theme: null
});
`;
}
