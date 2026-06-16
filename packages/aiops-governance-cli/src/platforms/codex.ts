import {
  ensureArray,
  ensureObject,
  parseJsonObject,
  stringifyJsonObject,
  type JsonObject,
} from "./json-config.js";
import { aiopsHookCommand } from "./hook-command.js";

const CODEX_HOOKS_PATH = ".codex/hooks.json";
const AIOPS_MARKER = "aiops-governance";
const OBSOLETE_AIOPS_HOOK_IDS = new Set([
  "aiops-governance-record-diff",
  "aiops-governance-record-subagent",
  "aiops-governance-trigger-maintenance",
]);

export interface CodexHookCommand {
  readonly id: string;
  readonly command: string;
}

export const CODEX_AIOPS_HOOKS: Readonly<Record<string, CodexHookCommand[]>> = {
  UserPromptSubmit: [
    {
      id: "aiops-governance-inject-context",
      command: aiopsHookCommand("codex", "inject", "UserPromptSubmit"),
    },
  ],
};

export function appendCodexAiopsHooks(existingText = ""): string {
  const config = parseJsonObject(existingText, CODEX_HOOKS_PATH);
  const hooks = ensureObject(config, "hooks");
  removeObsoleteCodexHooks(hooks);

  for (const [eventName, entries] of Object.entries(CODEX_AIOPS_HOOKS)) {
    const eventEntries = ensureArray(hooks, eventName);
    for (const entry of entries) {
      appendCodexEntry(eventEntries, entry);
    }
  }

  return stringifyJsonObject(config);
}

function removeObsoleteCodexHooks(hooks: JsonObject): void {
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

function appendCodexEntry(entries: unknown[], command: CodexHookCommand): void {
  const existing = findCodexEntry(entries, command.id);
  if (existing) {
    existing.command = command.command;
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

function findCodexEntry(entries: unknown[], id: string): JsonObject | undefined {
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const typedEntry = entry as JsonObject;
    if (typedEntry.id === id || typedEntry.name === id || JSON.stringify(typedEntry).includes(id)) {
      return typedEntry;
    }
  }

  return undefined;
}
