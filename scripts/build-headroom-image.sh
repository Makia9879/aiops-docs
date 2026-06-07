#!/usr/bin/env bash
set -euo pipefail

# Build a Docker image with the Headroom proxy service installed by the README method.
#
# Usage:
#   scripts/build-headroom-image.sh
#
# Environment:
#   IMAGE_NAME       Docker image tag. Default: headroom:local
#   PYTHON_IMAGE     Local/base Python image. Default: registry.cn-hangzhou.aliyuncs.com/makia_docker/python:3.13-slim
#   DOCKERFILE       Dockerfile path relative to repo root. Default: Dockerfile.headroom
#   HEADROOM_EXTRAS  Python extras to install. Default: all
#   PLATFORM         Docker build platform. Default: linux/amd64
#   DOCKER_BUILDKIT  Set to 0 to disable BuildKit. Default: 1

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

IMAGE_NAME="${IMAGE_NAME:-headroom:local}"
PYTHON_IMAGE="${PYTHON_IMAGE:-registry.cn-hangzhou.aliyuncs.com/makia_docker/python:3.13-slim}"
DOCKERFILE="${DOCKERFILE:-Dockerfile.headroom}"
HEADROOM_EXTRAS="${HEADROOM_EXTRAS:-all}"
DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"

if [[ ! -f "$REPO_ROOT/$DOCKERFILE" ]]; then
  echo "Dockerfile not found: $REPO_ROOT/$DOCKERFILE" >&2
  exit 1
fi

build_args=(
  build
  -f "$REPO_ROOT/$DOCKERFILE"
  -t "$IMAGE_NAME"
  --build-arg "PYTHON_IMAGE=$PYTHON_IMAGE"
  --build-arg "HEADROOM_EXTRAS=$HEADROOM_EXTRAS"
)
PLATFORM="${PLATFORM:-linux/amd64}"
build_args+=(--platform "$PLATFORM")
build_args+=("$REPO_ROOT")

echo "Building $IMAGE_NAME"
echo "Base image: $PYTHON_IMAGE"
echo "Dockerfile: $DOCKERFILE"
echo "Headroom extras: $HEADROOM_EXTRAS"
echo "Platform: $PLATFORM"
DOCKER_BUILDKIT="$DOCKER_BUILDKIT" docker "${build_args[@]}"

echo
echo "Built image: $IMAGE_NAME"
echo "Try it with: docker run --rm -p 8787:8787 $IMAGE_NAME"
