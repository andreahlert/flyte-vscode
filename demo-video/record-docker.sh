#!/usr/bin/env bash
#
# Flyte VS Code Extension - Automated Demo Recorder (Docker/Xvfb)
#
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────
PROJECT_DIR="/home/demo/project"
WORK_DIR="/tmp/demo-output"
OUTPUT_DIR="/home/demo/output"
RAW_VIDEO="$WORK_DIR/raw-demo.mkv"
FINAL_VIDEO="$WORK_DIR/demo.mp4"
DEBUG_DIR="$WORK_DIR/debug"

SCREEN_W=1920
SCREEN_H=1080
FPS=30

# ─── Helpers ─────────────────────────────────────────────────────────────
log() { echo "[demo] $(date +%H:%M:%S) $1"; }

# Type with realistic delay
type_slow() {
  xdotool type --clearmodifiers --delay 50 "$1"
}

type_fast() {
  xdotool type --clearmodifiers --delay 25 "$1"
}

key() {
  xdotool key --clearmodifiers "$1"
  sleep 0.2
}

pause() { sleep "${1:-0.5}"; }

screenshot() {
  local name="${1:-state}"
  import -window root "$DEBUG_DIR/${name}.png" 2>/dev/null || true
}

# ─── Xvfb + VNC ─────────────────────────────────────────────────────────
start_xvfb() {
  log "Starting Xvfb..."
  mkdir -p /tmp/.X11-unix
  Xvfb :99 -screen 0 "${SCREEN_W}x${SCREEN_H}x24" -ac +extension GLX +render -noreset &
  XVFB_PID=$!
  sleep 2
  log "Xvfb running"

  # Start VNC server (no password)
  log "Starting VNC server on :5900..."
  x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -bg -o /tmp/x11vnc.log 2>/dev/null
  sleep 1

  # Start noVNC web client on :6080
  log "Starting noVNC on :6080..."
  websockify --web /usr/share/novnc 6080 localhost:5900 &>/tmp/novnc.log &
  sleep 1

  log ">>> VNC ready! Open http://localhost:6080/vnc.html in your browser <<<"
  log ">>> Waiting 5s for you to connect before starting... <<<"
  sleep 5
}

# ─── Recording ──────────────────────────────────────────────────────────
start_recording() {
  log "Starting recording..."
  ffmpeg -y \
    -video_size "${SCREEN_W}x${SCREEN_H}" \
    -framerate "$FPS" \
    -f x11grab \
    -i :99+0,0 \
    -c:v libx264 \
    -preset ultrafast \
    -crf 18 \
    -pix_fmt yuv420p \
    "$RAW_VIDEO" 2>/dev/null &
  FFMPEG_PID=$!
  sleep 1
  log "Recording started"
}

stop_recording() {
  log "Stopping recording..."
  kill -INT "$FFMPEG_PID" 2>/dev/null || true
  wait "$FFMPEG_PID" 2>/dev/null || true
  log "Recording saved"
}

# ─── VS Code Setup ─────────────────────────────────────────────────────
open_vscode() {
  log "Launching VS Code..."
  code "$PROJECT_DIR" --new-window --disable-gpu --no-sandbox \
    --disable-extension github.copilot \
    --disable-extension github.copilot-chat \
    --disable-extension github.vscode-github-authentication \
    --disable-extension ms-vscode.remote-explorer \
    --disable-extension ms-vscode.copilot \
    2>/dev/null &

  # Wait for window
  local wid=""
  for (( i=0; i<30; i++ )); do
    wid=$(xdotool search --class "code" 2>/dev/null | head -1 || true)
    [ -n "$wid" ] && break
    sleep 1
  done

  if [ -z "$wid" ]; then
    log "ERROR: VS Code not found"
    exit 1
  fi

  log "Window found: $wid"
  sleep 5

  # Force fullscreen: move to 0,0 and resize to screen size
  xdotool windowmove "$wid" 0 0 2>/dev/null || true
  xdotool windowsize "$wid" "$SCREEN_W" "$SCREEN_H" 2>/dev/null || true
  xdotool windowactivate "$wid" 2>/dev/null || true
  sleep 1
  xdotool windowfocus "$wid" 2>/dev/null || true
  sleep 3

  screenshot "01-vscode-opened"

  # Accept "Trust authors" dialog if present (Tab to the button, Enter)
  # The "Yes, I trust" button is focused by default, just press Enter
  key "Return"
  pause 1

  # Close secondary sidebar (Copilot Chat): Ctrl+Alt+B
  key "ctrl+alt+b"
  pause 0.5

  # Close any open tabs
  key "ctrl+w"
  pause 0.3
  key "ctrl+w"
  pause 0.3

  # Dismiss anything else
  key "Escape"
  pause 0.2
  key "Escape"
  pause 0.2
  key "Escape"
  pause 0.5

  # Close the primary sidebar for clean view
  key "ctrl+b"
  pause 0.5

  # Focus editor area
  key "ctrl+1"
  pause 1

  screenshot "02-clean-state"
  log "VS Code ready"
}

# ─── Demo Scenes ────────────────────────────────────────────────────────

scene_open_file() {
  log ">> Opening pipeline.py"

  # Use Quick Open to open the file
  key "ctrl+p"
  pause 0.8
  type_fast "pipeline.py"
  pause 0.8
  key "Return"
  pause 2

  # Make sure we're at the top
  key "ctrl+Home"
  pause 1

  screenshot "03-file-opened"
}

