# Logistic Function
~ "prelude.ua" ~ Domain ToPlotData

# Logistic: r x -> y
# Computes the logistic map f(x) = r*x*(1-x)
Logistic ← ××(⤙⊙¬)

# LogisticCurve: r -> [x0, y0, x1, y1, ...]
# Returns 101 points (0 to 1) as interleaved plot data
LogisticCurve ← |1 (
  Xs ← Domain 100 ¯0.1 1.1
  Ys ← ˜Logistic Xs
  ToPlotData ⊟ Xs Ys
)
