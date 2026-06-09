import { chmod, cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "..", "..");
const source = resolve(repoRoot, "skills");
const target = resolve(packageRoot, "assets", "skills");
const cliEntry = resolve(packageRoot, "dist", "cli.js");

await rm(target, { recursive: true, force: true });
await mkdir(dirname(target), { recursive: true });
await cp(source, target, {
  recursive: true,
  filter: (entry) => !entry.includes(".DS_Store")
});
await chmod(cliEntry, 0o755);

console.log(`Prepared packaged skills: ${target}`);
