# Identity function for plotting y = x
# Returns interleaved pairs: [x0, y0, x1, y1, ...]

Identity ← ˙⊟ ⇡
ToPlotData ← ♭ ⍉

ToPlotData Identity 10
