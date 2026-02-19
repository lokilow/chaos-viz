# Cobweb diagram path for the logistic map
~ "prelude.ua" ~ ToPlotData

# Logistic: r x -> f(x) = r*x*(1-x)
Logistic ← ××(⤙⊙¬)

# Orbit: steps r x0 -> [x0, x1, ..., x_{steps-1}]
# Keep r as persistent loop state and collect x values each repeat.
Orbit ← |3 ⍥(⊸⟜Logistic)

# CobwebPath: steps r x0 -> interleaved [px0,py0, px1,py1, ...]
# Path visits: (x0,0) -> (x0,x1) -> (x1,x1) -> (x1,x2) -> ...
CobwebPath ← |3 (
  Orbit
  # left = all but last, right = all but first
  ⊃(↘¯1|↘1)
  ⊃( # Xs: [left0 left0 left1 left1 ... right_last]
    ⊂⊃(♭⍉˜⊟⊃(⊙◌|⊙◌)|⊣⋅∘)
  | # Ys: [0 right0 right0 right1 right1 ...]
    ⊂0♭⍉˜⊟⊃(⋅∘|⋅∘)
  )
  ToPlotData ⊟
)
