#!/usr/bin/env bash
#
# Build and run the Playwright-based demo recorder.
#
# Watch live: http://localhost:8080 (code-server in the browser)
# Output: ./output/
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

cd "$PROJECT_DIR"

echo "Building Docker image (Playwright + code-server)..."
docker build \
  -f demo-video/playwright/Dockerfile \
  -t flyte-vscode-demo-pw \
  .

echo ""
echo "Running demo recorder..."
echo ""
echo "  >>> Open http://localhost:8080 to watch live <<<"
echo ""

mkdir -p demo-video/playwright/output

# Create and run (need to copy files out after)
CONTAINER_ID=$(docker create -p 8080:8080 flyte-vscode-demo-pw)
docker start -a "$CONTAINER_ID" || true

# Copy output
docker cp "$CONTAINER_ID:/home/demo/output/." demo-video/playwright/output/ 2>/dev/null || true
docker rm "$CONTAINER_ID" > /dev/null 2>&1

echo ""
echo "Done! Output files:"
ls -lh demo-video/playwright/output/
