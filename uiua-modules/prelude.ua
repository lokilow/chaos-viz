# Uiua Prelude - automatically prepended to all Uiua code in wasm
# Add shared utilities here that should be available everywhere

# Convert 2×N matrix [[x...], [y...]] to interleaved [x0, y0, x1, y1, ...]
ToPlotData ← ♭ ⍉

# Creates a list of length NUMPOINTS + 1 starting at XMIN ending at XMAX
# ex. Domain NUMPOINTS XMIN XMAX
Domain ← +×⊃(÷⊙-|⇡+1|⋅∘)
⍤⤙≍[10 15 20] Domain 2 10 20
