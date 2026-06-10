import {
  ensureArray,
  ensureObject,
  parseJsonObject,
  stringifyJsonObject,
  type JsonObject,
} from "./json-config.js";
import { aiopsHookCommand } from "./hook-command.js";

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
      command: aiopsHookCommand("claude-code", "inject", "UserPromptSubmit"),
    },
  ],
  PostToolUse: [
    {
      id: "aiops-governance-record-diff",
      command: aiopsHookCommand("claude-code", "record", "PostToolUse"),
    },
  ],
  SubagentStop: [
    {
      id: "aiops-governance-record-subagent",
      command: aiopsHookCommand("claude-code", "record", "SubagentStop"),
    },
  ],
  Stop: [
    {
      id: "aiops-governance-trigger-maintenance",
      command: aiopsHookCommand("claude-code", "trigger", "Stop"),
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
  const existing = findClaudeEntry(entries, command.id);
  if (existing) {
    existing.command = command.command;
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

function findClaudeEntry(entries: unknown[], id: string): JsonObject | undefined {
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const hooks = (entry as JsonObject).hooks;
    if (!Array.isArray(hooks)) {
      continue;
    }

    for (const hook of hooks) {
      if (!hook || typeof hook !== "object" || Array.isArray(hook)) {
        continue;
      }

      const typedHook = hook as JsonObject;
      if (typedHook.id === id || JSON.stringify(typedHook).includes(id)) {
        return typedHook;
      }
    }
  }

  return undefined;
}
