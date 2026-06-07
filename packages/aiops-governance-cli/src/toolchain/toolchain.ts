import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
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

export const DEFAULT_TOOL_NAMES = Object.keys(versions) as ToolName[];

export async function installToolchain(
  options: ToolchainInstallOptions
): Promise<ToolchainInstallResult> {
  const selected = parseToolSelection(options.selection);
  const toolsRoot = path.resolve(
    options.toolsRoot ?? process.env.AIOPS_TOOLS_ROOT ?? path.join(os.homedir(), ".aiops", "tools")
  );
  const binRoot = path.join(path.dirname(toolsRoot), "bin");
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
  const packageJsonPath = path.join(toolRoot, "node_modules", ...tool.packageName.split("/"), "package.json");
  if (!(await exists(packageJsonPath))) {
    return "package.json not found";
  }
  return readFile(packageJsonPath, "utf8");
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
