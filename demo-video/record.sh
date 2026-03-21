#!/usr/bin/env bash
#
# Flyte VS Code Extension - Automated Demo Recorder
#
# Pilots VS Code with xdotool and records the screen with ffmpeg.
# Run with: ./record.sh
#
# Prerequisites: xdotool, ffmpeg, wmctrl, code (VS Code)
#
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────
PROJECT_DIR="/home/ahlert/Dev/Flyte/flyte-vscode"
EXAMPLE_DIR="$PROJECT_DIR/examples/ml-pipeline"
OUTPUT_DIR="$PROJECT_DIR/demo-video/output"
RAW_VIDEO="$OUTPUT_DIR/raw-demo.mkv"
FINAL_VIDEO="$OUTPUT_DIR/demo.mp4"
FINAL_GIF="$OUTPUT_DIR/demo.gif"

# Recording settings
FPS=30
SCREEN=":0"  # X11 display

# Typing speed (seconds between keystrokes)
TYPE_DELAY=0.04
# Pause between actions (seconds)
SHORT_PAUSE=0.5
MEDIUM_PAUSE=1.0
LONG_PAUSE=2.0

# ─── Helpers ─────────────────────────────────────────────────────────────

mkdir -p "$OUTPUT_DIR"

log() {
  echo "[demo] $1"
}

# Type text character by character
type_text() {
  local text="$1"
  local delay="${2:-$TYPE_DELAY}"
  for (( i=0; i<${#text}; i++ )); do
    local char="${text:$i:1}"
    case "$char" in
      " ")  xdotool key space ;;
      ".")  xdotool key period ;;
      ",")  xdotool key comma ;;
      "(")  xdotool key shift+9 ;;
      ")")  xdotool key shift+0 ;;
      "=")  xdotool key equal ;;
      '"')  xdotool key shift+apostrophe ;;
      "'")  xdotool key apostrophe ;;
      ":")  xdotool key shift+semicolon ;;
      "@")  xdotool key shift+2 ;;
      "_")  xdotool key shift+minus ;;
      "-")  xdotool key minus ;;
      "/")  xdotool key slash ;;
      ">")  xdotool key shift+period ;;
      "[")  xdotool key bracketleft ;;
      "]")  xdotool key bracketright ;;
      "{")  xdotool key shift+bracketleft ;;
      "}")  xdotool key shift+bracketright ;;
      "#")  xdotool key shift+3 ;;
      *)    xdotool key "$char" ;;
    esac
    sleep "$delay"
  done
}

# Press key combo
press() {
  xdotool key "$1"
  sleep 0.15
}

# Wait
pause() {
  sleep "${1:-$SHORT_PAUSE}"
}

# Move mouse smoothly to (x, y) relative to active window
move_to() {
  local x="$1" y="$2"
  local steps=20
  local duration=0.4

  # Get current mouse position
  eval "$(xdotool getmouselocation --shell)"
  local start_x="$X" start_y="$Y"

  for (( s=1; s<=steps; s++ )); do
    local frac
    # Ease-out cubic: 1 - (1 - t)^3
    frac=$(echo "scale=6; t=$s/$steps; 1 - (1 - t)^3" | bc)
    local nx=$(echo "scale=0; $start_x + ($x - $start_x) * $frac" | bc | cut -d. -f1)
    local ny=$(echo "scale=0; $start_y + ($y - $start_y) * $frac" | bc | cut -d. -f1)
    xdotool mousemove "$nx" "$ny"
    sleep "$(echo "scale=4; $duration / $steps" | bc)"
  done
}

# Get window geometry
get_win_geometry() {
  local wid="$1"
  xdotool getwindowgeometry --shell "$wid"
}

# Focus VS Code window
focus_vscode() {
  wmctrl -a "Visual Studio Code" 2>/dev/null || true
  sleep 0.3
}

