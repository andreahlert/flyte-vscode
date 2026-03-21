#!/usr/bin/env bash
#
# Post-production: Apply smooth zoom effects to the raw recording.
#
# This takes the raw demo video and creates a version with cinematic
# zoom-ins at key moments, similar to Screen Studio.
#
# Usage: ./zoom-edit.sh [input.mkv] [output.mp4]
#
set -euo pipefail

INPUT="${1:-output/raw-demo.mkv}"
OUTPUT="${2:-output/demo-zoomed.mp4}"
GIF_OUTPUT="${OUTPUT%.mp4}.gif"

if [ ! -f "$INPUT" ]; then
  echo "Input file not found: $INPUT"
  echo "Run ./record.sh first to capture the raw video."
  exit 1
fi

# Get video dimensions and duration
eval "$(ffprobe -v quiet -show_entries stream=width,height,duration -of default=noprint_wrappers=1 "$INPUT" | head -3)"
W="${width:-1920}"
H="${height:-1080}"
DUR="${duration:-60}"

echo "Input: ${W}x${H}, ${DUR}s"

# ─── Zoom keyframes ─────────────────────────────────────────────────────
#
# Each zoom is defined by:
#   start_time, end_time, zoom_level, focus_x (0-1), focus_y (0-1)
#
# focus_x/y = 0.5,0.5 means center. 0.3,0.4 means 30% from left, 40% from top.
#
# Edit these to match your recording timing!
# After running record.sh, watch raw-demo.mkv and note the timestamps.

cat > /tmp/zoom_keyframes.txt << 'KEYFRAMES'
# format: start,end,zoom,focus_x,focus_y,label
# Scene 2: Autocomplete popup
8,14,1.8,0.45,0.55,autocomplete
# Scene 2: GPU suggestions
18,24,2.0,0.5,0.6,gpu-suggestions
# Scene 3: Hover documentation
28,34,1.6,0.4,0.5,hover-docs
# Scene 5: Sidebar sections
42,50,1.5,0.15,0.4,sidebar
KEYFRAMES

echo "Applying zoom effects..."

# Build a complex ffmpeg filter that interpolates between zoom levels.
# We use the zoompan filter for smooth transitions.
#
# Strategy: overlay multiple zoompan segments using trim+concat.
# For simplicity, we'll use a single-pass approach with expressions.

# Generate the zoompan expression
# zoompan works per-frame: zoom and xy are expressions evaluated each frame
# We'll create smooth zoom transitions using if/between logic

FPS=30

# For now, a simpler approach: cut segments, apply zoom, concat
FILTER=""
SEGMENTS=()
SEG_IDX=0
PREV_END=0

while IFS=, read -r start end zoom fx fy label; do
  # Skip comments and empty lines
  [[ "$start" =~ ^#.*$ ]] && continue
  [[ -z "$start" ]] && continue

  # Trim whitespace
  start=$(echo "$start" | tr -d ' ')
  end=$(echo "$end" | tr -d ' ')
  zoom=$(echo "$zoom" | tr -d ' ')
  fx=$(echo "$fx" | tr -d ' ')
  fy=$(echo "$fy" | tr -d ' ')

  # Segment before the zoom (1x)
  if (( $(echo "$PREV_END < $start" | bc -l) )); then
    SEGMENTS+=("[$SEG_IDX:v]")
    FILTER+="[0:v]trim=start=$PREV_END:end=$start,setpts=PTS-STARTPTS[seg${SEG_IDX}]; "
    SEG_IDX=$((SEG_IDX + 1))
  fi

  # Calculate crop dimensions for the zoom
  # zoom=1.8 means we show 1/1.8 of the frame
  CW=$(echo "scale=0; $W / $zoom" | bc)
  CH=$(echo "scale=0; $H / $zoom" | bc)
  # Ensure even
  CW=$(( CW / 2 * 2 ))
  CH=$(( CH / 2 * 2 ))
  # Position based on focus point
  CX=$(echo "scale=0; ($W - $CW) * $fx" | bc)
  CY=$(echo "scale=0; ($H - $CH) * $fy" | bc)

  # Zoom segment: trim, crop, scale back to original size
  SEGMENTS+=("[$SEG_IDX:v]")
  FILTER+="[0:v]trim=start=$start:end=$end,setpts=PTS-STARTPTS,"
  FILTER+="crop=${CW}:${CH}:${CX}:${CY},"
  FILTER+="scale=${W}:${H}:flags=lanczos[seg${SEG_IDX}]; "
  SEG_IDX=$((SEG_IDX + 1))

  PREV_END="$end"

done < /tmp/zoom_keyframes.txt

# Final segment after last zoom
FILTER+="[0:v]trim=start=$PREV_END,setpts=PTS-STARTPTS[seg${SEG_IDX}]; "
SEGMENTS+=("[$SEG_IDX:v]")
SEG_IDX=$((SEG_IDX + 1))

# Build concat
CONCAT=""
for (( i=0; i<SEG_IDX; i++ )); do
  CONCAT+="[seg${i}]"
done
CONCAT+="concat=n=${SEG_IDX}:v=1:a=0[out]"

FILTER+="$CONCAT"

echo "Filter chain with $SEG_IDX segments"

ffmpeg -y \
  -i "$INPUT" \
  -filter_complex "$FILTER" \
  -map "[out]" \
  -c:v libx264 \
  -preset slow \
  -crf 20 \
  -pix_fmt yuv420p \
  "$OUTPUT"

echo "Zoomed video: $OUTPUT"

# Create GIF
echo "Creating GIF..."
ffmpeg -y \
  -i "$OUTPUT" \
  -vf "fps=15,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
  "$GIF_OUTPUT"

echo "GIF: $GIF_OUTPUT"
echo "Done!"
