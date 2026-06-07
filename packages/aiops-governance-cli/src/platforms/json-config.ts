export type JsonObject = Record<string, unknown>;

export function parseJsonObject(text: string, targetPath: string): JsonObject {
  if (!text.trim()) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot parse ${targetPath}; stop and ask a human to repair it. ${message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Cannot update ${targetPath}; expected a JSON object at the document root.`);
  }

  return parsed as JsonObject;
}

export function stringifyJsonObject(value: JsonObject): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function ensureObject(value: JsonObject, key: string): JsonObject {
  const current = value[key];
  if (current === undefined) {
    const next: JsonObject = {};
    value[key] = next;
    return next;
  }

  if (!current || typeof current !== "object" || Array.isArray(current)) {
    throw new Error(`Cannot update JSON config; expected "${key}" to be an object.`);
  }

  return current as JsonObject;
}

export function ensureArray(value: JsonObject, key: string): unknown[] {
  const current = value[key];
  if (current === undefined) {
    const next: unknown[] = [];
    value[key] = next;
    return next;
  }

  if (!Array.isArray(current)) {
    throw new Error(`Cannot update JSON config; expected "${key}" to be an array.`);
  }

  return current;
}

export function stableIncludesEntry(entries: unknown[], marker: string): boolean {
  return entries.some((entry) => JSON.stringify(entry).includes(marker));
}