# Start ffmpeg recording
start_recording() {
  log "Starting screen recording..."

  # Get VS Code window position and size
  local wid
  wid=$(xdotool search --name "Visual Studio Code" | head -1)

  if [ -z "$wid" ]; then
    log "ERROR: VS Code window not found"
    exit 1
  fi

  eval "$(get_win_geometry "$wid")"
  local wx="$X" wy="$Y" ww="$WIDTH" wh="$HEIGHT"

  # Ensure even dimensions (ffmpeg requirement)
  ww=$(( ww / 2 * 2 ))
  wh=$(( wh / 2 * 2 ))

  log "Recording window at ${wx},${wy} size ${ww}x${wh}"

  ffmpeg -y \
    -video_size "${ww}x${wh}" \
    -framerate "$FPS" \
    -f x11grab \
    -i "${SCREEN}+${wx},${wy}" \
    -c:v libx264 \
    -preset ultrafast \
    -crf 18 \
    -pix_fmt yuv420p \
    "$RAW_VIDEO" &

  FFMPEG_PID=$!
  sleep 1
  log "Recording started (PID: $FFMPEG_PID)"
}

# Stop recording
stop_recording() {
  log "Stopping recording..."
  kill -INT "$FFMPEG_PID" 2>/dev/null || true
  wait "$FFMPEG_PID" 2>/dev/null || true
  log "Recording saved to $RAW_VIDEO"
}

# ─── Demo Script ─────────────────────────────────────────────────────────

run_demo() {
  log "=== Scene 1: Open project and show code ==="

  # Let VS Code settle
  pause "$LONG_PAUSE"

  # Open the pipeline.py file via command palette
  press "ctrl+p"
  pause "$SHORT_PAUSE"
  type_text "pipeline.py"
  pause "$SHORT_PAUSE"
  press "Return"
  pause "$LONG_PAUSE"

  # Scroll to top
  press "ctrl+Home"
  pause "$MEDIUM_PAUSE"

  # Slow scroll down to show the code
  for i in $(seq 1 15); do
    press "Down"
    sleep 0.15
  done
  pause "$LONG_PAUSE"

  log "=== Scene 2: Autocomplete ==="

  # Go to end of file to type new code
  press "ctrl+End"
  pause "$SHORT_PAUSE"
  press "Return"
  press "Return"

  # Type a new environment
  type_text "env2 = flyte.TaskEnvironment("
  pause "$MEDIUM_PAUSE"

  # Press Enter, type name=
  press "Return"
  type_text "    name="
  pause "$SHORT_PAUSE"
  type_text '"inference"'
  type_text ","
  press "Return"

  # Type "    " then trigger autocomplete
  type_text "    "
  pause "$SHORT_PAUSE"

  # Trigger autocomplete with Ctrl+Space
  press "ctrl+space"
  pause "$LONG_PAUSE"

  # Navigate autocomplete list
  press "Down"
  pause "$SHORT_PAUSE"
  press "Down"
  pause "$SHORT_PAUSE"
  press "Down"
  pause "$SHORT_PAUSE"

  # Dismiss autocomplete
  press "Escape"
  pause "$SHORT_PAUSE"

  # Type resources with gpu to show GPU suggestions
  type_text "resources=flyte.Resources("
  press "Return"
  type_text "        cpu=2, memory="
  type_text '"8Gi"'
  type_text ","
  press "Return"
  type_text "        gpu="

  pause "$SHORT_PAUSE"
  # Trigger autocomplete for GPU
  press "ctrl+space"
  pause "$LONG_PAUSE"

  # Show GPU options
  press "Down"
  pause "$SHORT_PAUSE"
  press "Down"
  pause "$SHORT_PAUSE"

  # Select an option
  press "Return"
  pause "$MEDIUM_PAUSE"

  log "=== Scene 3: Hover documentation ==="

  # Go back to the @env.task decorator at the top
  press "ctrl+Home"
  pause "$SHORT_PAUSE"

  # Go to the decorator line (search for it)
  press "ctrl+g"
  pause "$SHORT_PAUSE"
  # Try to go to a line with @env.task (around line 20-ish based on the example)
  type_text "20"
  press "Return"
  pause "$SHORT_PAUSE"

  # Move mouse over the @env.task text to trigger hover
  # We need to get VS Code window position first
  local wid
  wid=$(xdotool search --name "Visual Studio Code" | head -1)
  eval "$(get_win_geometry "$wid")"
  local wx="$X" wy="$Y"

  # Approximate position of code area (after gutter, ~300px from left, ~400px from top)
  local hover_x=$((wx + 350))
  local hover_y=$((wy + 420))

  move_to "$hover_x" "$hover_y"
  pause "$LONG_PAUSE"
  pause "$LONG_PAUSE"

  # Move mouse away to dismiss hover
  move_to "$hover_x" "$((hover_y - 100))"
  pause "$MEDIUM_PAUSE"

  log "=== Scene 4: CodeLens - Run Task ==="

  # Scroll up to find a task with CodeLens
  press "ctrl+Home"
  pause "$SHORT_PAUSE"

  # Search for fetch_dataset
  press "ctrl+g"
  pause "$SHORT_PAUSE"
  type_text "25"
  press "Return"
  pause "$MEDIUM_PAUSE"

  # The CodeLens "Run Task | Graph" should be visible above the function
  # Move mouse to approximately where "Run Task" would be
  local lens_x=$((wx + 300))
  local lens_y=$((wy + 380))
  move_to "$lens_x" "$lens_y"
  pause "$LONG_PAUSE"

  log "=== Scene 5: Sidebar ==="

  # Open the Flyte sidebar (it's bound to the Flyte activity bar icon)
  # Use command palette to open Flyte view
  press "ctrl+shift+p"
  pause "$SHORT_PAUSE"
  type_text "Flyte: Focus"
  pause "$MEDIUM_PAUSE"

  # If that doesn't work, try clicking the activity bar
  press "Escape"
  pause "$SHORT_PAUSE"

  # Click on the Flyte icon in the activity bar (leftmost column, ~3rd icon)
  local sidebar_x=$((wx + 24))
  local sidebar_y=$((wy + 180))
  move_to "$sidebar_x" "$sidebar_y"
  pause "$SHORT_PAUSE"
  xdotool click 1
  pause "$LONG_PAUSE"

  # Expand sections by clicking on them
  # Environments section (approximate position)
  local section_x=$((wx + 150))
  local section_y=$((wy + 150))
  move_to "$section_x" "$section_y"
  pause "$SHORT_PAUSE"
  xdotool click 1
  pause "$MEDIUM_PAUSE"

  # Tasks section
  section_y=$((wy + 250))
  move_to "$section_x" "$section_y"
  pause "$SHORT_PAUSE"
  xdotool click 1
  pause "$MEDIUM_PAUSE"

  # Clusters section
  section_y=$((wy + 400))
  move_to "$section_x" "$section_y"
  pause "$SHORT_PAUSE"
  xdotool click 1
  pause "$MEDIUM_PAUSE"

  # Runs section
  section_y=$((wy + 500))
  move_to "$section_x" "$section_y"
  pause "$SHORT_PAUSE"
  xdotool click 1
  pause "$LONG_PAUSE"

  log "=== Scene 6: Show snippets ==="

  # Go back to editor
  press "ctrl+1"
  pause "$SHORT_PAUSE"

  # Go to end of file
  press "ctrl+End"
  pause "$SHORT_PAUSE"
  press "Return"
  press "Return"

  # Type snippet prefix
  type_text "# Snippets demo"
  press "Return"
  type_text "ftask"
  pause "$SHORT_PAUSE"

  # Trigger snippet expansion
  press "ctrl+space"
  pause "$MEDIUM_PAUSE"
  press "Return"
  pause "$LONG_PAUSE"

  # Final pause
  pause "$LONG_PAUSE"

  log "=== Demo complete ==="
}

