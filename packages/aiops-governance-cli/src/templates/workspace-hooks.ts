export const AIOPS_INJECT_CONTEXT_PY = String.raw`#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import os


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


def read_commit_cursor_summary(root: Path) -> str:
    projects_root = root / ".aiops" / "projects"
    if not projects_root.exists():
        return "未发现 .aiops/projects。"

    cursor_files = list(projects_root.glob("*/commit-analysis.md"))
    if not cursor_files:
        return "未发现 commit-analysis.md。"

    lines = ["commit analysis cursors:"]
    for cursor in cursor_files[:8]:
        project = cursor.parent.name
        rows = [
            line
            for line in cursor.read_text(encoding="utf-8", errors="replace").splitlines()
            if line.startswith("|") and "---" not in line and "Commit" not in line
        ]
        last = rows[-1] if rows else "no analyzed commits"
        lines.append(f"- {project}: {last}")

    summary = "\n".join(lines)
    return summary[:MAX_CHARS]


def main() -> int:
    root = find_docs_root(Path.cwd())
    summary = read_commit_cursor_summary(root)
    source_repo = os.environ.get("AIOPS_SOURCE_REPO_HOST") or os.environ.get("AIOPS_SOURCE_REPO") or "unknown"
    source_branch = os.environ.get("AIOPS_SOURCE_BRANCH") or "unknown"

    print("AIOps knowledge governance context")
    print(f"Docs repo: {root}")
    print(f"Current source repo: {source_repo}")
    print(f"Current source branch: {source_branch}")
    print("Human reading docs: .aiops/projects/<project>/")
    print("Schema: project iteration -> product version -> service required branch -> commit-analysis cursor.")
    print("Maintenance input: git push hook + unanalysed commits + commit-analysis.md")
    print("Development recall: for coding tasks, run aiops-dev-context-recall before risky edits.")
    print("Recall order: human reading docs -> source code -> CodeGraph / Understand Anything -> open questions.")
    print("Before reading-doc edits: read project.yaml and iteration-bindings.yaml; check service code_root branch against required_branch.")
    print("Maintenance is owned by Claude Code launched from source-repo pre-push hooks.")
    print("")
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

export const AIOPS_PUSH_MAINTENANCE_PY = String.raw`#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import os
import re
import shlex


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
        "modes": {"medium": "sync", "high": "async", "xhigh": "sync"},
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
            mode_match = re.match(r"^\s{4}(medium|high|xhigh)\s*:\s*(.+?)\s*$", line)
            if mode_match:
                mode = clean_yaml_value(mode_match.group(2)).lower()
                if mode in {"async", "sync"}:
                    modes[mode_match.group(1)] = mode

    config["modes"] = modes
    return config


def maintenance_decision(level: str, modes: dict[str, str]) -> tuple[bool, str, str]:
    if level == "low":
        return (False, "none", "low governance reports unanalysed commits only")
    if level == "medium":
        return (True, modes.get("medium", "sync"), "medium governance runs push maintenance with human review")
    if level == "xhigh":
        return (True, modes.get("xhigh", "sync"), "xhigh governance runs synchronous push maintenance")
    return (True, modes.get("high", "async"), "high governance runs push maintenance")


