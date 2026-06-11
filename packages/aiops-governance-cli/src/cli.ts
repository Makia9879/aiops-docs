#!/usr/bin/env node
import { parseArgs } from "./args.js";
import { runConfigUi } from "./config-ui.js";
import { installSkills } from "./install.js";
import {
  checkToolchain,
  installToolchain,
  type ToolchainCheckResult
} from "./toolchain/toolchain.js";
import {
  inferProjectId,
  initializeWorkspace,
  linkDocsRepository
} from "./workspace.js";
import {
  normalizeProjectId,
  parseGovernanceLevel,
  createBootstrapProducts,
  type BootstrapAnswers
} from "./questions.js";
import { promptForAnswers, promptForToolchainRepair } from "./tui.js";

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

  if (args.command === "config-ui") {
    await runConfigUi({
      cwd: args.cwd,
      project: args.project,
      host: args.host ?? "127.0.0.1",
      port: args.port,
      open: !args.noOpen,
      readOnly: args.readOnly
    });
    return;
  }

  if (args.command === "link-docs") {
    await runLinkDocs(args);
    return;
  }

  await runInit(args);
}

async function runInstall(args: ReturnType<typeof parseArgs>): Promise<void> {
  const skillsResult = await installSkills({
    cwd: args.cwd,
    skillsSource: args.skillsSource,
    skillsTarget: args.skillsTarget
  });

  const toolchainCheck = await checkToolchain({
    selection: args.withTools,
    toolsRoot: args.toolsRoot
  });
  printToolchainCheck(toolchainCheck);

  const shouldInstallToolchain =
    toolchainCheck.needsInstall.length > 0 &&
    (args.yes || (await promptForToolchainRepair(toolchainCheck.needsInstall.length)));

  const toolchainResult = shouldInstallToolchain
    ? await installToolchain({
        toolNames: toolchainCheck.needsInstall.map((tool) => tool.name),
        toolsRoot: args.toolsRoot
      })
    : {
        toolsRoot: toolchainCheck.toolsRoot,
        binRoot: toolchainCheck.binRoot,
        installed: [],
        updated: [],
        skipped: toolchainCheck.skipped.concat(
          toolchainCheck.needsInstall.length > 0
            ? ["toolchain: repair skipped by user"]
            : toolchainCheck.selected.length > 0
              ? ["toolchain: already complete"]
              : []
        ),
        shims: []
      };

  console.log(`Skills source: ${skillsResult.sourceRoot}`);
  console.log(`Skills targets: ${skillsResult.targets.join(", ")}`);
  console.log(`Skills installed: ${skillsResult.installed.length}`);
  console.log(`Skills updated: ${skillsResult.updated.length}`);
  console.log(`Skills skipped existing: ${skillsResult.skipped.length}`);
  console.log(`Tools root: ${toolchainResult.toolsRoot}`);
  console.log(`Tools bin: ${toolchainResult.binRoot}`);
  console.log(`Tools installed: ${toolchainResult.installed.length}`);
  console.log(`Tools updated: ${toolchainResult.updated.length}`);
  console.log(`Tools skipped: ${toolchainResult.skipped.length}`);
  if (toolchainResult.shims.length > 0) {
    console.log(`Tool shims: ${toolchainResult.shims.join(", ")}`);
  }
}

function printToolchainCheck(result: ToolchainCheckResult): void {
  console.log(`Toolchain check: ${result.ready.length}/${result.tools.length} ready`);
  if (result.skipped.length > 0) {
    console.log(`Toolchain skipped: ${result.skipped.join(", ")}`);
  }

  for (const tool of result.tools) {
    const installed = tool.installedVersion ?? "missing";
    const issues = tool.issues.length > 0 ? `; ${tool.issues.join("; ")}` : "";
    console.log(
      `- ${tool.name}: ${tool.status}; expected ${tool.packageName}@${tool.expectedVersion}; installed ${installed}${issues}`
    );
  }
}

async function runInit(args: ReturnType<typeof parseArgs>): Promise<void> {
  const inferredProjectId = normalizeProjectId(args.project ?? (await inferProjectId(args.cwd)));
  const docsBranch = args.docsBranch ?? args.serviceBranch ?? "main";
  const serviceBranch = args.serviceBranch ?? docsBranch;
  const defaults: BootstrapAnswers = {
    projectId: inferredProjectId,
    products: createBootstrapProducts({
      products: args.products,
      services: args.services,
      codeRoot: args.codeRoot ?? args.cwd,
      requiredBranch: serviceBranch
    }),
    projectIteration: args.iteration?.trim() || "current",
    docsBranch,
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

async function runLinkDocs(args: ReturnType<typeof parseArgs>): Promise<void> {
  if (!args.docsRepo) {
    throw new Error("link-docs requires --docs-repo <path>");
  }

  const result = await linkDocsRepository(args.cwd, args.docsRepo);

  console.log(`Source workspace: ${result.sourceRoot}`);
  console.log(`Docs repo: ${result.docsRepo}`);
  console.log(`Created: ${result.created.length}`);
  console.log(`Updated: ${result.updated.length}`);
  console.log(`Skipped existing: ${result.skipped.length}`);
}

function printHelp(): void {
  console.log(`Usage: aiops <command> [options]

Commands:
  install              Install AIOps skills to agent runtime directories
  init                 Initialize AIOps governance in the current workspace
  setup                Run install, then init
  config-ui            Start local UI for iteration/product/service bindings
  link-docs            Link a source repo to an existing AIOps docs repo

Options:
  -y, --yes            Accept defaults and do not prompt
  --project <id>       Project id under .aiops/projects/
  --products <list>    Comma-separated products; default core
  --services <groups>  Service groups, e.g. ca:ca-admin+ca-worker,kmc:kmc-admin
  --iteration <id>     Initial project iteration id; default current
  --docs-branch <b>    Initial docs branch; default main
  --service-branch <b> Initial required service branch; default docs branch
  --code-root <path>   Initial service code root; default current directory
  --level <level>      low, medium, high, or xhigh; default high
  --language <lang>    Knowledge language; default zh-CN
  --host <host>        config-ui host; default 127.0.0.1
  --port <port>        config-ui port; default auto
  --no-open            config-ui: do not open browser
  --read-only          config-ui: disable save
  --skills-source <p>  AIOps skill source directory; default discovers ./skills
  --skills-target <p>  Runtime skills directory; default ~/.agents/skills and ~/.codex/skills
  --with <tools>       Toolchain selection: default, none, or comma list
  --tools-root <p>     Tool install root; default ~/.aiops/tools
  --docs-repo <p>      link-docs: path to the AIOps docs repo
  -h, --help           Show this help
`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`aiops: ${message}`);
  process.exitCode = 1;
});
