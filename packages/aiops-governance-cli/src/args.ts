export interface ParsedArgs {
  command: "install" | "init" | "setup" | "help";
  yes: boolean;
  project?: string;
  products?: string;
  level?: string;
  language?: string;
  skillsSource?: string;
  skillsTarget?: string;
  withTools?: string;
  toolsRoot?: string;
  cwd: string;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const command = parseCommand(args.shift());
  const parsed: ParsedArgs = {
    command,
    yes: false,
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

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function parseCommand(value: string | undefined): ParsedArgs["command"] {
  if (!value || value === "--help" || value === "-h") {
    return "help";
  }

  if (value === "install" || value === "init" || value === "setup") {
    return value;
  }

  throw new Error(`Unknown command: ${value}`);
}

function readOptionValue(option: string, args: string[]): string {
  const value = args.shift();
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${option}`);
  }

  return value;
}
