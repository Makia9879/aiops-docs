export const AIOPS_INJECT_CONTEXT_PY = String.raw`#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import os
import re


MAX_CHARS = 4000


def find_docs_root(start: Path) -> Path:
    env_root = os.environ.get("AIOPS_DOCS_REPO")
    if env_root:
        candidate = Path(env_root)
        if (candidate / ".aiops").is_dir():
            return candidate.resolve()

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

    headings = re.findall(r"^#{2,4}\s+(.+)$", text, flags=re.MULTILINE)
    pending_count = len(re.findall(r"^Status:\s*pending\b", text, flags=re.MULTILINE | re.IGNORECASE))

    lines = []
    lines.append(f"pending sections: {pending_count or len(headings)}")
    if headings:
        lines.append("recent topics:")
        for heading in headings[-8:]:
            lines.append(f"- {heading}")

    summary = "\n".join(lines)
    return summary[:MAX_CHARS]


def main() -> int:
    root = find_docs_root(Path.cwd())
    pending = root / ".aiops" / "diff-records" / "pending.md"
    summary = read_pending_summary(pending)
    source_repo = os.environ.get("AIOPS_SOURCE_REPO_HOST") or os.environ.get("AIOPS_SOURCE_REPO") or "unknown"
    source_branch = os.environ.get("AIOPS_SOURCE_BRANCH") or "unknown"

    print("AIOps knowledge governance context")
    print(f"Docs repo: {root}")
    print(f"Current source repo: {source_repo}")
    print(f"Current source branch: {source_branch}")
    print("Canonical docs: .aiops/projects/<project>/")
    print("Schema: project iteration -> product version -> service required branch.")
    print("Maintenance input: .aiops/diff-records/pending.md")
    print("Development recall: for coding tasks, run aiops-dev-context-recall before risky edits.")
    print("Recall order: iteration docs -> product docs -> service docs -> open questions -> source evidence.")
    print("Before canonical edits: read project.yaml and iteration-bindings.yaml; check service code_root branch against required_branch.")
    print("Hooks record semantic agent events asynchronously; Claude Code maintenance consumes pending records.")
    print("")
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

export const AIOPS_RECORD_DIFF_PY = String.raw`#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import fcntl
import json
import os
import re
import sys


MAX_EXCERPT_CHARS = 1600


def find_docs_root(start: Path) -> Path:
    env_root = os.environ.get("AIOPS_DOCS_REPO")
    if env_root:
        candidate = Path(env_root)
        if (candidate / ".aiops").is_dir():
            return candidate.resolve()

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
        if isinstance(data, dict):
            data["_raw_excerpt"] = compact(raw, MAX_EXCERPT_CHARS)
            return data
        return {"payload": data, "_raw_excerpt": compact(raw, MAX_EXCERPT_CHARS)}
    except json.JSONDecodeError:
        return {"raw": compact(raw, MAX_EXCERPT_CHARS)}


def compact(value: object, max_chars: int = MAX_EXCERPT_CHARS) -> str:
    if isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False, indent=2)
    else:
        text = str(value)

    text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    if len(text) <= max_chars:
        return text
    return f"{text[:max_chars].rstrip()}\n... truncated ..."


