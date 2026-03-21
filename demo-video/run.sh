#!/usr/bin/env bash
#
# Build and run the demo recorder container.
# Output goes to ./output/
#
# VNC access: http://localhost:6080/vnc.html
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Building Docker image..."
docker build \
  -f demo-video/Dockerfile \
  -t flyte-vscode-demo \
  .

echo ""
echo "Running demo recorder..."
echo ""
echo "  >>> Open http://localhost:6080/vnc.html to watch live <<<"
echo ""

mkdir -p demo-video/output

# Run with VNC ports exposed. Use docker create + start so we can copy files out.
CONTAINER_ID=$(docker create -p 5900:5900 -p 6080:6080 flyte-vscode-demo)
docker start -a "$CONTAINER_ID" || true

# Copy output files from container
docker cp "$CONTAINER_ID:/tmp/demo-output/." demo-video/output/ 2>/dev/null || true
docker rm "$CONTAINER_ID" > /dev/null 2>&1

echo ""
echo "Done! Output files:"
ls -lh demo-video/output/
