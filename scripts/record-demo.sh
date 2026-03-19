#!/usr/bin/env bash
#
# Record a demo GIF of the Flyte VS Code extension.
#
# Usage: ./scripts/record-demo.sh
#
# Requirements: ffmpeg, xdotool, wmctrl (optional)
# Output: resources/demo.gif
#
set -euo pipefail

OUTDIR="$(cd "$(dirname "$0")/.." && pwd)/resources"
TMPVID="/tmp/flyte-demo-$$.mp4"
OUTGIF="$OUTDIR/demo.gif"
WORKSPACE="$(cd "$(dirname "$0")/../examples/ml-pipeline" && pwd)"
FPS=10
DURATION=45

echo "==> Opening VS Code with example project..."
code "$WORKSPACE" &
sleep 3

# Find VS Code window
WIN_ID=$(xdotool search --name "pipeline.py" 2>/dev/null | head -1 || \
         xdotool search --name "ml-pipeline" 2>/dev/null | head -1 || \
         xdotool search --class "Code" 2>/dev/null | head -1)

if [ -z "$WIN_ID" ]; then
  echo "ERROR: Could not find VS Code window. Open it manually and retry."
  exit 1
fi

echo "==> Found VS Code window: $WIN_ID"
xdotool windowactivate "$WIN_ID"
sleep 1

# Get window geometry
eval "$(xdotool getwindowgeometry --shell "$WIN_ID")"
echo "==> Window at ${X},${Y} size ${WIDTH}x${HEIGHT}"

echo "==> Recording ${DURATION}s at ${FPS}fps..."
echo "    Interact with VS Code now! The demo will show:"
echo "    1. Open pipeline.py (already open)"
echo "    2. Scroll to show CodeLens above tasks"
echo "    3. Click Flyte sidebar icon to show tree views"
echo "    4. Type a snippet (fenv + Tab)"
echo ""
echo "    Press Ctrl+C to stop early."

# Record the window region
ffmpeg -y \
  -video_size "${WIDTH}x${HEIGHT}" \
  -framerate "$FPS" \
  -f x11grab \
  -i ":0.0+${X},${Y}" \
  -t "$DURATION" \
  -c:v libx264 -preset ultrafast -crf 28 \
  "$TMPVID" 2>/dev/null &
FFPID=$!

trap "kill $FFPID 2>/dev/null; wait $FFPID 2>/dev/null" INT

# Automated demo sequence
sleep 2

# Open pipeline.py
xdotool key --window "$WIN_ID" ctrl+p
sleep 0.5
xdotool type --delay 80 "pipeline.py"
sleep 0.5
xdotool key Return
sleep 2

# Scroll to top to show environments
xdotool key --window "$WIN_ID" ctrl+Home
sleep 2

# Scroll down slowly to show CodeLens
for _ in $(seq 1 8); do
  xdotool key --window "$WIN_ID" Page_Down
  sleep 1.5
done

# Open Flyte sidebar
xdotool key --window "$WIN_ID" ctrl+shift+p
sleep 0.5
xdotool type --delay 60 "View: Show Flyte"
sleep 0.5
xdotool key Return
sleep 3

# Open new file for snippet demo
xdotool key --window "$WIN_ID" ctrl+n
sleep 1

# Set language to Python
xdotool key --window "$WIN_ID" ctrl+shift+p
sleep 0.5
xdotool type --delay 60 "Change Language Mode"
sleep 0.5
xdotool key Return
sleep 0.5
xdotool type --delay 60 "Python"
sleep 0.5
xdotool key Return
sleep 1

# Type snippet
xdotool type --window "$WIN_ID" --delay 150 "fenv"
sleep 1
xdotool key --window "$WIN_ID" Tab
sleep 2

xdotool key --window "$WIN_ID" Return Return
xdotool type --window "$WIN_ID" --delay 150 "ftask"
sleep 1
xdotool key --window "$WIN_ID" Tab
sleep 3

# Wait for recording to finish
wait $FFPID 2>/dev/null || true

echo "==> Converting to GIF..."
# Generate palette for high quality GIF
ffmpeg -y -i "$TMPVID" \
  -vf "fps=$FPS,scale=800:-1:flags=lanczos,palettegen=stats_mode=diff" \
  /tmp/palette-$$.png 2>/dev/null

ffmpeg -y -i "$TMPVID" -i /tmp/palette-$$.png \
  -lavfi "fps=$FPS,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" \
  "$OUTGIF" 2>/dev/null

rm -f "$TMPVID" /tmp/palette-$$.png

SIZE=$(du -h "$OUTGIF" | cut -f1)
echo "==> Done! GIF saved to: $OUTGIF ($SIZE)"
echo "    Preview: xdg-open $OUTGIF"
