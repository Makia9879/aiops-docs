export type HookAction = "inject" | "record" | "trigger";

export function aiopsHookCommand(agent: "claude-code" | "codex", action: HookAction, event: string): string {
  return [
    "sh -c",
    shellQuote([
      "set -eu",
      'r="${PWD:-.}/.aiops/hooks/aiops_hook_runner.sh"',
      'if [ ! -x "$r" ]; then r="${PWD:-.}/.aiops-hook-runner.sh"; fi',
      'if [ ! -x "$r" ]; then echo "AIOps: no aiops_hook_runner.sh found; run aiops init or aiops link-docs."; exit 0; fi',
      `AIOPS_AGENT=${shellQuote(agent)} AIOPS_HOOK_EVENT="$1" exec "$r" ${action} "$1"`,
    ].join("; ")),
    "sh",
    shellQuote(event),
  ].join(" ");
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
