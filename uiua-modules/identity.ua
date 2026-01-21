# Identity function for plotting y = x
# Returns interleaved pairs: [x0, y0, x1, y1, ...]
# Note: ToPlotData is prepended by wasm.ts from plot.ua

Identity ← ˙⊟ ⇡

ToPlotData Identity 10
