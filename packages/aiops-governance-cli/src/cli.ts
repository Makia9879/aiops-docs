#!/usr/bin/env node
import { parseArgs } from "./args.js";
import { checkDocuments, type DocumentCheckResult } from "./check.js";
import { runConfigUi } from "./config-ui.js";
import { installSkills, uninstallSkills } from "./install.js";
import {
  checkToolchain,
  installToolchain,
  uninstallToolchain,
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
  createBootstrapProductsFromRepos,
  type BootstrapAnswers,
  type BootstrapDefaults
} from "./questions.js";
import { promptForAnswers, promptForToolchainRepair } from "./tui.js";

const colorEnabled = process.env.FORCE_COLOR
  ? process.env.FORCE_COLOR !== "0"
  : !process.env.NO_COLOR && process.env.TERM !== "dumb";
const colors = {
  bold: (value: string) => color(value, "1"),
  green: (value: string) => color(value, "32"),
  yellow: (value: string) => color(value, "33"),
  red: (value: string) => color(value, "31"),
  cyan: (value: string) => color(value, "36"),
  dim: (value: string) => color(value, "2")
};

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

  if (args.command === "uninstall") {
    await runUninstall(args);
    return;
  }

  if (args.command === "setup") {
    await runInstall(args);
    await runInit(args);
    return;
  }

  if (args.command === "check") {
    await runCheck(args);
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

async function runUninstall(args: ReturnType<typeof parseArgs>): Promise<void> {
  const skillsResult = await uninstallSkills({
    skillsTarget: args.skillsTarget
  });
  const toolchainResult = await uninstallToolchain({
    selection: args.withTools,
    toolsRoot: args.toolsRoot
  });

  console.log(`Skills targets: ${skillsResult.targets.join(", ")}`);
  console.log(`Skills removed: ${skillsResult.removed.length}`);
  console.log(`Skills skipped missing: ${skillsResult.skipped.length}`);
  console.log(`Tools root: ${toolchainResult.toolsRoot}`);
  console.log(`Tools bin: ${toolchainResult.binRoot}`);
  console.log(`Tools removed: ${toolchainResult.removed.length}`);
  console.log(`Tools skipped missing: ${toolchainResult.skipped.length}`);
  console.log("CLI uninstall command: npm uninstall -g @makia9879/aiops");
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
  const summary =
    result.needsInstall.length === 0
      ? colors.green(`${result.ready.length}/${result.tools.length} ready`)
      : colors.red(`${result.ready.length}/${result.tools.length} ready`);
  console.log(`${colors.bold("Toolchain check")}: ${summary}`);
  if (result.skipped.length > 0) {
    console.log(`${colors.yellow("Toolchain skipped")}: ${result.skipped.join(", ")}`);
  }

  for (const tool of result.tools) {
    const installed = tool.installedVersion ?? "missing";
    const issues = tool.issues.length > 0 ? `; ${tool.issues.join("; ")}` : "";
    const status = colorStatus(tool.status);
    console.log(
      `- ${colors.cyan(tool.name)}: ${status}; expected ${tool.packageName}@${tool.expectedVersion}; installed ${installed}${issues}`
    );
  }
}

async function runCheck(args: ReturnType<typeof parseArgs>): Promise<void> {
  const toolchainCheck = await checkToolchain({
    selection: args.withTools,
    toolsRoot: args.toolsRoot
  });
  const documentsCheck = await checkDocuments({
    cwd: args.cwd,
    project: args.project
  });

  printToolchainCheck(toolchainCheck);
  printDocumentCheck(documentsCheck);

  if (toolchainCheck.needsInstall.length > 0 || documentsCheck.status === "error") {
    process.exitCode = 1;
  }
}

function printDocumentCheck(result: DocumentCheckResult): void {
  console.log(`${colors.bold("Document check")}: ${colorStatus(result.status)}`);
  console.log(`Workspace: ${colors.cyan(result.workspaceRoot)}`);
  console.log(`AIOps root: ${colors.cyan(result.aiopsRoot)}`);
  console.log(
    `Projects checked: ${result.checkedProjects.length > 0 ? result.checkedProjects.join(", ") : "none"}`
  );

  if (result.issues.length === 0) {
    console.log(`- documents: ${colors.green("ready")}`);
    return;
  }

  for (const issue of result.issues) {
    const suffix = issue.path ? colors.dim(` (${issue.path})`) : "";
    console.log(`- ${colorStatus(issue.status)}: ${issue.code}: ${issue.message}${suffix}`);
  }
}

async function runInit(args: ReturnType<typeof parseArgs>): Promise<void> {
  const inferredProjectId = normalizeProjectId(args.project ?? (await inferProjectId(args.cwd)));
  const docsBranch = args.docsBranch ?? args.serviceBranch ?? "main";
  const serviceBranch = args.serviceBranch ?? docsBranch;
  const defaults: BootstrapDefaults = {
    projectId: inferredProjectId,
    products: args.productRepos
      ? await createBootstrapProductsFromRepos({
          workspaceRoot: args.cwd,
          productRepos: args.productRepos,
          requiredBranch: args.serviceBranch
        })
      : createBootstrapProducts({
          products: args.products,
          services: args.services,
          codeRoot: args.codeRoot ?? args.cwd,
          requiredBranch: serviceBranch
        }),
    projectIteration: args.iteration?.trim() || "current",
    docsBranch,
    governanceLevel: parseGovernanceLevel(args.level ?? "high"),
    knowledgeLanguage: args.language ?? "zh-CN",
    productRepos: args.productRepos,
    workspaceRoot: args.cwd
  };

  const answers = args.yes
    ? defaults
    : await promptForAnswers(defaults);

  const result = await initializeWorkspace(args.cwd, answers);
  const linkedRepos = args.linkProductRepos
    ? await linkProductRepositories(args.cwd, answers)
    : [];

  console.log(`Workspace: ${result.workspaceRoot}`);
  console.log(`AIOps root: ${result.aiopsRoot}`);
  console.log(`Project: ${answers.projectId}`);
  console.log(`Created: ${result.created.length}`);
  console.log(`Updated: ${result.updated.length}`);
  console.log(`Skipped existing: ${result.skipped.length}`);
  if (linkedRepos.length > 0) {
    console.log(`Linked product repos: ${linkedRepos.length}`);
  }
}

async function linkProductRepositories(
  docsRoot: string,
  answers: BootstrapAnswers
): Promise<string[]> {
  const codeRoots = Array.from(
    new Set(
      answers.products
        .flatMap((product) => product.services.map((service) => service.codeRoot))
        .filter((codeRoot) => codeRoot !== docsRoot)
    )
  );
  const linked: string[] = [];

  for (const codeRoot of codeRoots) {
    await linkDocsRepository(codeRoot, docsRoot);
    linked.push(codeRoot);
  }

  return linked;
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
  uninstall            Remove AIOps skills and managed toolchain files
  init                 Initialize AIOps governance in the current workspace
  setup                Run install, then init
  check                Check managed toolchain and AIOps document structure
  config-ui            Start local UI for iteration/product/service bindings
  link-docs            Link a source repo to an existing AIOps docs repo

Options:
  -y, --yes            Accept defaults and do not prompt
  --project <id>       Project id under .aiops/projects/
  --products <list>    Comma-separated products; default core
  --services <groups>  Service groups, e.g. ca:ca-admin+ca-worker,kmc:kmc-admin
  --product-repos <m>  Product repo mappings, e.g. ca_admin,ra_admin or ca=./ca_admin
  --iteration <id>     Initial project iteration id; default current
  --docs-branch <b>    Initial docs branch; default main
  --service-branch <b> Initial required service branch; default docs branch
  --code-root <path>   Initial service code root; default current directory
  --link-product-repos Link product repositories to this docs workspace after init
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
  console.error(`${colors.red("aiops")}: ${message}`);
  process.exitCode = 1;
});

function color(value: string, code: string): string {
  return colorEnabled ? `\x1b[${code}m${value}\x1b[0m` : value;
}

function colorStatus(status: string): string {
  if (status === "ok" || status === "ready") {
    return colors.green(status);
  }
  if (status === "warning" || status === "incomplete") {
    return colors.yellow(status);
  }
  if (status === "error" || status === "missing" || status === "version-mismatch") {
    return colors.red(status);
  }
  return status;
}
