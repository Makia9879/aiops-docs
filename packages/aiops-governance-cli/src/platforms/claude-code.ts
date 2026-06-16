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
const OBSOLETE_AIOPS_HOOK_IDS = new Set([
  "aiops-governance-record-diff",
  "aiops-governance-record-subagent",
  "aiops-governance-trigger-maintenance",
]);

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
};

export function appendClaudeCodeAiopsHooks(existingText = ""): string {
  const settings = parseJsonObject(existingText, CLAUDE_SETTINGS_PATH);
  const hooks = ensureObject(settings, "hooks");
  removeObsoleteClaudeHooks(hooks);

  for (const [eventName, commands] of Object.entries(CLAUDE_CODE_AIOPS_HOOKS)) {
    const eventEntries = ensureArray(hooks, eventName);
    for (const command of commands) {
      appendClaudeEntry(eventEntries, command);
    }
  }

  return stringifyJsonObject(settings);
}

function removeObsoleteClaudeHooks(hooks: JsonObject): void {
  for (const [eventName, value] of Object.entries(hooks)) {
    if (!Array.isArray(value)) {
      continue;
    }

    hooks[eventName] = value.filter((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return true;
      }

      const text = JSON.stringify(entry);
      for (const id of OBSOLETE_AIOPS_HOOK_IDS) {
        if (text.includes(id)) {
          return false;
        }
      }
      return true;
    });
  }
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
