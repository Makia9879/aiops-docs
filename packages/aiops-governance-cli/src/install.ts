import { constants as fsConstants } from "node:fs";
import { access, cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export interface InstallOptions {
  cwd: string;
  skillsSource?: string;
  skillsTarget?: string;
}

export interface InstallResult {
  sourceRoot: string;
  targets: string[];
  installed: string[];
  updated: string[];
  skipped: string[];
}

const REQUIRED_SKILLS = [
  "aiops-dev-context-recall",
  "aiops-daily-doc-maintenance",
  "aiops-governance-bootstrap",
  "aiops-historical-project-intake",
  "aiops-knowledge-lifecycle",
  "aiops-knowledge-review",
  "aiops-new-project-briefing"
];

export async function installSkills(options: InstallOptions): Promise<InstallResult> {
  const sourceRoot = await resolveSkillsSource(options);
  const targets = resolveSkillsTargets(options.skillsTarget);
  const installed: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  for (const targetRoot of targets) {
    await mkdir(targetRoot, { recursive: true });

    for (const skillName of REQUIRED_SKILLS) {
      const source = path.join(sourceRoot, skillName);
      const target = path.join(targetRoot, skillName);

      if (!(await exists(path.join(source, "SKILL.md")))) {
        throw new Error(`Missing required skill source: ${source}`);
      }

      if (!(await exists(target))) {
        await cp(source, target, { recursive: true });
        installed.push(target);
        continue;
      }

      if (await directoriesHaveSameContent(source, target)) {
        skipped.push(target);
        continue;
      }

      await rm(target, { recursive: true, force: true });
      await cp(source, target, { recursive: true });
      updated.push(target);
    }
  }

  return {
    sourceRoot,
    targets,
    installed,
    updated,
    skipped
  };
}

async function resolveSkillsSource(options: InstallOptions): Promise<string> {
  const explicit = options.skillsSource ?? process.env.AIOPS_SKILLS_SOURCE;
  if (explicit) {
    return assertSkillsSource(path.resolve(options.cwd, explicit));
  }

  const packagedSource = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "assets",
    "skills"
  );
  if (await isSkillsSource(packagedSource)) {
    return packagedSource;
  }

  let current = path.resolve(options.cwd);
  while (true) {
    const candidate = path.join(current, "skills");
    if (await isSkillsSource(candidate)) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new Error(
    "Cannot find AIOps skills source. Run from the aiops-docs workspace or set AIOPS_SKILLS_SOURCE."
  );
}

function resolveSkillsTargets(explicitTarget: string | undefined): string[] {
  const explicit = explicitTarget ?? process.env.AIOPS_SKILLS_TARGETS;
  const rawTargets = explicit
    ? explicit.split(path.delimiter)
    : [
        path.join(os.homedir(), ".agents", "skills"),
        path.join(os.homedir(), ".codex", "skills")
      ];

  return Array.from(
    new Set(
      rawTargets
        .map((target) => target.trim())
        .filter(Boolean)
        .map((target) => path.resolve(target))
    )
  );
}

async function assertSkillsSource(candidate: string): Promise<string> {
  if (await isSkillsSource(candidate)) {
    return candidate;
  }

  throw new Error(`Invalid AIOps skills source: ${candidate}`);
}

async function isSkillsSource(candidate: string): Promise<boolean> {
  return exists(path.join(candidate, "aiops-knowledge-lifecycle", "SKILL.md"));
}

async function directoriesHaveSameContent(left: string, right: string): Promise<boolean> {
  const [leftFiles, rightFiles] = await Promise.all([
    listRelativeFiles(left),
    listRelativeFiles(right)
  ]);

  if (leftFiles.length !== rightFiles.length) {
    return false;
  }

  for (let index = 0; index < leftFiles.length; index += 1) {
    if (leftFiles[index] !== rightFiles[index]) {
      return false;
    }
  }

  for (const relativePath of leftFiles) {
    const [leftHash, rightHash] = await Promise.all([
      hashFile(path.join(left, relativePath)),
      hashFile(path.join(right, relativePath))
    ]);
    if (leftHash !== rightHash) {
      return false;
    }
  }

  return true;
}

async function listRelativeFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        files.push(path.relative(root, absolute));
      }
    }
  }

  await walk(root);
  return files.sort();
}

async function hashFile(target: string): Promise<string> {
  const content = await readFile(target);
  return createHash("sha256").update(content).digest("hex");
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}