def write_prompt(root: Path, level: str, mode: str, reason: str) -> tuple[str, str]:
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
    local_ref = os.environ.get("AIOPS_PUSH_LOCAL_REF") or "unknown"
    remote_ref = os.environ.get("AIOPS_PUSH_REMOTE_REF") or "unknown"
    old_commit = os.environ.get("AIOPS_PUSH_OLD_COMMIT") or "unknown"
    new_commit = os.environ.get("AIOPS_PUSH_NEW_COMMIT") or "unknown"

    prompt = f"""You are the AIOps documentation maintenance executor.

Goal:
- Run the aiops-daily-doc-maintenance workflow for unanalysed source commits produced by git push.

Context:
- Docs repo: {docs_repo_host}
- Current source repo: {source_repo_host}
- Current source branch: {source_branch}
- Current source HEAD: {source_head}
- Push local ref: {local_ref}
- Push remote ref: {remote_ref}
- Push old commit: {old_commit}
- Push new commit: {new_commit}
- Governance level: {level}
- Runner mode: {mode}
- Trigger reason: {reason}

Rules:
1. Read .aiops/governance.yaml, .aiops/projects/<project>/project.yaml, .aiops/projects/<project>/iteration-bindings.yaml, and .aiops/projects/<project>/commit-analysis.md before changing human reading docs.
2. Enforce the selected docs_branch and each service required_branch from iteration-bindings.yaml.
3. If the pushed branch is not the governed main branch or a bound service required_branch, do not update human reading docs and do not advance commit-analysis.md.
4. Find the last analyzed commit for the same source repo and branch in commit-analysis.md.
5. Review unanalysed commits after that cursor and inside the push range, oldest to newest.
6. For each commit, inspect commit message, commit time, changed files, diff, source, tests, config, and graph context from CodeGraph / Understand Anything when needed.
7. Update only human reading docs whose business, architecture, workflow, ADR, risk, guide, or open-question content changed.
8. Do not create Markdown specs. Implementation facts come from code plus graph evidence.
9. After each commit is successfully handled, record its commit hash and commit time in commit-analysis.md before moving to the next commit.
10. Do not edit source repositories. Only update docs/governance files in the docs repo unless a human explicitly asks otherwise.
11. For medium, ask before committing docs. For high/xhigh, auto-commit only doc/governance changes when safe.

Finish with a concise maintenance summary including commits analyzed, last recorded cursor, files changed, branch preflight result, and validation performed.
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
    governance = read_governance(root)
    level = str(governance["level"])
    command = str(governance["command"] or "claude")
    fallback = str(governance["fallback"] or "prompt_subagent")
    modes = governance["modes"] if isinstance(governance["modes"], dict) else {"medium": "sync", "high": "async", "xhigh": "sync"}
    should_run, mode, reason = maintenance_decision(level, modes)

    print(f"AIOps: git push maintenance, level={level}, reason={reason}.")
    print("Maintenance flow: git push -> commit-analysis cursor -> unanalysed commits -> human reading docs.")

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
        print("AIOps: maintenance not started by this hook. Unanalysed commits remain for the next run.")
        return 0

    prompt_path, log_path = write_prompt(root, level, mode, reason)
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
source_branch=$(git -C "__DOLLAR__source_repo" symbolic-ref --short HEAD 2>/dev/null || git -C "__DOLLAR__source_repo" branch --show-current 2>/dev/null || printf 'unknown')
source_head=$(git -C "__DOLLAR__source_repo" log -1 --format='%h %s' 2>/dev/null || printf 'unknown')
push_local_ref="__DOLLAR__{AIOPS_PUSH_LOCAL_REF:-unknown}"
push_remote_ref="__DOLLAR__{AIOPS_PUSH_REMOTE_REF:-unknown}"
push_old_commit="__DOLLAR__{AIOPS_PUSH_OLD_COMMIT:-unknown}"
push_new_commit="__DOLLAR__{AIOPS_PUSH_NEW_COMMIT:-unknown}"

if [ "__DOLLAR__action" = "push-maintenance" ]; then
  if read push_local_ref_in push_new_commit_in push_remote_ref_in push_old_commit_in; then
    push_local_ref="__DOLLAR__{push_local_ref_in:-__DOLLAR__push_local_ref}"
    push_remote_ref="__DOLLAR__{push_remote_ref_in:-__DOLLAR__push_remote_ref}"
    push_old_commit="__DOLLAR__{push_old_commit_in:-__DOLLAR__push_old_commit}"
    push_new_commit="__DOLLAR__{push_new_commit_in:-__DOLLAR__push_new_commit}"
  fi
fi

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
      -e "AIOPS_PUSH_LOCAL_REF=__DOLLAR__push_local_ref" \
      -e "AIOPS_PUSH_REMOTE_REF=__DOLLAR__push_remote_ref" \
      -e "AIOPS_PUSH_OLD_COMMIT=__DOLLAR__push_old_commit" \
      -e "AIOPS_PUSH_NEW_COMMIT=__DOLLAR__push_new_commit" \
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
    -e "AIOPS_PUSH_LOCAL_REF=__DOLLAR__push_local_ref" \
    -e "AIOPS_PUSH_REMOTE_REF=__DOLLAR__push_remote_ref" \
    -e "AIOPS_PUSH_OLD_COMMIT=__DOLLAR__push_old_commit" \
    -e "AIOPS_PUSH_NEW_COMMIT=__DOLLAR__push_new_commit" \
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
      "AIOPS_PUSH_LOCAL_REF=__DOLLAR__push_local_ref" \
      "AIOPS_PUSH_REMOTE_REF=__DOLLAR__push_remote_ref" \
      "AIOPS_PUSH_OLD_COMMIT=__DOLLAR__push_old_commit" \
      "AIOPS_PUSH_NEW_COMMIT=__DOLLAR__push_new_commit" \
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
      "AIOPS_PUSH_LOCAL_REF=__DOLLAR__push_local_ref" \
      "AIOPS_PUSH_REMOTE_REF=__DOLLAR__push_remote_ref" \
      "AIOPS_PUSH_OLD_COMMIT=__DOLLAR__push_old_commit" \
      "AIOPS_PUSH_NEW_COMMIT=__DOLLAR__push_new_commit" \
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
    echo "AIOps: record action is deprecated; maintenance now runs from git pre-push." >>"__DOLLAR__hook_log" 2>&1 || true
    ;;
  trigger)
    echo "AIOps: trigger action is deprecated; maintenance now runs from git pre-push."
    exit 0
    ;;
  push-maintenance)
    action_file="__DOLLAR__docs_repo/.aiops/tmp/maintenance-action.env"
    rm -f "__DOLLAR__action_file"
    run_python_hook .aiops/hooks/aiops_push_maintenance.py "__DOLLAR__action_file" /workspace/.aiops/tmp/maintenance-action.env

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
      echo "AIOps: Read commit-analysis.md, inspect unanalysed source commits, update reading docs, and record commit hash/time."
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
  "aiops_push_maintenance.py": AIOPS_PUSH_MAINTENANCE_PY,
} as const;
