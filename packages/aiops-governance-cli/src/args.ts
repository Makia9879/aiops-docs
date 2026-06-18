export interface ParsedArgs {
  command:
    | "install"
    | "uninstall"
    | "init"
    | "setup"
    | "check"
    | "config-ui"
    | "link-docs"
    | "help";
  yes: boolean;
  project?: string;
  products?: string;
  services?: string;
  productRepos?: string;
  iteration?: string;
  docsBranch?: string;
  serviceBranch?: string;
  codeRoot?: string;
  level?: string;
  language?: string;
  skillsSource?: string;
  skillsTarget?: string;
  withTools?: string;
  toolsRoot?: string;
  docsRepo?: string;
  linkProductRepos: boolean;
  host?: string;
  port?: number;
  noOpen: boolean;
  readOnly: boolean;
  cwd: string;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const command = parseCommand(args.shift());
  const parsed: ParsedArgs = {
    command,
    yes: false,
    linkProductRepos: false,
    noOpen: false,
    readOnly: false,
    cwd: process.cwd()
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      parsed.command = "help";
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      parsed.yes = true;
      continue;
    }

    if (arg === "--project") {
      parsed.project = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--project=")) {
      parsed.project = arg.slice("--project=".length);
      continue;
    }

    if (arg === "--products") {
      parsed.products = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--products=")) {
      parsed.products = arg.slice("--products=".length);
      continue;
    }

    if (arg === "--services") {
      parsed.services = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--services=")) {
      parsed.services = arg.slice("--services=".length);
      continue;
    }

    if (arg === "--product-repos") {
      parsed.productRepos = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--product-repos=")) {
      parsed.productRepos = arg.slice("--product-repos=".length);
      continue;
    }

    if (arg === "--iteration") {
      parsed.iteration = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--iteration=")) {
      parsed.iteration = arg.slice("--iteration=".length);
      continue;
    }

    if (arg === "--docs-branch") {
      parsed.docsBranch = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--docs-branch=")) {
      parsed.docsBranch = arg.slice("--docs-branch=".length);
      continue;
    }

    if (arg === "--service-branch") {
      parsed.serviceBranch = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--service-branch=")) {
      parsed.serviceBranch = arg.slice("--service-branch=".length);
      continue;
    }

    if (arg === "--code-root") {
      parsed.codeRoot = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--code-root=")) {
      parsed.codeRoot = arg.slice("--code-root=".length);
      continue;
    }

    if (arg === "--level") {
      parsed.level = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--level=")) {
      parsed.level = arg.slice("--level=".length);
      continue;
    }

    if (arg === "--language") {
      parsed.language = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--language=")) {
      parsed.language = arg.slice("--language=".length);
      continue;
    }

    if (arg === "--host") {
      parsed.host = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--host=")) {
      parsed.host = arg.slice("--host=".length);
      continue;
    }

    if (arg === "--port") {
      parsed.port = parsePort(readOptionValue(arg, args));
      continue;
    }

    if (arg.startsWith("--port=")) {
      parsed.port = parsePort(arg.slice("--port=".length));
      continue;
    }

    if (arg === "--no-open") {
      parsed.noOpen = true;
      continue;
    }

    if (arg === "--read-only") {
      parsed.readOnly = true;
      continue;
    }

    if (arg === "--skills-source") {
      parsed.skillsSource = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--skills-source=")) {
      parsed.skillsSource = arg.slice("--skills-source=".length);
      continue;
    }

    if (arg === "--skills-target") {
      parsed.skillsTarget = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--skills-target=")) {
      parsed.skillsTarget = arg.slice("--skills-target=".length);
      continue;
    }

    if (arg === "--with") {
      parsed.withTools = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--with=")) {
      parsed.withTools = arg.slice("--with=".length);
      continue;
    }

    if (arg === "--tools-root") {
      parsed.toolsRoot = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--tools-root=")) {
      parsed.toolsRoot = arg.slice("--tools-root=".length);
      continue;
    }

    if (arg === "--docs-repo") {
      parsed.docsRepo = readOptionValue(arg, args);
      continue;
    }

    if (arg.startsWith("--docs-repo=")) {
      parsed.docsRepo = arg.slice("--docs-repo=".length);
      continue;
    }

    if (arg === "--link-product-repos") {
      parsed.linkProductRepos = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function parseCommand(value: string | undefined): ParsedArgs["command"] {
  if (!value || value === "--help" || value === "-h") {
    return "help";
  }

  if (
    value === "install" ||
    value === "uninstall" ||
    value === "init" ||
    value === "setup" ||
    value === "check" ||
    value === "config-ui" ||
    value === "link-docs"
  ) {
    return value;
  }

  throw new Error(`Unknown command: ${value}`);
}

function parsePort(value: string): number {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function readOptionValue(option: string, args: string[]): string {
  const value = args.shift();
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${option}`);
  }

  return value;
}
