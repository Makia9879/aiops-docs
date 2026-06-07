#!/usr/bin/env node
import { parseArgs } from "./args.js";
import { installSkills } from "./install.js";
import {
  inferProjectId,
  initializeWorkspace
} from "./workspace.js";
import {
  normalizeProjectId,
  parseGovernanceLevel,
  parseProductDomains,
  type BootstrapAnswers
} from "./questions.js";
import { promptForAnswers } from "./tui.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "help") {
    printHelp();
    return;
  }

  if (args.command === "install") {
    await runInstall(args);
    return;
  }

  if (args.command === "setup") {
    await runInstall(args);
    await runInit(args);
    return;
  }

  await runInit(args);
}

async function runInstall(args: ReturnType<typeof parseArgs>): Promise<void> {
  const result = await installSkills({
    cwd: args.cwd,
    skillsSource: args.skillsSource,
    skillsTarget: args.skillsTarget
  });

  console.log(`Skills source: ${result.sourceRoot}`);
  console.log(`Skills targets: ${result.targets.join(", ")}`);
  console.log(`Installed: ${result.installed.length}`);
  console.log(`Updated: ${result.updated.length}`);
  console.log(`Skipped existing: ${result.skipped.length}`);
}

async function runInit(args: ReturnType<typeof parseArgs>): Promise<void> {
  const inferredProjectId = normalizeProjectId(args.project ?? (await inferProjectId(args.cwd)));
  const defaults: BootstrapAnswers = {
    projectId: inferredProjectId,
    productDomains: parseProductDomains(args.products),
    governanceLevel: parseGovernanceLevel(args.level ?? "high"),
    knowledgeLanguage: args.language ?? "zh-CN"
  };

  const answers = args.yes
    ? defaults
    : await promptForAnswers(defaults);

  const result = await initializeWorkspace(args.cwd, answers);

  console.log(`Workspace: ${result.workspaceRoot}`);
  console.log(`AIOps root: ${result.aiopsRoot}`);
  console.log(`Project: ${answers.projectId}`);
  console.log(`Created: ${result.created.length}`);
  console.log(`Updated: ${result.updated.length}`);
  console.log(`Skipped existing: ${result.skipped.length}`);
}

function printHelp(): void {
  console.log(`Usage: aiops-governance <command> [options]

Commands:
  install              Install AIOps skills to agent runtime directories
  init                 Initialize AIOps governance in the current workspace
  setup                Run install, then init

Options:
  -y, --yes            Accept defaults and do not prompt
  --project <id>       Project id under .aiops/projects/
  --products <list>    Comma-separated product domains; default core
  --level <level>      low, medium, high, or xhigh; default high
  --language <lang>    Knowledge language; default zh-CN
  --skills-source <p>  AIOps skill source directory; default discovers ./skills
  --skills-target <p>  Runtime skills directory; default ~/.agents/skills and ~/.codex/skills
  -h, --help           Show this help
`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`aiops-governance: ${message}`);
  process.exitCode = 1;
});