scene_browse_code() {
  log ">> Browsing code"

  # Slow scroll down to show the code structure
  for _ in $(seq 1 30); do
    key "Down"
    sleep 0.08
  done
  pause 1.5

  # Scroll back up
  key "ctrl+Home"
  pause 1

  screenshot "04-browsed-code"
}

scene_autocomplete() {
  log ">> Autocomplete demo"

  # Go to end of file
  key "ctrl+End"
  pause 0.5
  key "Return"
  key "Return"

  # Type a comment first so viewer knows what's happening
  type_slow "# New environment with autocomplete"
  key "Return"

  # Type TaskEnvironment constructor
  type_slow "env2 = flyte.TaskEnvironment("
  pause 0.8
  key "Return"

  # Type name param
  type_slow "    name="
  type_slow '"inference"'
  type_slow ","
  key "Return"

  # Now type "    " and trigger autocomplete
  type_slow "    "
  pause 0.5

  screenshot "05-before-autocomplete"

  # Trigger intellisense
  key "ctrl+space"
  pause 2

  screenshot "06-autocomplete-shown"

  # Navigate through items slowly
  key "Down"
  pause 0.6
  key "Down"
  pause 0.6
  key "Down"
  pause 0.6

  screenshot "07-autocomplete-navigated"

  # Accept the suggestion
  key "Escape"
  pause 0.5
}

scene_gpu_suggestions() {
  log ">> GPU accelerator suggestions"

  # Type resources with gpu=
  type_slow "resources=flyte.Resources("
  key "Return"
  type_slow "        cpu=4,"
  key "Return"
  type_slow '        memory="32Gi",'
  key "Return"
  type_slow "        gpu="
  pause 0.5

  # Trigger GPU suggestions
  key "ctrl+space"
  pause 2

  screenshot "08-gpu-suggestions"

  # Navigate
  key "Down"
  pause 0.5
  key "Down"
  pause 0.5

  screenshot "09-gpu-navigated"

  # Accept
  key "Return"
  pause 1

  screenshot "10-gpu-selected"
}

scene_hover_docs() {
  log ">> Hover documentation"

  # Go to a known line with @env.task decorator
  key "ctrl+Home"
  pause 0.5

  # Use Ctrl+G to go to a specific line
  key "ctrl+g"
  pause 0.5

  # Find the first @env.task in the file
  # Based on ml-pipeline/pipeline.py, decorators are around line 20+
  type_fast "21"
  key "Return"
  pause 1

  screenshot "11-at-decorator-line"

  # Use keyboard shortcut to trigger hover: Ctrl+K Ctrl+I
  key "ctrl+k"
  sleep 0.1
  key "ctrl+i"
  pause 3

  screenshot "12-hover-shown"

  # Dismiss hover
  key "Escape"
  pause 0.5
}

scene_sidebar() {
  log ">> Sidebar views"

  # Open Flyte sidebar via command palette
  key "ctrl+shift+p"
  pause 0.8
  type_fast "View: Show Flyte"
  pause 1

  screenshot "13-command-palette-flyte"

  # Try to find and select the Flyte view
  key "Return"
  pause 2

  screenshot "14-sidebar-open"

  # Go back to editor
  key "ctrl+1"
  pause 1
}

scene_snippets() {
  log ">> Snippet expansion"

  # Go to end of file
  key "ctrl+End"
  pause 0.3
  key "Return"
  key "Return"

  # Type comment
  type_slow "# Task created via snippet"
  key "Return"
  pause 0.5

  # Type snippet prefix
  type_slow "ftask"
  pause 0.5

  # Trigger snippet
  key "ctrl+space"
  pause 1.5

  screenshot "15-snippet-suggestions"

  # Accept
  key "Return"
  pause 2

  screenshot "16-snippet-expanded"
}

scene_graph() {
  log ">> Task graph"

  # Open command palette and run graph command
  key "ctrl+shift+p"
  pause 0.8
  type_fast "Flyte: Show Task Graph"
  pause 1
  key "Return"
  pause 3

  screenshot "17-task-graph"

  # Close the graph
  key "ctrl+w"
  pause 0.5
}

# ─── Post-production ────────────────────────────────────────────────────
post_production() {
  log "Post-production..."

  ffmpeg -y \
    -i "$RAW_VIDEO" \
    -c:v libx264 \
    -preset slow \
    -crf 22 \
    -pix_fmt yuv420p \
    -vf "scale=1920:-2" \
    "$FINAL_VIDEO" 2>/dev/null

  log "Video: $FINAL_VIDEO"
}

# ─── Main ───────────────────────────────────────────────────────────────
main() {
  mkdir -p "$WORK_DIR" "$OUTPUT_DIR" "$DEBUG_DIR"

  start_xvfb
  open_vscode
  start_recording

  pause 1

  scene_open_file
  scene_browse_code
  scene_autocomplete
  scene_gpu_suggestions
  scene_hover_docs
  scene_sidebar
  scene_snippets
  scene_graph

  pause 2

  stop_recording
  post_production

  kill "$XVFB_PID" 2>/dev/null || true

  # Copy everything out
  cp "$WORK_DIR"/*.mp4 "$OUTPUT_DIR/" 2>/dev/null || true
  cp "$WORK_DIR"/*.mkv "$OUTPUT_DIR/" 2>/dev/null || true
  cp "$DEBUG_DIR"/*.png "$OUTPUT_DIR/" 2>/dev/null || true

  log "=== Done! ==="
  ls -lh "$OUTPUT_DIR/"
}

main "$@"