# ─── Post-production ─────────────────────────────────────────────────────

post_production() {
  log "Running post-production..."

  # Create a clean MP4 with good compression
  ffmpeg -y \
    -i "$RAW_VIDEO" \
    -c:v libx264 \
    -preset slow \
    -crf 22 \
    -pix_fmt yuv420p \
    -vf "scale=1920:-2" \
    "$FINAL_VIDEO"

  log "Final video: $FINAL_VIDEO"

  # Create GIF (scaled down, 15fps for smaller size)
  ffmpeg -y \
    -i "$RAW_VIDEO" \
    -vf "fps=15,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
    "$FINAL_GIF"

  log "GIF: $FINAL_GIF"
}

# ─── Main ────────────────────────────────────────────────────────────────

main() {
  log "Preparing demo environment..."

  # Close any existing VS Code instances for clean start
  # (just the window for this project, not all VS Code)

  # Open VS Code with the example project
  code "$EXAMPLE_DIR" --new-window &
  sleep 4

  focus_vscode

  # Maximize the window
  wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz
  sleep 1

  # Start recording
  start_recording

  # Small buffer before starting
  pause "$LONG_PAUSE"

  # Run the demo
  run_demo

  # Stop recording
  stop_recording

  # Post-production
  post_production

  log "Done! Files in $OUTPUT_DIR/"
}

main "$@"
