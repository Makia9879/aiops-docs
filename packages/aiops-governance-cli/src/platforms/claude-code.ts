import {
  ensureArray,
  ensureObject,
  parseJsonObject,
  stableIncludesEntry,
  stringifyJsonObject,
  type JsonObject,
} from "./json-config.js";

const CLAUDE_SETTINGS_PATH = ".claude/settings.json";
const AIOPS_MARKER = "aiops-governance";

export interface ClaudeHookCommand {
  readonly id: string;
  readonly command: string;
}

export const CLAUDE_CODE_AIOPS_HOOKS: Readonly<Record<string, ClaudeHookCommand[]>> = {
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

export function appendClaudeCodeAiopsHooks(existingText = ""): string {
  const settings = parseJsonObject(existingText, CLAUDE_SETTINGS_PATH);
  const hooks = ensureObject(settings, "hooks");

  for (const [eventName, commands] of Object.entries(CLAUDE_CODE_AIOPS_HOOKS)) {
    const eventEntries = ensureArray(hooks, eventName);
    for (const command of commands) {
      appendClaudeEntry(eventEntries, command);
    }
  }

  return stringifyJsonObject(settings);
}

function appendClaudeEntry(entries: unknown[], command: ClaudeHookCommand): void {
  if (stableIncludesEntry(entries, command.id)) {
    return;
  }

  const entry: JsonObject = {
    matcher: "*",
    hooks: [
      {
        type: "command",
        id: command.id,
        source: AIOPS_MARKER,
        command: command.command,
      },
    ],
  };
  entries.push(entry);
}
