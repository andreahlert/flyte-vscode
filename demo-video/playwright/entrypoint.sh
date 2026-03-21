#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="/home/demo/output"
mkdir -p "$OUTPUT_DIR"

echo "[demo] Starting code-server on :8080..."
~/.local/bin/code-server --auth none --bind-addr 0.0.0.0:8080 /home/demo/project &
CODE_PID=$!

# Wait for code-server to be up
echo "[demo] Waiting for code-server to start..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "[demo] code-server is up!"
    break
  fi
  sleep 1
done

echo "[demo] >>> code-server running at http://localhost:8080 <<<"
echo "[demo] >>> Open it in your browser to watch live! <<<"
echo ""

# Run the playwright recorder
echo "[demo] Starting Playwright recorder..."
cd /home/demo/recorder
CODE_SERVER_URL="http://localhost:8080" OUTPUT_DIR="$OUTPUT_DIR" node record.mjs

# Convert webm to mp4
echo "[demo] Converting video..."
VIDEO_FILE=$(ls "$OUTPUT_DIR"/*.webm 2>/dev/null | head -1)
if [ -n "$VIDEO_FILE" ]; then
  ffmpeg -y -i "$VIDEO_FILE" \
    -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p \
    -vf "scale=1920:-2" \
    "$OUTPUT_DIR/demo.mp4" 2>/dev/null
  echo "[demo] Video: $OUTPUT_DIR/demo.mp4"
fi

# Create GIF
if [ -f "$OUTPUT_DIR/demo.mp4" ]; then
  ffmpeg -y -i "$OUTPUT_DIR/demo.mp4" \
    -vf "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
    "$OUTPUT_DIR/demo.gif" 2>/dev/null
  echo "[demo] GIF: $OUTPUT_DIR/demo.gif"
fi

kill "$CODE_PID" 2>/dev/null || true

echo "[demo] === Done! ==="
ls -lh "$OUTPUT_DIR/"
