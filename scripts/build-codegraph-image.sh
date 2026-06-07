#!/usr/bin/env bash
set -euo pipefail

# Build a Docker image with the CodeGraph CLI installed by the README npm method.
#
# Usage:
#   scripts/build-codegraph-image.sh
#
# Environment:
#   IMAGE_NAME     Docker image tag. Default: codegraph:local
#   BASE_IMAGE     Local/base Node image. Default: node:24-bookworm
#   PLATFORM       Optional docker build platform, e.g. linux/amd64
#   DOCKERFILE      Dockerfile path relative to repo root. Default: Dockerfile.codegraph
#   DOCKER_BUILDKIT Set to 0 to disable BuildKit. Default: 1

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

IMAGE_NAME="${IMAGE_NAME:-codegraph:local}"
BASE_IMAGE="${BASE_IMAGE:-node:24-bookworm}"
DOCKERFILE="${DOCKERFILE:-Dockerfile.codegraph}"
DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"

if [[ ! -f "$REPO_ROOT/$DOCKERFILE" ]]; then
  echo "Dockerfile not found: $REPO_ROOT/$DOCKERFILE" >&2
  exit 1
fi

build_args=(build -f "$REPO_ROOT/$DOCKERFILE" -t "$IMAGE_NAME" --build-arg "BASE_IMAGE=$BASE_IMAGE")
if [[ -n "${PLATFORM:-}" ]]; then
  build_args+=(--platform "$PLATFORM")
fi
build_args+=("$REPO_ROOT")

echo "Building $IMAGE_NAME"
echo "Base image: $BASE_IMAGE"
echo "Dockerfile: $DOCKERFILE"
DOCKER_BUILDKIT="$DOCKER_BUILDKIT" docker "${build_args[@]}"

echo
echo "Built image: $IMAGE_NAME"
echo "Try it with: docker run --rm $IMAGE_NAME --help"
