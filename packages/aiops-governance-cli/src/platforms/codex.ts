import {
  ensureArray,
  ensureObject,
  parseJsonObject,
  stableIncludesEntry,
  stringifyJsonObject,
  type JsonObject,
} from "./json-config.js";

const CODEX_HOOKS_PATH = ".codex/hooks.json";
const AIOPS_MARKER = "aiops-governance";

export interface CodexHookCommand {
  readonly id: string;
  readonly command: string;
}

export const CODEX_AIOPS_HOOKS: Readonly<Record<string, CodexHookCommand[]>> = {
  UserPromptSubmit: [
    {
      id: "aiops-governance-inject-context",
      command:
        "docker run --rm -i -v \"$PWD\":/workspace -w /workspace python:3.13-slim python .aiops/hooks/aiops_inject_context.py",
    },
  ],
  PostToolUse: [
    {
      id: "aiops-governance-record-diff",
      command:
        "docker run --rm -i -v \"$PWD\":/workspace -w /workspace python:3.13-slim python .aiops/hooks/aiops_record_diff.py",
    },
  ],
  Stop: [
    {
      id: "aiops-governance-trigger-maintenance",
      command:
        "docker run --rm -i -v \"$PWD\":/workspace -w /workspace python:3.13-slim python .aiops/hooks/aiops_trigger_maintenance.py",
    },
  ],
};

export function appendCodexAiopsHooks(existingText = ""): string {
  const config = parseJsonObject(existingText, CODEX_HOOKS_PATH);
  const hooks = ensureObject(config, "hooks");

  for (const [eventName, entries] of Object.entries(CODEX_AIOPS_HOOKS)) {
    const eventEntries = ensureArray(hooks, eventName);
    for (const entry of entries) {
      appendCodexEntry(eventEntries, entry);
    }
  }

  return stringifyJsonObject(config);
}

function appendCodexEntry(entries: unknown[], command: CodexHookCommand): void {
  if (stableIncludesEntry(entries, command.id)) {
    return;
  }

  const entry: JsonObject = {
    id: command.id,
    name: command.id,
    source: AIOPS_MARKER,
    command: command.command,
  };
  entries.push(entry);
}