def pick_first(payload: dict, names: list[str], default: str = "unknown") -> str:
    for name in names:
        value = payload.get(name) or os.environ.get(name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return default


def collect_paths(payload: dict) -> list[str]:
    candidates = []
    for key in ["changed_files", "files", "file_paths", "paths", "touched_paths"]:
        value = payload.get(key)
        if isinstance(value, list):
            candidates.extend(str(item) for item in value)
        elif isinstance(value, str):
            candidates.extend(line.strip() for line in value.splitlines())

    for key in ["tool_input", "input", "parameters"]:
        value = payload.get(key)
        if isinstance(value, dict):
            for path_key in ["file_path", "path", "target_file", "source_file"]:
                item = value.get(path_key)
                if isinstance(item, str):
                    candidates.append(item)

    result = []
    seen = set()
    for item in candidates:
        clean = item.strip()
        if clean and clean not in seen:
            seen.add(clean)
            result.append(clean)
    return result


def summarize_event(payload: dict) -> list[str]:
    lines = []

    for label, keys in [
        ("User/task prompt", ["prompt", "user_prompt", "message", "text"]),
        ("Tool input", ["tool_input", "input", "parameters"]),
        ("Tool output", ["tool_output", "output", "result", "response"]),
        ("Assistant/final output", ["assistant_response", "final_response", "summary"]),
        ("Raw event excerpt", ["raw", "_raw_excerpt"]),
    ]:
        for key in keys:
            value = payload.get(key)
            if value:
                lines.append(f"{label}:")
                lines.append(indent(compact(value), "  "))
                break

    if not lines:
        lines.append("No structured event content was provided by the platform hook.")
    return lines


def indent(text: str, prefix: str) -> str:
    return "\n".join(f"{prefix}{line}" if line else prefix.rstrip() for line in text.splitlines())


def ensure_pending_file(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text("# Pending AIOps Diff Records\n\n", encoding="utf-8")


def append_record(path: Path, payload: dict) -> None:
    ensure_pending_file(path)

    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    source_agent = os.environ.get("AIOPS_AGENT") or pick_first(payload, ["agent", "source_agent"], "unknown")
    hook_event = os.environ.get("AIOPS_HOOK_EVENT") or pick_first(payload, ["hook_event", "event"], "hook")
    source_repo = os.environ.get("AIOPS_SOURCE_REPO_HOST") or os.environ.get("AIOPS_SOURCE_REPO") or "unknown"
    source_branch = os.environ.get("AIOPS_SOURCE_BRANCH") or "unknown"
    source_head = os.environ.get("AIOPS_SOURCE_HEAD") or "unknown"
    docs_repo = os.environ.get("AIOPS_DOCS_REPO_HOST") or os.environ.get("AIOPS_DOCS_REPO") or "unknown"
    tool_name = pick_first(payload, ["tool_name", "tool", "name"], "unknown")
    touched_paths = collect_paths(payload)

    lines = [
        "## Hook Events",
        "",
        f"### {now} - {source_agent} {hook_event}",
        "",
        "Status: pending",
        f"Source agent: {source_agent}",
        f"Hook event: {hook_event}",
        f"Source repo: {source_repo}",
        f"Source branch: {source_branch}",
        f"Source HEAD: {source_head}",
        f"Docs repo: {docs_repo}",
        f"Tool: {tool_name}",
        "",
        "Touched paths:",
    ]

    if touched_paths:
        lines.extend(f"- {item}" for item in touched_paths[:24])
    else:
        lines.append("- unknown")

    lines.extend([
        "",
        "Event summary:",
        *summarize_event(payload),
        "",
        "Maintenance direction:",
        "- Treat this as an asynchronous coding-agent trace, not as a complete source diff.",
        "- Maintenance executor should inspect referenced source repos directly before changing canonical docs.",
        "- Maintenance executor owns upserting docs, archiving handled pending records, and committing allowed doc/governance changes.",
        "",
    ])

    lock_path = path.parent.parent / "tmp" / "pending.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open("w", encoding="utf-8") as lock_handle:
        fcntl.flock(lock_handle, fcntl.LOCK_EX)
        with path.open("a", encoding="utf-8") as handle:
            handle.write("\n".join(lines))
        fcntl.flock(lock_handle, fcntl.LOCK_UN)


def main() -> int:
    root = find_docs_root(Path.cwd())
    pending = root / ".aiops" / "diff-records" / "pending.md"
    payload = read_payload()
    append_record(pending, payload)
    print(f"AIOps recorded hook event: {pending}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

export const AIOPS_TRIGGER_MAINTENANCE_PY = String.raw`#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import os
import re
import shlex


HIGH_THRESHOLD = 5
MEDIUM_REMINDER_THRESHOLD = 8


def find_docs_root(start: Path) -> Path:
    env_root = os.environ.get("AIOPS_DOCS_REPO")
    if env_root:
        candidate = Path(env_root)
        if (candidate / ".aiops").is_dir():
            return candidate.resolve()

    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / ".aiops").is_dir():
            return candidate
    return current


def clean_yaml_value(value: str) -> str:
    value = value.strip()
    if "#" in value:
        value = value.split("#", 1)[0].strip()
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        value = value[1:-1]
    return value.strip()


def read_governance(root: Path) -> dict[str, object]:
    config = {
        "level": "high",
        "command": "claude",
        "fallback": "prompt_subagent",
        "modes": {"high": "async", "xhigh": "sync"},
    }
    path = root / ".aiops" / "governance.yaml"
    if not path.exists():
        return config

    in_runner = False
    in_modes = False
    modes = dict(config["modes"])

    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        level_match = re.match(r"^\s*governance_level\s*:\s*(.+?)\s*$", line)
        if level_match:
            level = clean_yaml_value(level_match.group(1)).lower()
            if level in {"low", "medium", "high", "xhigh"}:
                config["level"] = level

        if re.match(r"^maintenance_runner\s*:\s*$", line):
            in_runner = True
            in_modes = False
            continue

        if in_runner and re.match(r"^[^\s#]", line):
            in_runner = False
            in_modes = False

        if not in_runner:
            continue

        if re.match(r"^\s{2}modes\s*:\s*$", line):
            in_modes = True
            continue

        runner_match = re.match(r"^\s{2}(command|fallback)\s*:\s*(.+?)\s*$", line)
        if runner_match:
            config[runner_match.group(1)] = clean_yaml_value(runner_match.group(2))
            continue

        if in_modes:
            mode_match = re.match(r"^\s{4}(high|xhigh)\s*:\s*(.+?)\s*$", line)
            if mode_match:
                mode = clean_yaml_value(mode_match.group(2)).lower()
                if mode in {"async", "sync"}:
                    modes[mode_match.group(1)] = mode

    config["modes"] = modes
    return config


def count_pending_records(pending: Path) -> int:
    if not pending.exists():
        return 0
    text = pending.read_text(encoding="utf-8", errors="replace")
    status_count = len(re.findall(r"^Status:\s*pending\b", text, flags=re.MULTILINE | re.IGNORECASE))
    return status_count or len(re.findall(r"^###\s+", text, flags=re.MULTILINE))


def maintenance_decision(level: str, count: int, modes: dict[str, str]) -> tuple[bool, str, str]:
    if count <= 0:
        return (False, "none", "no pending knowledge governance records")
    if level == "low":
        return (False, "none", "low governance records only")
    if level == "medium":
        if count >= MEDIUM_REMINDER_THRESHOLD:
            return (False, "none", "medium governance reminder threshold reached")
        return (False, "none", "medium governance reminder threshold not reached")
    if level == "xhigh":
        return (True, modes.get("xhigh", "sync"), "xhigh governance runs when pending exists")
    if count >= HIGH_THRESHOLD:
        return (True, modes.get("high", "async"), "high governance threshold reached")
    return (False, "none", "high governance threshold not reached")


def write_prompt(root: Path, level: str, count: int, mode: str, reason: str) -> tuple[str, str]:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    prompts_dir = root / ".aiops" / "tmp" / "maintenance-prompts"
    logs_dir = root / ".aiops" / "tmp" / "maintenance-logs"
    prompts_dir.mkdir(parents=True, exist_ok=True)
    logs_dir.mkdir(parents=True, exist_ok=True)

    prompt_path = prompts_dir / f"{timestamp}-aiops-maintenance.md"
    log_path = logs_dir / f"{timestamp}-aiops-maintenance.log"

    docs_repo_host = os.environ.get("AIOPS_DOCS_REPO_HOST") or str(root)
    source_repo_host = os.environ.get("AIOPS_SOURCE_REPO_HOST") or "unknown"
    source_branch = os.environ.get("AIOPS_SOURCE_BRANCH") or "unknown"
    source_head = os.environ.get("AIOPS_SOURCE_HEAD") or "unknown"

    prompt = f"""You are the AIOps documentation maintenance executor.

Goal:
- Run the aiops-daily-doc-maintenance workflow for the pending records in this docs repository.

Context:
- Docs repo: {docs_repo_host}
- Current source repo: {source_repo_host}
- Current source branch: {source_branch}
- Current source HEAD: {source_head}
- Governance level: {level}
- Pending record count: {count}
- Runner mode: {mode}
- Trigger reason: {reason}

Rules:
1. Read .aiops/diff-records/pending.md first.
2. Read .aiops/governance.yaml, .aiops/projects/<project>/project.yaml, and .aiops/projects/<project>/iteration-bindings.yaml before changing canonical docs.
3. Treat pending.md as asynchronous coding-agent trace output. It is not a complete source diff.
4. Inspect referenced source repos directly before writing facts into canonical docs.
5. Check service code_root and required_branch from iteration-bindings.yaml before service-level maintenance.
6. Upsert affected canonical docs and guides only where the pending semantics require it.
7. You are the maintenance owner for this trigger: archive handled pending records into .aiops/diff-records/archived/YYYY-MM-DD.md and leave unhandled records in pending.md.
8. Do not edit source repositories. Only update docs/governance files in the docs repo unless a human explicitly asks otherwise.
9. For low/medium, do not auto-commit. For high, auto-commit only doc/governance changes when safe. For xhigh, auto-commit successful doc/governance maintenance unless blocked by branch mismatch or unclear ownership.
10. If Claude Code subagents are available, use a focused subagent for semantic maintenance and then review its changes before finishing.

Finish with a concise maintenance summary including project iteration, product/service scope, files changed, records archived, and validation performed.
"""
    prompt_path.write_text(prompt, encoding="utf-8")
    return (str(prompt_path), str(log_path))


def write_action(path: Path, values: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [f"{key}={shlex.quote(value)}" for key, value in values.items()]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def maybe_write_action(root: Path, values: dict[str, str]) -> None:
    action = os.environ.get("AIOPS_MAINTENANCE_ACTION")
    if not action:
        return
    write_action(Path(action), values)


def main() -> int:
    root = find_docs_root(Path.cwd())
    pending = root / ".aiops" / "diff-records" / "pending.md"
    governance = read_governance(root)
    level = str(governance["level"])
    command = str(governance["command"] or "claude")
    fallback = str(governance["fallback"] or "prompt_subagent")
    modes = governance["modes"] if isinstance(governance["modes"], dict) else {"high": "async", "xhigh": "sync"}
    count = count_pending_records(pending)
    should_run, mode, reason = maintenance_decision(level, count, modes)

    print(f"AIOps: {count} pending knowledge governance record(s), level={level}, reason={reason}.")
    print("Maintenance flow: pending.md -> iteration bindings -> source inspection -> canonical docs upsert -> archive handled records.")

    values = {
        "AIOPS_MAINTENANCE_SHOULD_RUN": "0",
        "AIOPS_MAINTENANCE_MODE": mode,
        "AIOPS_MAINTENANCE_COMMAND": command,
        "AIOPS_MAINTENANCE_FALLBACK": fallback,
        "AIOPS_MAINTENANCE_PROMPT_HOST": "",
        "AIOPS_MAINTENANCE_LOG_HOST": "",
    }

    if not should_run:
        maybe_write_action(root, values)
        if count > 0 and level in {"medium", "high"}:
            print("AIOps: maintenance not started by this hook. Keep recording semantic changes.")
        return 0

    prompt_path, log_path = write_prompt(root, level, count, mode, reason)
    values.update({
        "AIOPS_MAINTENANCE_SHOULD_RUN": "1",
        "AIOPS_MAINTENANCE_PROMPT_HOST": prompt_path.replace("/workspace", os.environ.get("AIOPS_DOCS_REPO_HOST", "/workspace"), 1),
        "AIOPS_MAINTENANCE_LOG_HOST": log_path.replace("/workspace", os.environ.get("AIOPS_DOCS_REPO_HOST", "/workspace"), 1),
    })
    maybe_write_action(root, values)
    print(f"AIOps: prepared Claude Code maintenance prompt: {values['AIOPS_MAINTENANCE_PROMPT_HOST']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

const AIOPS_HOOK_RUNNER_SH_TEMPLATE = String.raw`#!/usr/bin/env sh
set -eu

action="__DOLLAR__{1:-}"
event="__DOLLAR__{2:-__DOLLAR__{AIOPS_HOOK_EVENT:-hook}}"
docs_repo="__DOLLAR__{AIOPS_DOCS_REPO_HOST:-__DOLLAR__{PWD:-.}}"

if [ -f "__DOLLAR__{PWD:-.}/.aiops-docs.yaml" ]; then
  link_value=$(sed -n "s/^[[:space:]]*docs_repo:[[:space:]]*//p" "__DOLLAR__{PWD:-.}/.aiops-docs.yaml" | head -n 1)
  link_value=__DOLLAR__{link_value#\"}
  link_value=__DOLLAR__{link_value%\"}
  link_value=__DOLLAR__{link_value#\'}
  link_value=__DOLLAR__{link_value%\'}
  case "__DOLLAR__link_value" in
    /*) docs_repo="$link_value" ;;
    "") ;;
    *) docs_repo="__DOLLAR__{PWD:-.}/__DOLLAR__link_value" ;;
  esac
fi

if [ ! -d "__DOLLAR__docs_repo/.aiops" ]; then
  echo "AIOps: docs repo does not contain .aiops: __DOLLAR__docs_repo"
  exit 0
fi

source_repo=$(git -C "__DOLLAR__{PWD:-.}" rev-parse --show-toplevel 2>/dev/null || printf '%s' "__DOLLAR__{PWD:-.}")
source_branch=$(git -C "__DOLLAR__source_repo" branch --show-current 2>/dev/null || printf 'unknown')
source_head=$(git -C "__DOLLAR__source_repo" log -1 --format='%h %s' 2>/dev/null || printf 'unknown')

mkdir -p "__DOLLAR__docs_repo/.aiops/tmp"
hook_log="__DOLLAR__docs_repo/.aiops/tmp/hooks.log"
python_image="__DOLLAR__{AIOPS_HOOK_PYTHON_IMAGE:-python:3.10-alpine}"

run_python_hook_docker() {
  script="__DOLLAR__1"
  action_path="__DOLLAR__{2:-}"
  if [ -n "__DOLLAR__action_path" ]; then
    docker run --rm -i \
      -v "__DOLLAR__docs_repo":/workspace \
      -w /workspace \
      -e "AIOPS_AGENT=__DOLLAR__{AIOPS_AGENT:-unknown}" \
      -e "AIOPS_HOOK_EVENT=__DOLLAR__event" \
      -e "AIOPS_DOCS_REPO=/workspace" \
      -e "AIOPS_DOCS_REPO_HOST=__DOLLAR__docs_repo" \
      -e "AIOPS_SOURCE_REPO_HOST=__DOLLAR__source_repo" \
      -e "AIOPS_SOURCE_BRANCH=__DOLLAR__source_branch" \
      -e "AIOPS_SOURCE_HEAD=__DOLLAR__source_head" \
      -e "AIOPS_MAINTENANCE_ACTION=__DOLLAR__action_path" \
      "__DOLLAR__python_image" python "__DOLLAR__script"
    return "__DOLLAR__?"
  fi

  docker run --rm -i \
    -v "__DOLLAR__docs_repo":/workspace \
    -w /workspace \
    -e "AIOPS_AGENT=__DOLLAR__{AIOPS_AGENT:-unknown}" \
    -e "AIOPS_HOOK_EVENT=__DOLLAR__event" \
    -e "AIOPS_DOCS_REPO=/workspace" \
    -e "AIOPS_DOCS_REPO_HOST=__DOLLAR__docs_repo" \
    -e "AIOPS_SOURCE_REPO_HOST=__DOLLAR__source_repo" \
    -e "AIOPS_SOURCE_BRANCH=__DOLLAR__source_branch" \
    -e "AIOPS_SOURCE_HEAD=__DOLLAR__source_head" \
    "__DOLLAR__python_image" python "__DOLLAR__script"
}

run_python_hook_native() {
  script="__DOLLAR__1"
  action_path="__DOLLAR__{2:-}"
  python_bin="__DOLLAR__{AIOPS_HOOK_PYTHON:-}"
  if [ -z "__DOLLAR__python_bin" ]; then
    if command -v python3 >/dev/null 2>&1; then
      python_bin="python3"
    elif command -v python >/dev/null 2>&1; then
      python_bin="python"
    else
      echo "AIOps: docker and native python are unavailable; cannot run __DOLLAR__script."
      return 0
    fi
  fi

  if [ -n "__DOLLAR__action_path" ]; then
    (cd "__DOLLAR__docs_repo" && env \
      "AIOPS_AGENT=__DOLLAR__{AIOPS_AGENT:-unknown}" \
      "AIOPS_HOOK_EVENT=__DOLLAR__event" \
      "AIOPS_DOCS_REPO=__DOLLAR__docs_repo" \
      "AIOPS_DOCS_REPO_HOST=__DOLLAR__docs_repo" \
      "AIOPS_SOURCE_REPO_HOST=__DOLLAR__source_repo" \
      "AIOPS_SOURCE_BRANCH=__DOLLAR__source_branch" \
      "AIOPS_SOURCE_HEAD=__DOLLAR__source_head" \
      "AIOPS_MAINTENANCE_ACTION=__DOLLAR__action_path" \
      "__DOLLAR__python_bin" "__DOLLAR__script")
  else
    (cd "__DOLLAR__docs_repo" && env \
      "AIOPS_AGENT=__DOLLAR__{AIOPS_AGENT:-unknown}" \
      "AIOPS_HOOK_EVENT=__DOLLAR__event" \
      "AIOPS_DOCS_REPO=__DOLLAR__docs_repo" \
      "AIOPS_DOCS_REPO_HOST=__DOLLAR__docs_repo" \
      "AIOPS_SOURCE_REPO_HOST=__DOLLAR__source_repo" \
      "AIOPS_SOURCE_BRANCH=__DOLLAR__source_branch" \
      "AIOPS_SOURCE_HEAD=__DOLLAR__source_head" \
      "__DOLLAR__python_bin" "__DOLLAR__script")
  fi
}

run_python_hook() {
  script="__DOLLAR__1"
  host_action_path="__DOLLAR__{2:-}"
  container_action_path="__DOLLAR__{3:-}"

  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    if run_python_hook_docker "__DOLLAR__script" "__DOLLAR__container_action_path"; then
      return 0
    fi
    echo "AIOps: docker failed for __DOLLAR__script; trying native python fallback."
  fi

  run_python_hook_native "__DOLLAR__script" "__DOLLAR__host_action_path"
}

case "__DOLLAR__action" in
  inject)
    run_python_hook .aiops/hooks/aiops_inject_context.py
    ;;
  record)
    run_python_hook .aiops/hooks/aiops_record_diff.py >>"__DOLLAR__hook_log" 2>&1 || true
    ;;
  trigger)
    action_file="__DOLLAR__docs_repo/.aiops/tmp/maintenance-action.env"
    rm -f "__DOLLAR__action_file"
    run_python_hook .aiops/hooks/aiops_trigger_maintenance.py "__DOLLAR__action_file" /workspace/.aiops/tmp/maintenance-action.env

    if [ ! -f "__DOLLAR__action_file" ]; then
      exit 0
    fi

    # shellcheck disable=SC1090
    . "__DOLLAR__action_file"

    if [ "__DOLLAR__{AIOPS_MAINTENANCE_SHOULD_RUN:-0}" != "1" ]; then
      exit 0
    fi

    runner="__DOLLAR__{AIOPS_MAINTENANCE_COMMAND:-claude}"
    if ! command -v "__DOLLAR__runner" >/dev/null 2>&1; then
      echo "AIOps: Claude Code runner '__DOLLAR__runner' is unavailable."
      echo "AIOps: fallback=__DOLLAR__{AIOPS_MAINTENANCE_FALLBACK:-prompt_subagent}."
      echo "AIOps: Current coding LLM should use a subagent to run aiops-daily-doc-maintenance in __DOLLAR__docs_repo."
      echo "AIOps: Read .aiops/diff-records/pending.md, inspect referenced source repos, upsert docs, and archive handled records."
      exit 0
    fi

    prompt_path="__DOLLAR__{AIOPS_MAINTENANCE_PROMPT_HOST:-}"
    log_path="__DOLLAR__{AIOPS_MAINTENANCE_LOG_HOST:-__DOLLAR__docs_repo/.aiops/tmp/maintenance-logs/maintenance.log}"
    if [ ! -f "__DOLLAR__prompt_path" ]; then
      echo "AIOps: maintenance prompt missing: __DOLLAR__prompt_path"
      exit 0
    fi
    mkdir -p "$(dirname "__DOLLAR__log_path")"

    if [ "__DOLLAR__{AIOPS_MAINTENANCE_MODE:-async}" = "sync" ]; then
      (cd "__DOLLAR__docs_repo" && "__DOLLAR__runner" --add-dir "__DOLLAR__source_repo" -p "$(cat "__DOLLAR__prompt_path")") >"__DOLLAR__log_path" 2>&1 || {
        echo "AIOps: synchronous Claude Code maintenance failed. Log: __DOLLAR__log_path"
        cat "__DOLLAR__log_path"
        exit 1
      }
      echo "AIOps: synchronous Claude Code maintenance finished. Log: __DOLLAR__log_path"
    else
      (cd "__DOLLAR__docs_repo" && "__DOLLAR__runner" --add-dir "__DOLLAR__source_repo" -p "$(cat "__DOLLAR__prompt_path")") >"__DOLLAR__log_path" 2>&1 &
      echo "AIOps: started asynchronous Claude Code maintenance. Log: __DOLLAR__log_path"
    fi
    ;;
  *)
    echo "AIOps: unknown hook runner action: __DOLLAR__action"
    exit 0
    ;;
esac
`;

export const AIOPS_HOOK_RUNNER_SH = AIOPS_HOOK_RUNNER_SH_TEMPLATE.replaceAll("__DOLLAR__", "$");

export const WORKSPACE_HOOK_TEMPLATES = {
  "aiops_hook_runner.sh": AIOPS_HOOK_RUNNER_SH,
  "aiops_inject_context.py": AIOPS_INJECT_CONTEXT_PY,
  "aiops_record_diff.py": AIOPS_RECORD_DIFF_PY,
  "aiops_trigger_maintenance.py": AIOPS_TRIGGER_MAINTENANCE_PY,
} as const;
