#!/usr/bin/env bash
#
# Record a demo GIF of the Flyte VS Code extension.
#
# Usage:
#   ./scripts/record-demo.sh
#
# Prerequisites: ffmpeg, xdotool
# Output: resources/demo.gif
#
# The script opens VS Code, waits for you to position the window,
# then records your interactions for 60 seconds.
#
set -euo pipefail

OUTDIR="$(cd "$(dirname "$0")/.." && pwd)/resources"
TMPVID="/tmp/flyte-demo-$$.mp4"
OUTGIF="$OUTDIR/demo.gif"
FPS=8
DURATION=60

echo "=== Flyte Extension Demo Recorder ==="
echo ""
echo "Steps:"
echo "  1. Open VS Code with the ml-pipeline example"
echo "  2. Make sure the Flyte sidebar is visible"
echo "  3. Position and resize the window how you want it recorded"
echo "  4. Press ENTER here to start recording ($DURATION seconds)"
echo ""
echo "During recording, show these features:"
echo "  - Sidebar: Environments, Tasks, Apps, Clusters sections"
echo "  - CodeLens: Run Task and Graph above tasks in pipeline.py"
echo "  - Autocomplete: Type inside TaskEnvironment( to see suggestions"
echo "  - Hover: Mouse over TaskEnvironment, Resources, flyte.run"
echo "  - GPU autocomplete: Type gpu= inside Resources("
echo "  - Snippets: Type ftask + Tab in a new line"
echo "  - Run Task: Click Run Task on run_training_pipeline"
echo ""
read -p "Press ENTER to start recording..."

# Find VS Code window
WIN_ID=$(xdotool search --name "Visual Studio Code" 2>/dev/null | head -1 || \
         xdotool search --name "pipeline.py" 2>/dev/null | head -1 || \
         xdotool search --name "ml-pipeline" 2>/dev/null | head -1 || \
         xdotool search --class "Code" 2>/dev/null | head -1 || \
         xdotool search --class "code" 2>/dev/null | head -1 || true)

if [ -z "$WIN_ID" ]; then
  echo "Could not find VS Code window automatically."
  echo "Click on the VS Code window within 5 seconds..."
  sleep 5
  WIN_ID=$(xdotool getactivewindow 2>/dev/null || true)
fi

if [ -z "$WIN_ID" ]; then
  echo "ERROR: Could not find window. Recording full screen instead."
  # Record full screen
  SCREEN_RES=$(xdpyinfo 2>/dev/null | grep dimensions | awk '{print $2}' || echo "1920x1080")
  ffmpeg -y \
    -video_size "$SCREEN_RES" \
    -framerate "$FPS" \
    -f x11grab \
    -i ":0.0" \
    -t "$DURATION" \
    -c:v libx264 -preset ultrafast -crf 28 \
    "$TMPVID" 2>/dev/null &
else
  xdotool windowactivate "$WIN_ID" 2>/dev/null || true
  sleep 0.5
  eval "$(xdotool getwindowgeometry --shell "$WIN_ID" 2>/dev/null)" || {
    echo "Could not get window geometry. Recording full screen."
    SCREEN_RES=$(xdpyinfo 2>/dev/null | grep dimensions | awk '{print $2}' || echo "1920x1080")
    ffmpeg -y \
      -video_size "$SCREEN_RES" \
      -framerate "$FPS" \
      -f x11grab \
      -i ":0.0" \
      -t "$DURATION" \
      -c:v libx264 -preset ultrafast -crf 28 \
      "$TMPVID" 2>/dev/null &
    X=0; Y=0; WIDTH=1920; HEIGHT=1080
  }

  if [ -n "${WIDTH:-}" ] && [ "$WIDTH" -gt 0 ] 2>/dev/null; then
    echo "Recording window: ${WIDTH}x${HEIGHT} at ${X},${Y}"
    ffmpeg -y \
      -video_size "${WIDTH}x${HEIGHT}" \
      -framerate "$FPS" \
      -f x11grab \
      -i ":0.0+${X},${Y}" \
      -t "$DURATION" \
      -c:v libx264 -preset ultrafast -crf 28 \
      "$TMPVID" 2>/dev/null &
  fi
fi

FFPID=$!
echo ""
echo "Recording for $DURATION seconds... Interact with VS Code now!"
echo "Press Ctrl+C to stop early."
echo ""

trap "kill $FFPID 2>/dev/null; wait $FFPID 2>/dev/null" INT
wait $FFPID 2>/dev/null || true

echo ""
echo "Converting to GIF..."

ffmpeg -y -i "$TMPVID" \
  -vf "fps=$FPS,scale=800:-1:flags=lanczos,palettegen=stats_mode=diff" \
  /tmp/palette-$$.png 2>/dev/null

ffmpeg -y -i "$TMPVID" -i /tmp/palette-$$.png \
  -lavfi "fps=$FPS,scale=800:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" \
  "$OUTGIF" 2>/dev/null

rm -f "$TMPVID" /tmp/palette-$$.png

SIZE=$(du -h "$OUTGIF" | cut -f1)
echo ""
echo "Done! GIF saved to: $OUTGIF ($SIZE)"
echo "Preview: xdg-open $OUTGIF"
