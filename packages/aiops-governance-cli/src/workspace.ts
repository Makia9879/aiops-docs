import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { listWorkspaceHookTemplates } from "./hooks/workspace-hooks.js";
import {
  appendClaudeCodeAiopsHooks,
  appendCodexAiopsHooks
} from "./platforms/index.js";
import type { BootstrapAnswers } from "./questions.js";
import {
  categoryReadme,
  commitAnalysisMd,
  governanceYaml,
  guidesChangePlaybook,
  guidesDockerCompose,
  guidesIndex,
  guidesOnboarding,
  guidesOverview,
  guidesPackageJson,
  gitignoreEntries,
  iterationBindingsYaml,
  iterationDoc,
  iterationYaml,
  openQuestions,
  productYaml,
  projectReadme,
  projectYaml,
  serviceYaml,
  vuepressConfig
} from "./templates.js";

export interface InitResult {
  workspaceRoot: string;
  aiopsRoot: string;
  projectRoot: string;
  created: string[];
  updated: string[];
  skipped: string[];
}

export interface LinkDocsResult {
  sourceRoot: string;
  docsRepo: string;
  created: string[];
  updated: string[];
  skipped: string[];
}

export async function discoverWorkspaceRoot(startDir: string): Promise<string> {
  let current = path.resolve(startDir);

  while (true) {
    if (await exists(path.join(current, ".aiops"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }

    current = parent;
  }
}

export async function inferProjectId(startDir: string): Promise<string> {
  const packageJsonPath = path.join(startDir, "package.json");
  if (await exists(packageJsonPath)) {
    try {
      const raw = await readFile(packageJsonPath, "utf8");
      const manifest = JSON.parse(raw) as { name?: unknown };
      if (typeof manifest.name === "string" && manifest.name.trim()) {
        return manifest.name;
      }
    } catch {
      // Fall back to the directory name; init should not fail because a manifest is malformed.
    }
  }

  return path.basename(path.resolve(startDir));
}

export async function linkDocsRepository(
  sourceDir: string,
  docsRepo: string
): Promise<LinkDocsResult> {
  const sourceRoot = path.resolve(sourceDir);
  const resolvedDocsRepo = path.resolve(sourceRoot, docsRepo);
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  if (!(await exists(path.join(resolvedDocsRepo, ".aiops")))) {
    throw new Error(`Docs repo does not contain .aiops: ${resolvedDocsRepo}`);
  }

  await ensureLocalDocsLink(sourceRoot, docsRepo, created, updated, skipped);
  await ensureSourceHookRunner(sourceRoot, created, updated, skipped);
  await ensureSourcePrePushHook(sourceRoot, created, updated, skipped);
  await ensureGitignoreEntry(sourceRoot, ".aiops-docs.yaml", created, updated, skipped);
  await ensureGitignoreEntry(sourceRoot, ".aiops-hook-runner.sh", created, updated, skipped);
  await ensurePlatformHookConfigs(sourceRoot, created, updated, skipped);

  return {
    sourceRoot,
    docsRepo: resolvedDocsRepo,
    created,
    updated,
    skipped
  };
}

async function ensureSourceHookRunner(
  sourceRoot: string,
  created: string[],
  updated: string[],
  skipped: string[]
): Promise<void> {
  const target = path.join(sourceRoot, ".aiops-hook-runner.sh");
  const content = `#!/usr/bin/env sh
set -eu
link_file="\${PWD:-.}/.aiops-docs.yaml"
if [ ! -f "$link_file" ]; then
  echo "AIOps: missing .aiops-docs.yaml; run aiops link-docs."
  exit 0
fi
docs_repo=$(sed -n "s/^[[:space:]]*docs_repo:[[:space:]]*//p" "$link_file" | head -n 1)
docs_repo=\${docs_repo#\\"}
docs_repo=\${docs_repo%\\"}
docs_repo=\${docs_repo#\\'}
docs_repo=\${docs_repo%\\'}
case "$docs_repo" in
  /*) ;;
  "") echo "AIOps: empty docs_repo in .aiops-docs.yaml."; exit 0 ;;
  *) docs_repo="\${PWD:-.}/$docs_repo" ;;
esac
runner="$docs_repo/.aiops/hooks/aiops_hook_runner.sh"
if [ ! -x "$runner" ]; then
  echo "AIOps: missing $runner; rerun aiops init in the docs repo."
  exit 0
fi
exec "$runner" "$@"
`;

  if (!(await exists(target))) {
    await writeFile(target, content, { encoding: "utf8", mode: 0o755 });
    created.push(target);
    return;
  }

  const before = await readFile(target, "utf8");
  if (before === content) {
    skipped.push(target);
    return;
  }

  await writeFile(target, content, { encoding: "utf8", mode: 0o755 });
  updated.push(target);
}

async function ensureSourcePrePushHook(
  sourceRoot: string,
  created: string[],
  updated: string[],
  skipped: string[]
): Promise<void> {
  const gitRoot = path.join(sourceRoot, ".git");
  if (!(await exists(gitRoot))) {
    skipped.push(path.join(gitRoot, "hooks", "pre-push"));
    return;
  }

  const target = path.join(sourceRoot, ".git", "hooks", "pre-push");
  const managedBlock = `# >>> aiops push maintenance >>>
runner="\${PWD:-.}/.aiops-hook-runner.sh"
if [ -x "$runner" ]; then
  "$runner" push-maintenance pre-push
else
  echo "AIOps: missing .aiops-hook-runner.sh; run aiops link-docs."
fi
# <<< aiops push maintenance <<<
`;

  if (!(await exists(target))) {
    const content = `#!/usr/bin/env sh
set -eu

${managedBlock}`;
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, { encoding: "utf8", mode: 0o755 });
    created.push(target);
    return;
  }

  const before = await readFile(target, "utf8");
  const begin = "# >>> aiops push maintenance >>>";
  const end = "# <<< aiops push maintenance <<<";
  const markerPattern = new RegExp(`${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}\\n?`);
  const after = markerPattern.test(before)
    ? before.replace(markerPattern, managedBlock)
    : insertManagedShellBlock(before, managedBlock);

  if (before === after) {
    skipped.push(target);
    return;
  }

  await writeFile(target, after, { encoding: "utf8", mode: 0o755 });
  updated.push(target);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insertManagedShellBlock(existing: string, block: string): string {
  const lines = existing.split(/\r?\n/);
  if (lines[0]?.startsWith("#!")) {
    return [lines[0], block.trimEnd(), ...lines.slice(1)].join("\n");
  }
  return `${block}${existing.startsWith("\n") ? "" : "\n"}${existing}`;
}

async function ensureLocalDocsLink(
  sourceRoot: string,
  docsRepo: string,
  created: string[],
  updated: string[],
  skipped: string[]
): Promise<void> {
  const target = path.join(sourceRoot, ".aiops-docs.yaml");
  const next = `docs_repo: ${docsRepo}\n`;

  if (!(await exists(target))) {
    await writeFile(target, next, "utf8");
    created.push(target);
    return;
  }

  const before = await readFile(target, "utf8");
  if (before === next) {
    skipped.push(target);
    return;
  }

  await writeFile(target, next, "utf8");
  updated.push(target);
}

export async function initializeWorkspace(
  startDir: string,
  answers: BootstrapAnswers
): Promise<InitResult> {
  const workspaceRoot = await discoverWorkspaceRoot(startDir);
  const aiopsRoot = path.join(workspaceRoot, ".aiops");
  const projectRoot = path.join(aiopsRoot, "projects", answers.projectId);
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  await ensureDir(aiopsRoot, created, skipped);
  await ensureDir(path.join(aiopsRoot, "local"), created, skipped);
  await ensureDir(path.join(aiopsRoot, "cache"), created, skipped);
  await ensureDir(path.join(aiopsRoot, "tmp"), created, skipped);
  await ensureGitignore(workspaceRoot, created, updated, skipped);
  await ensureFile(
    path.join(aiopsRoot, "governance.yaml"),
    governanceYaml(answers),
    created,
    skipped
  );

  await ensureDir(path.join(aiopsRoot, "hooks"), created, skipped);
  for (const template of listWorkspaceHookTemplates()) {
    await ensureManagedHookFile(
      path.join(workspaceRoot, template.relativePath),
      template.content,
      created,
      updated,
      skipped
    );
  }

  await ensureDir(path.join(aiopsRoot, "projects"), created, skipped);
  await ensureDir(projectRoot, created, skipped);
  await ensureFile(
    path.join(projectRoot, "project.yaml"),
    projectYaml(answers, { trellis: (await exists(path.join(workspaceRoot, ".trellis"))) ? "detected" : "unknown" }),
    created,
    skipped
  );
  await ensureFile(
    path.join(projectRoot, "iteration-bindings.yaml"),
    iterationBindingsYaml(answers),
    created,
    skipped
  );
  await ensureFile(path.join(projectRoot, "commit-analysis.md"), commitAnalysisMd(), created, skipped);
  await ensureFile(path.join(projectRoot, "README.md"), projectReadme(answers), created, skipped);
  await ensureFile(path.join(projectRoot, "open-questions.md"), openQuestions(), created, skipped);

  await ensureIterationDocs(projectRoot, answers, created, skipped);
  await ensureProductDocs(projectRoot, answers, created, skipped);

  await ensureGuides(projectRoot, answers, created, skipped);
  await ensurePlatformHookConfigs(workspaceRoot, created, updated, skipped);

  return {
    workspaceRoot,
    aiopsRoot,
    projectRoot,
    created,
    updated,
    skipped
  };
}

async function ensureIterationDocs(
  projectRoot: string,
  answers: BootstrapAnswers,
  created: string[],
  skipped: string[]
): Promise<void> {
  const iterationsRoot = path.join(projectRoot, "iterations");
  const iterationRoot = path.join(iterationsRoot, answers.projectIteration);

  await ensureDir(iterationsRoot, created, skipped);
  await ensureDir(iterationRoot, created, skipped);
  await ensureFile(
    path.join(iterationRoot, "iteration.yaml"),
    iterationYaml(answers.projectId, answers.projectIteration),
    created,
    skipped
  );
  for (const file of ["prd.md", "architecture.md", "release-scope.md", "risks.md"]) {
    await ensureFile(
      path.join(iterationRoot, file),
      iterationDoc(file.replace(/\.md$/, ""), answers.projectIteration),
      created,
      skipped
    );
  }
}

async function ensureProductDocs(
  projectRoot: string,
  answers: BootstrapAnswers,
  created: string[],
  skipped: string[]
): Promise<void> {
  const productsRoot = path.join(projectRoot, "products");
  await ensureDir(productsRoot, created, skipped);

  for (const product of answers.products) {
    const productRoot = path.join(productsRoot, product.id);
    await ensureDir(productRoot, created, skipped);
    await ensureFile(
      path.join(productRoot, "product.yaml"),
      productYaml(answers.projectId, product),
      created,
      skipped
    );

    for (const category of ["prd", "architecture", "adr", "workflows"]) {
      await ensureDir(path.join(productRoot, category), created, skipped);
      await ensureFile(
        path.join(productRoot, category, "README.md"),
        categoryReadme(category),
        created,
        skipped
      );
    }

    await ensureServiceDocs(productRoot, answers.projectId, product, created, skipped);
  }
}

async function ensureServiceDocs(
  productRoot: string,
  projectId: string,
  product: BootstrapAnswers["products"][number],
  created: string[],
  skipped: string[]
): Promise<void> {
  const servicesRoot = path.join(productRoot, "services");
  await ensureDir(servicesRoot, created, skipped);

  for (const service of product.services) {
    const serviceRoot = path.join(servicesRoot, service.id);
    await ensureDir(serviceRoot, created, skipped);
    await ensureFile(
      path.join(serviceRoot, "service.yaml"),
      serviceYaml(projectId, product, service),
      created,
      skipped
    );

    for (const category of ["architecture", "adr", "workflows"]) {
      await ensureDir(path.join(serviceRoot, category), created, skipped);
      await ensureFile(
        path.join(serviceRoot, category, "README.md"),
        categoryReadme(category),
        created,
        skipped
      );
    }
  }
}

async function ensureGuides(
  projectRoot: string,
  answers: BootstrapAnswers,
  created: string[],
  skipped: string[]
): Promise<void> {
  const guidesRoot = path.join(projectRoot, "guides");
  const docsRoot = path.join(guidesRoot, "docs");
  const vuepressRoot = path.join(docsRoot, ".vuepress");

  await ensureDir(guidesRoot, created, skipped);
  await ensureFile(
    path.join(guidesRoot, "package.json"),
    guidesPackageJson(answers.projectId),
    created,
    skipped
  );
  await ensureFile(
    path.join(guidesRoot, "docker-compose.yaml"),
    guidesDockerCompose(),
    created,
    skipped
  );
  await ensureDir(docsRoot, created, skipped);
  await ensureFile(path.join(docsRoot, "README.md"), guidesIndex(answers.projectId), created, skipped);
  await ensureFile(
    path.join(docsRoot, "overview.md"),
    guidesOverview(answers.projectId),
    created,
    skipped
  );
  await ensureFile(path.join(docsRoot, "onboarding.md"), guidesOnboarding(), created, skipped);
  await ensureFile(
    path.join(docsRoot, "change-playbook.md"),
    guidesChangePlaybook(),
    created,
    skipped
  );
  for (const section of ["iterations", "products", "services"]) {
    await ensureDir(path.join(docsRoot, section), created, skipped);
  }
  await ensureDir(vuepressRoot, created, skipped);
  await ensureFile(
    path.join(vuepressRoot, "config.ts"),
    vuepressConfig(answers.projectId),
    created,
    skipped
  );
}

async function ensureDir(
  target: string,
  created: string[],
  skipped: string[]
): Promise<void> {
  if (await exists(target)) {
    skipped.push(target);
    return;
  }

  await mkdir(target, { recursive: true });
  created.push(target);
}

async function ensureFile(
  target: string,
  content: string,
  created: string[],
  skipped: string[]
): Promise<void> {
  if (await exists(target)) {
    skipped.push(target);
    return;
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
  created.push(target);
}

async function ensureManagedHookFile(
  target: string,
  content: string,
  created: string[],
  updated: string[],
  skipped: string[]
): Promise<void> {
  if (!(await exists(target))) {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, { encoding: "utf8", mode: 0o755 });
    created.push(target);
    return;
  }

  const before = await readFile(target, "utf8");
  if (before === content) {
    skipped.push(target);
    return;
  }

  await writeFile(target, content, { encoding: "utf8", mode: 0o755 });
  updated.push(target);
}

async function ensurePlatformHookConfigs(
  workspaceRoot: string,
  created: string[],
  updated: string[],
  skipped: string[]
): Promise<void> {
  await ensureJsonConfig(
    path.join(workspaceRoot, ".codex", "hooks.json"),
    appendCodexAiopsHooks,
    created,
    updated,
    skipped
  );
  await ensureJsonConfig(
    path.join(workspaceRoot, ".claude", "settings.json"),
    appendClaudeCodeAiopsHooks,
    created,
    updated,
    skipped
  );
}

async function ensureJsonConfig(
  target: string,
  transform: (existingText?: string) => string,
  created: string[],
  updated: string[],
  skipped: string[]
): Promise<void> {
  const existed = await exists(target);
  const before = existed ? await readFile(target, "utf8") : "";
  const after = transform(before);

  if (existed && before === after) {
    skipped.push(target);
    return;
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, after, "utf8");

  if (existed) {
    updated.push(target);
  } else {
    created.push(target);
  }
}

async function ensureGitignore(
  workspaceRoot: string,
  created: string[],
  updated: string[],
  skipped: string[]
): Promise<void> {
  const target = path.join(workspaceRoot, ".gitignore");
  const entries = gitignoreEntries().trimEnd().split("\n");

  if (!(await exists(target))) {
    await writeFile(target, `${gitignoreEntries()}`, "utf8");
    created.push(target);
    return;
  }

  const before = await readFile(target, "utf8");
  const missing = entries.filter((entry) => !before.split(/\r?\n/).includes(entry));
  if (missing.length === 0) {
    skipped.push(target);
    return;
  }

  const separator = before.endsWith("\n") ? "" : "\n";
  await writeFile(target, `${before}${separator}${missing.join("\n")}\n`, "utf8");
  updated.push(target);
}

async function ensureGitignoreEntry(
  workspaceRoot: string,
  entry: string,
  created: string[],
  updated: string[],
  skipped: string[]
): Promise<void> {
  const target = path.join(workspaceRoot, ".gitignore");

  if (!(await exists(target))) {
    await writeFile(target, `${entry}\n`, "utf8");
    created.push(target);
    return;
  }

  const current = await readFile(target, "utf8");
  const lines = current.split(/\r?\n/).map((line) => line.trim());
  if (lines.includes(entry)) {
    skipped.push(target);
    return;
  }

  const suffix = current.endsWith("\n") || current.length === 0 ? "" : "\n";
  await writeFile(target, `${current}${suffix}${entry}\n`, "utf8");
  updated.push(target);
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
