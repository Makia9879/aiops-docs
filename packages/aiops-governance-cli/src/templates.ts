import type { BootstrapAnswers, BootstrapProduct, BootstrapService } from "./questions.js";

export function governanceYaml(answers: BootstrapAnswers): string {
  return `schema_version: 1
default_project: ${yamlString(answers.projectId)}
governance_level: ${answers.governanceLevel}
knowledge_language: ${yamlString(answers.knowledgeLanguage)}
projects_root: .aiops/projects
diff_records: .aiops/diff-records/pending.md
maintenance_runner:
  type: claude_code
  command: claude
  fallback: prompt_subagent
  modes:
    high: async
    xhigh: sync
projects:
  - ${yamlString(answers.projectId)}
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
  return `schema_version: 2
project: ${yamlString(answers.projectId)}
display_name: ${yamlString(answers.projectId)}
governance_level: ${answers.governanceLevel}
knowledge_language: ${yamlString(answers.knowledgeLanguage)}
canonical_paths:
  iterations: iterations/
  products: products/
  guides: guides/
products:
${answers.products.map(productRegistryYaml).join("\n")}
tools:
  understand_anything: unknown
  codegraph: unknown
  trellis: ${tools.trellis}
`;
}

export function iterationBindingsYaml(answers: BootstrapAnswers): string {
  return `schema_version: 1
project: ${yamlString(answers.projectId)}

iterations:
  - id: ${yamlString(answers.projectIteration)}
    docs_branch: ${yamlString(answers.docsBranch)}
    docs_path: ${yamlString(`iterations/${answers.projectIteration}`)}
    products:
${answers.products.map((product) => iterationProductYaml(product, answers.projectIteration)).join("\n")}
`;
}

export function productYaml(projectId: string, product: BootstrapProduct): string {
  return `product: ${yamlString(product.id)}
project: ${yamlString(projectId)}
name: ${yamlString(product.name)}

services:
${product.services.map((service) => `  - id: ${yamlString(service.id)}
    code_root: ${yamlString(service.codeRoot)}
    docs_path: ${yamlString(`services/${service.id}`)}`).join("\n")}
`;
}

export function serviceYaml(
  projectId: string,
  product: BootstrapProduct,
  service: BootstrapService
): string {
  return `service: ${yamlString(service.id)}
product: ${yamlString(product.id)}
project: ${yamlString(projectId)}
code_root: ${yamlString(service.codeRoot)}
docs_path: ${yamlString(`products/${product.id}/services/${service.id}`)}
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

- Project iterations: ./iterations/
- Products: ./products/
- Human guides: ./guides/

## Products

${answers.products.map((product) => `- ${product.id}: ${product.services.map((service) => service.id).join(", ")}`).join("\n")}
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

export function iterationYaml(projectId: string, iteration: string): string {
  return `project: ${yamlString(projectId)}
iteration: ${yamlString(iteration)}
status: draft
`;
}

export function iterationDoc(title: string, iteration: string): string {
  return `# ${title}

Summary: Add ${iteration} ${title.toLowerCase()} here.
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
- Iterations: ./iterations/
- Products: ./products/
- Services: ./services/
`;
}

export function guidesOverview(projectId: string): string {
  return `# Overview

Summarize what ${projectId} does, who uses it, which products it contains, and which services belong to those products.
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

function productRegistryYaml(product: BootstrapProduct): string {
  return `  - id: ${yamlString(product.id)}
    name: ${yamlString(product.name)}
    path: ${yamlString(`products/${product.id}`)}
    services:
${product.services.map((service) => `      - ${yamlString(service.id)}`).join("\n")}`;
}

function iterationProductYaml(product: BootstrapProduct, iteration: string): string {
  return `      - id: ${yamlString(product.id)}
        version: ${yamlString(iteration)}
        docs_path: ${yamlString(`products/${product.id}`)}
        services:
${product.services.map(iterationServiceYaml).join("\n")}`;
}

function iterationServiceYaml(service: BootstrapService): string {
  return `          - id: ${yamlString(service.id)}
            code_root: ${yamlString(service.codeRoot)}
            required_branch: ${yamlString(service.requiredBranch)}`;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}
