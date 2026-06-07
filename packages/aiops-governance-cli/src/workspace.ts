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
  governanceYaml,
  guidesChangePlaybook,
  guidesDockerCompose,
  guidesIndex,
  guidesOnboarding,
  guidesOverview,
  guidesPackageJson,
  gitignoreEntries,
  openQuestions,
  pendingMd,
  projectReadme,
  projectYaml,
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
  await ensureDir(path.join(aiopsRoot, "diff-records"), created, skipped);
  await ensureDir(path.join(aiopsRoot, "diff-records", "archived"), created, skipped);
  await ensureGitignore(workspaceRoot, created, updated, skipped);
  await ensureFile(
    path.join(aiopsRoot, "diff-records", "pending.md"),
    pendingMd(),
    created,
    skipped
  );
  await ensureFile(
    path.join(aiopsRoot, "governance.yaml"),
    governanceYaml(answers),
    created,
    skipped
  );

  await ensureDir(path.join(aiopsRoot, "hooks"), created, skipped);
  for (const template of listWorkspaceHookTemplates()) {
    await ensureFile(
      path.join(workspaceRoot, template.relativePath),
      template.content,
      created,
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
  await ensureFile(path.join(projectRoot, "README.md"), projectReadme(answers), created, skipped);
  await ensureFile(path.join(projectRoot, "open-questions.md"), openQuestions(), created, skipped);

  for (const category of ["prd", "architecture", "specs", "adr", "workflows"]) {
    await ensureDir(path.join(projectRoot, category), created, skipped);
    await ensureFile(
      path.join(projectRoot, category, "README.md"),
      categoryReadme(category),
      created,
      skipped
    );
  }

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

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
