#!/usr/bin/env bash
set -euo pipefail

# Build a Docker image with Understand-Anything installed by the README installer.
#
# Usage:
#   scripts/build-understand-anything-image.sh
#
# Environment:
#   IMAGE_NAME     Docker image tag. Default: understand-anything:local
#   BASE_IMAGE     Local/base Node image. Default: node:24-bookworm
#   UA_PLATFORM    Understand-Anything installer platform. Default: codex
#   PLATFORM       Optional docker build platform, e.g. linux/amd64
#   DOCKERFILE      Dockerfile path relative to repo root. Default: Dockerfile.understand-anything
#   DOCKER_BUILDKIT Set to 0 to disable BuildKit. Default: 1

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

IMAGE_NAME="${IMAGE_NAME:-understand-anything:local}"
BASE_IMAGE="${BASE_IMAGE:-node:24-bookworm}"
UA_PLATFORM="${UA_PLATFORM:-codex}"
DOCKERFILE="${DOCKERFILE:-Dockerfile.understand-anything}"
DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"

if [[ ! -f "$REPO_ROOT/$DOCKERFILE" ]]; then
  echo "Dockerfile not found: $REPO_ROOT/$DOCKERFILE" >&2
  exit 1
fi

build_args=(build -f "$REPO_ROOT/$DOCKERFILE" -t "$IMAGE_NAME" --build-arg "BASE_IMAGE=$BASE_IMAGE" --build-arg "UA_PLATFORM=$UA_PLATFORM")
if [[ -n "${PLATFORM:-}" ]]; then
  build_args+=(--platform "$PLATFORM")
fi
build_args+=("$REPO_ROOT")

echo "Building $IMAGE_NAME"
echo "Base image: $BASE_IMAGE"
echo "Dockerfile: $DOCKERFILE"
echo "Understand-Anything platform: $UA_PLATFORM"
DOCKER_BUILDKIT="$DOCKER_BUILDKIT" docker "${build_args[@]}"

echo
echo "Built image: $IMAGE_NAME"
echo "Try it with: docker run --rm $IMAGE_NAME"
