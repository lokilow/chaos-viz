# Uiua Prelude - automatically prepended to all Uiua code in wasm
# Add shared utilities here that should be available everywhere

# Convert 2×N matrix [[x...], [y...]] to interleaved [x0, y0, x1, y1, ...]
ToPlotData ← ♭ ⍉
