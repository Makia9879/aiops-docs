export const AIOPS_INJECT_CONTEXT_PY = `#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re


MAX_LINES = 24
MAX_CHARS = 4000


def find_workspace_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / ".aiops").is_dir():
            return candidate
    return current


def read_pending_summary(pending: Path) -> str:
    if not pending.exists():
        return "未发现 .aiops/diff-records/pending.md。"

    text = pending.read_text(encoding="utf-8", errors="replace").strip()
    if not text:
        return "pending.md 为空，当前没有待治理语义变更。"

    headings = re.findall(r"^#{2,4}\\s+(.+)$", text, flags=re.MULTILINE)
    pending_count = len(re.findall(r"^Status:\\s*pending\\b", text, flags=re.MULTILINE | re.IGNORECASE))
    changed_files = re.findall(r"^-\\s+([^\\n]+)$", text, flags=re.MULTILINE)

    lines = []
    lines.append(f"pending sections: {pending_count or len(headings)}")
    if headings:
        lines.append("recent topics:")
        for heading in headings[-8:]:
            lines.append(f"- {heading}")
    if changed_files:
        lines.append("recent changed files:")
        for item in changed_files[-8:]:
            lines.append(f"- {item}")

    summary = "\\n".join(lines)
    return summary[:MAX_CHARS]


def main() -> int:
    root = find_workspace_root(Path.cwd())
    pending = root / ".aiops" / "diff-records" / "pending.md"
    summary = read_pending_summary(pending)

    print("AIOps knowledge governance context")
    print("Canonical docs: .aiops/projects/<project>/")
    print("Schema: project iteration -> product version -> service required branch.")
    print("Maintenance input: .aiops/diff-records/pending.md")
    print("Before canonical edits: read project.yaml and iteration-bindings.yaml; check service code_root branch against required_branch.")
    print("Reminder: hooks only inject context, record semantic diff, and trigger maintenance reminders.")
    print("")
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

export const AIOPS_RECORD_DIFF_PY = `#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import json
import os
import sys


def find_workspace_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / ".aiops").is_dir():
            return candidate
    return current


def read_payload() -> dict:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {"raw": raw[:4000]}
    except json.JSONDecodeError:
        return {"raw": raw[:4000]}


def pick_first(payload: dict, names: list[str], default: str = "unknown") -> str:
    for name in names:
        value = payload.get(name) or os.environ.get(name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return default


def collect_changed_files(payload: dict) -> list[str]:
    candidates = []
    for key in ["changed_files", "files", "file_paths", "paths"]:
        value = payload.get(key)
        if isinstance(value, list):
            candidates.extend(str(item) for item in value)
        elif isinstance(value, str):
            candidates.extend(line.strip() for line in value.splitlines())

    tool_input = payload.get("tool_input")
    if isinstance(tool_input, dict):
        for key in ["file_path", "path"]:
            value = tool_input.get(key)
            if isinstance(value, str):
                candidates.append(value)

    result = []
    seen = set()
    for item in candidates:
        clean = item.strip()
        if clean and clean not in seen:
            seen.add(clean)
            result.append(clean)
    return result


def ensure_pending_file(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text("# Pending AIOps Diff Records\\n\\n", encoding="utf-8")


def append_record(path: Path, payload: dict) -> None:
    ensure_pending_file(path)

    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    project = pick_first(payload, ["project", "project_id", "AIOPS_PROJECT"], "workspace")
    source = pick_first(payload, ["hook_event", "event", "AIOPS_HOOK_EVENT"], "hook")
    tool_name = pick_first(payload, ["tool_name", "tool", "AIOPS_TOOL_NAME"], "unknown")
    changed_files = collect_changed_files(payload)
    raw_hint = payload.get("raw") if isinstance(payload.get("raw"), str) else ""

    lines = [
        f"## {project}",
        "",
        f"### {now} - Workspace change candidate",
        "",
        "Status: pending",
        f"Source: hook:{source}",
        f"Tool: {tool_name}",
        "Project iteration: unknown",
        "Product: unknown",
        "Service: unknown",
        "",
        "Changed files:",
    ]

    if changed_files:
        lines.extend(f"- {item}" for item in changed_files)
    else:
        lines.append("- unknown")

    lines.extend([
        "",
        "Semantic direction:",
        "- LLM should identify project/product/service scope, read iteration-bindings.yaml, check service branch bindings, then recall related workspace context and update affected knowledge docs if needed.",
    ])

    if raw_hint:
        lines.extend(["", "Raw hook hint:", "\`\`\`text", raw_hint[:1200], "\`\`\`"])

    lines.append("")
    with path.open("a", encoding="utf-8") as handle:
        handle.write("\\n".join(lines))
        handle.write("\\n")


def main() -> int:
    root = find_workspace_root(Path.cwd())
    pending = root / ".aiops" / "diff-records" / "pending.md"
    payload = read_payload()
    append_record(pending, payload)
    print(f"AIOps recorded semantic diff candidate: {pending}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

export const AIOPS_TRIGGER_MAINTENANCE_PY = `#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re


THRESHOLDS = {
    "low": 999999,
    "medium": 8,
    "high": 5,
    "xhigh": 2,
}


def find_workspace_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / ".aiops").is_dir():
            return candidate
    return current


def read_governance_level(root: Path) -> str:
    config = root / ".aiops" / "governance.yaml"
    if not config.exists():
        return "high"

    for line in config.read_text(encoding="utf-8", errors="replace").splitlines():
        match = re.match(r"^\\s*governance_level\\s*:\\s*([A-Za-z0-9_-]+)\\s*$", line)
        if match:
            value = match.group(1).strip().lower()
            return value if value in THRESHOLDS else "high"
    return "high"


def count_pending_records(pending: Path) -> int:
    if not pending.exists():
        return 0
    text = pending.read_text(encoding="utf-8", errors="replace")
    status_count = len(re.findall(r"^Status:\\s*pending\\b", text, flags=re.MULTILINE | re.IGNORECASE))
    return status_count or len(re.findall(r"^###\\s+", text, flags=re.MULTILINE))


def main() -> int:
    root = find_workspace_root(Path.cwd())
    pending = root / ".aiops" / "diff-records" / "pending.md"
    level = read_governance_level(root)
    count = count_pending_records(pending)
    threshold = THRESHOLDS[level]

    if count == 0:
        print("AIOps: no pending knowledge governance records.")
        return 0

    print(f"AIOps: {count} pending knowledge governance record(s), level={level}, threshold={threshold}.")
    print("Maintenance flow: read pending.md -> identify project iteration/product/service -> read iteration-bindings.yaml -> check service required_branch -> summarize semantics -> workspace-wide recall -> update related docs -> archive handled records.")

    if count >= threshold:
        print("AIOps: threshold reached. Trigger aiops-daily-doc-maintenance before continuing when possible.")
        if level == "xhigh":
            print("AIOps: xhigh governance may block session completion until maintenance is addressed.")
    else:
        print("AIOps: threshold not reached. Keep recording semantic changes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

export const WORKSPACE_HOOK_TEMPLATES = {
  "aiops_inject_context.py": AIOPS_INJECT_CONTEXT_PY,
  "aiops_record_diff.py": AIOPS_RECORD_DIFF_PY,
  "aiops_trigger_maintenance.py": AIOPS_TRIGGER_MAINTENANCE_PY,
} as const;
