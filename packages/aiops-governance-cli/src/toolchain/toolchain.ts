import { constants } from "node:fs";
import { access, chmod, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import versions from "./versions.json" with { type: "json" };

export type ToolName = keyof typeof versions;

export interface ToolchainTool {
  name: ToolName;
  packageName: string;
  version: string;
  bin: string | null;
}

export interface ToolchainInstallOptions {
  selection?: string;
  toolNames?: ToolName[];
  toolsRoot?: string;
}

export interface ToolchainInstallResult {
  toolsRoot: string;
  binRoot: string;
  installed: string[];
  updated: string[];
  skipped: string[];
  shims: string[];
}

export interface ToolchainUninstallOptions {
  selection?: string;
  toolsRoot?: string;
}

export interface ToolchainUninstallResult {
  toolsRoot: string;
  binRoot: string;
  removed: string[];
  skipped: string[];
}

export type ToolchainCheckStatus = "ready" | "missing" | "version-mismatch" | "incomplete";

export interface ToolchainCheckOptions {
  selection?: string;
  toolsRoot?: string;
}

export interface ToolchainCheckItem {
  name: ToolName;
  packageName: string;
  expectedVersion: string;
  installedVersion: string | null;
  installedToolRoot: string | null;
  bin: string | null;
  toolRoot: string;
  shimPath: string | null;
  status: ToolchainCheckStatus;
  issues: string[];
}

export interface ToolchainCheckResult {
  toolsRoot: string;
  binRoot: string;
  selected: ToolName[];
  tools: ToolchainCheckItem[];
  ready: ToolchainCheckItem[];
  needsInstall: ToolchainCheckItem[];
  skipped: string[];
}

export const DEFAULT_TOOL_NAMES = Object.keys(versions) as ToolName[];

export async function checkToolchain(
  options: ToolchainCheckOptions
): Promise<ToolchainCheckResult> {
  const selected = parseToolSelection(options.selection);
  const { toolsRoot, binRoot } = resolveToolchainRoots(options.toolsRoot);
  const tools: ToolchainCheckItem[] = [];
  const skipped: string[] = [];

  for (const tool of selected.map(resolveTool)) {
    tools.push(await checkTool(tool, toolsRoot, binRoot));
  }

  if (selected.length === 0) {
    skipped.push("toolchain: disabled by --with none");
  }

  const ready = tools.filter((tool) => tool.status === "ready");
  const needsInstall = tools.filter((tool) => tool.status !== "ready");

  return {
    toolsRoot,
    binRoot,
    selected,
    tools,
    ready,
    needsInstall,
    skipped
  };
}

export async function installToolchain(
  options: ToolchainInstallOptions
): Promise<ToolchainInstallResult> {
  const selected = options.toolNames ?? parseToolSelection(options.selection);
  const { toolsRoot, binRoot } = resolveToolchainRoots(options.toolsRoot);
  const installed: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const shims: string[] = [];

  await mkdir(toolsRoot, { recursive: true });
  await mkdir(binRoot, { recursive: true });

  for (const tool of selected.map(resolveTool)) {
    const toolRoot = path.join(toolsRoot, tool.name, tool.version);
    const packageJsonPath = path.join(toolRoot, "package.json");
    const existed = await exists(packageJsonPath);

    await mkdir(toolRoot, { recursive: true });
    await writeFile(
      packageJsonPath,
      JSON.stringify(
        {
          private: true,
          dependencies: {
            [tool.packageName]: tool.version
          }
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    await runNpmInstall(toolRoot);
    if (existed) {
      updated.push(`${tool.name}@${tool.version}`);
    } else {
      installed.push(`${tool.name}@${tool.version}`);
    }

    if (tool.bin) {
      const shimPath = await writeShim(tool, toolRoot, binRoot);
      shims.push(shimPath);
    } else {
      skipped.push(`${tool.name}@${tool.version}: no bin declared`);
    }
  }

  if (selected.length === 0) {
    skipped.push("toolchain: disabled by --with none");
  }

  return {
    toolsRoot,
    binRoot,
    installed,
    updated,
    skipped,
    shims
  };
}

export async function uninstallToolchain(
  options: ToolchainUninstallOptions
): Promise<ToolchainUninstallResult> {
  const selected = parseToolSelection(options.selection);
  const { toolsRoot, binRoot } = resolveToolchainRoots(options.toolsRoot);
  const removed: string[] = [];
  const skipped: string[] = [];

  for (const tool of selected.map(resolveTool)) {
    const toolBaseRoot = path.join(toolsRoot, tool.name);
    if (await exists(toolBaseRoot)) {
      await rm(toolBaseRoot, { recursive: true, force: true });
      removed.push(toolBaseRoot);
    } else {
      skipped.push(toolBaseRoot);
    }

    if (tool.bin) {
      const shimPath = path.join(binRoot, tool.bin);
      if (await exists(shimPath)) {
        await rm(shimPath, { force: true });
        removed.push(shimPath);
      } else {
        skipped.push(shimPath);
      }
    }
  }

  if (selected.length === 0) {
    skipped.push("toolchain: disabled by --with none");
  }

  return {
    toolsRoot,
    binRoot,
    removed,
    skipped
  };
}

function resolveToolchainRoots(toolsRootOption: string | undefined): {
  toolsRoot: string;
  binRoot: string;
} {
  const toolsRoot = path.resolve(
    toolsRootOption ?? process.env.AIOPS_TOOLS_ROOT ?? path.join(os.homedir(), ".aiops", "tools")
  );
  return {
    toolsRoot,
    binRoot: path.join(path.dirname(toolsRoot), "bin")
  };
}

export function parseToolSelection(value: string | undefined): ToolName[] {
  if (!value || value.trim() === "default") {
    return DEFAULT_TOOL_NAMES;
  }

  if (value.trim() === "none") {
    return [];
  }

  const requested = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const result: ToolName[] = [];
  for (const item of requested) {
    if (!isToolName(item)) {
      throw new Error(
        `Unknown tool "${item}". Expected one of: ${DEFAULT_TOOL_NAMES.join(", ")}, none`
      );
    }
    if (!result.includes(item)) {
      result.push(item);
    }
  }

  return result;
}

function resolveTool(name: ToolName): ToolchainTool {
  const spec = versions[name];
  return {
    name,
    packageName: spec.package,
    version: spec.version,
    bin: spec.bin
  };
}

async function checkTool(
  tool: ToolchainTool,
  toolsRoot: string,
  binRoot: string
): Promise<ToolchainCheckItem> {
  const toolRoot = path.join(toolsRoot, tool.name, tool.version);
  const packageJsonPath = getInstalledPackageJsonPath(tool, toolRoot);
  const expectedInstall = await readInstalledPackageInfo(packageJsonPath, toolRoot);
  const installed = expectedInstall ?? await findAnyInstalledPackage(tool, toolsRoot);
  const installedVersion = installed?.version ?? null;
  const shimPath = tool.bin ? path.join(binRoot, tool.bin) : null;
  const issues: string[] = [];

  if (!installedVersion) {
    issues.push(`missing package ${tool.packageName}@${tool.version}`);
  } else if (installedVersion !== tool.version) {
    issues.push(`version mismatch: installed ${installedVersion}, expected ${tool.version}`);
    if (installed?.toolRoot && installed.toolRoot !== toolRoot) {
      issues.push(`installed root ${installed.toolRoot}`);
    }
  }

  if (shimPath && !(await canExecute(shimPath))) {
    issues.push(`missing executable shim ${shimPath}`);
  }

  let status: ToolchainCheckStatus = "ready";
  if (!installedVersion) {
    status = "missing";
  } else if (installedVersion !== tool.version) {
    status = "version-mismatch";
  } else if (issues.length > 0) {
    status = "incomplete";
  }

  return {
    name: tool.name,
    packageName: tool.packageName,
    expectedVersion: tool.version,
    installedVersion,
    installedToolRoot: installed?.toolRoot ?? null,
    bin: tool.bin,
    toolRoot,
    shimPath,
    status,
    issues
  };
}

async function runNpmInstall(cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["install", "--save-exact"], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install failed in ${cwd} with exit code ${code}`));
      }
    });
  });
}

async function writeShim(
  tool: ToolchainTool,
  toolRoot: string,
  binRoot: string
): Promise<string> {
  if (!tool.bin) {
    throw new Error(`Cannot create shim for ${tool.name}; no bin declared.`);
  }

  const packageBin = path.join(toolRoot, "node_modules", ".bin", tool.bin);
  if (!(await exists(packageBin))) {
    const packageJson = await findInstalledPackageJson(tool, toolRoot);
    throw new Error(
      `Installed ${tool.packageName}@${tool.version}, but bin "${tool.bin}" was not found at ${packageBin}. Package metadata: ${packageJson}`
    );
  }

  const shimPath = path.join(binRoot, tool.bin);
  const content = `#!/usr/bin/env sh
exec ${quoteShellArg(packageBin)} "$@"
`;
  await writeFile(shimPath, content, "utf8");
  await chmod(shimPath, 0o755);
  return shimPath;
}

async function findInstalledPackageJson(
  tool: ToolchainTool,
  toolRoot: string
): Promise<string> {
  const packageJsonPath = getInstalledPackageJsonPath(tool, toolRoot);
  if (!(await exists(packageJsonPath))) {
    return "package.json not found";
  }
  return readFile(packageJsonPath, "utf8");
}

function getInstalledPackageJsonPath(tool: ToolchainTool, toolRoot: string): string {
  return path.join(toolRoot, "node_modules", ...tool.packageName.split("/"), "package.json");
}

function isToolName(value: string): value is ToolName {
  return Object.prototype.hasOwnProperty.call(versions, value);
}

function quoteShellArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function canExecute(target: string): Promise<boolean> {
  try {
    await access(target, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

interface InstalledPackageInfo {
  version: string;
  toolRoot: string;
}

async function readInstalledPackageInfo(
  packageJsonPath: string,
  toolRoot: string
): Promise<InstalledPackageInfo | null> {
  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      version?: unknown;
    };
    return typeof packageJson.version === "string"
      ? { version: packageJson.version, toolRoot }
      : null;
  } catch {
    return null;
  }
}

async function findAnyInstalledPackage(
  tool: ToolchainTool,
  toolsRoot: string
): Promise<InstalledPackageInfo | null> {
  const toolBaseRoot = path.join(toolsRoot, tool.name);

  try {
    const versions = await readdir(toolBaseRoot, { withFileTypes: true });
    const candidates = versions
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(toolBaseRoot, entry.name))
      .sort()
      .reverse();

    for (const candidateRoot of candidates) {
      const packageJsonPath = getInstalledPackageJsonPath(tool, candidateRoot);
      const installed = await readInstalledPackageInfo(packageJsonPath, candidateRoot);
      if (installed) {
        return installed;
      }
    }
  } catch {
    return null;
  }

  return null;
}
