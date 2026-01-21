~ "prelude.ua" ~ ToPlotData
# Identity function y = x
# Stack: n max min → interleaved [x0, y0, x1, y1, ...]

# Linspace: n max min → [min, ..., max] with n evenly spaced points
Linspace ← (
  ⊃(÷⊃(-1|⇡)|⋅(-:)|⋅⋅∘) # [0..1], range, min
  :⊙:                   # min, range, [0..1]
  ⊙×                    # min, scaled
  +                     # result
)

Identity ← ˙⊟ Linspace

# ToPlotData Identity 13 1.1 ¯0.1
