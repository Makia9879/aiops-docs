#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_DIR="/repo/packages/aiops-governance-cli"
EXPECTED_VERSION="${EXPECTED_VERSION:-0.1.0}"
NODE_IMAGE="${NODE_IMAGE:-node:24-bookworm}"
DRY_RUN="${DRY_RUN:-false}"

if [[ -z "${NPM_TOKEN:-}" ]]; then
  echo "NPM_TOKEN is required." >&2
  exit 1
fi

docker run --rm \
  -e NPM_TOKEN \
  -e EXPECTED_VERSION="${EXPECTED_VERSION}" \
  -e DRY_RUN="${DRY_RUN}" \
  -v "${REPO_ROOT}:/repo" \
  -w "${PACKAGE_DIR}" \
  "${NODE_IMAGE}" \
  bash -lc '
    set -euo pipefail

    printf "//registry.npmjs.org/:_authToken=%s\n" "$NPM_TOKEN" > /tmp/aiops-npmrc
    export npm_config_userconfig=/tmp/aiops-npmrc

    npm ci

    node -e "const pkg=require(\"./package.json\"); if (pkg.version !== process.env.EXPECTED_VERSION) { throw new Error(\"Expected version \" + process.env.EXPECTED_VERSION + \", got \" + pkg.version); }"

    npm run check
    npm pack --dry-run

    if [[ "$DRY_RUN" == "true" ]]; then
      echo "DRY_RUN=true, skipping npm publish."
      exit 0
    fi

    npm publish --access public
  '
