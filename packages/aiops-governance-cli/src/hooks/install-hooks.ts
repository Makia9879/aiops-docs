import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { appendClaudeCodeAiopsHooks, appendCodexAiopsHooks } from "../platforms/index.js";
import { listWorkspaceHookTemplates } from "./workspace-hooks.js";

export interface HookInstallResult {
  readonly created: string[];
  readonly updated: string[];
  readonly skipped: string[];
}

export interface HookInstallOptions {
  readonly installCodex?: boolean;
  readonly installClaudeCode?: boolean;
}

export async function installAiopsHooks(
  workspaceRoot: string,
  options: HookInstallOptions = {}
): Promise<HookInstallResult> {
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const installCodex = options.installCodex ?? true;
  const installClaudeCode = options.installClaudeCode ?? true;

  for (const template of listWorkspaceHookTemplates()) {
    await ensureFile(
      path.join(workspaceRoot, template.relativePath),
      template.content,
      created,
      skipped
    );
  }

  if (installCodex) {
    await updateJsonFile(
      path.join(workspaceRoot, ".codex", "hooks.json"),
      appendCodexAiopsHooks,
      created,
      updated,
      skipped
    );
  }

  if (installClaudeCode) {
    await updateJsonFile(
      path.join(workspaceRoot, ".claude", "settings.json"),
      appendClaudeCodeAiopsHooks,
      created,
      updated,
      skipped
    );
  }

  return { created, updated, skipped };
}

async function updateJsonFile(
  target: string,
  updater: (existingText: string) => string,
  created: string[],
  updated: string[],
  skipped: string[]
): Promise<void> {
  const existed = await exists(target);
  const before = existed ? await readFile(target, "utf8") : "";
  const after = updater(before);

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
  await writeFile(target, content, { encoding: "utf8", mode: 0o755 });
  created.push(target);
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
