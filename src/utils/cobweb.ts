/**
 * Shared pure-math helpers for cobweb diagrams and conjugacy views.
 * No SolidJS, no canvas — just number arrays.
 */

/**
 * Compile a JS expression string into a callable function.
 * Accepts standard JS math: "2 - x*x", "Math.sin(x)", "4*x*(1-x)"
 * Returns the function on success, or an Error describing the problem.
 */
export function compileExpr(expr: string): ((x: number) => number) | Error {
  if (!expr.trim()) return new Error('empty expression')
  try {
    const fn = new Function('x', `"use strict"; return (${expr});`) as (
      x: number
    ) => number
    fn(0) // test call — catches runtime errors eagerly
    return fn
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e))
  }
}

/**
 * Generate the cobweb path as a flat [x0,y0, x1,y1, ...] array.
 * Starting at (x0, 0), then for each step:
 *   vertical:   (x, prev_y) → (x, f(x))
 *   horizontal: (x, f(x))  → (f(x), f(x))
 */
export function cobwebPath(
  f: (x: number) => number,
  x0: number,
  n: number
): number[] {
  const pts: number[] = [x0, 0]
  let x = x0
  for (let i = 0; i < n; i++) {
    const y = f(x)
    pts.push(x, y) // vertical: up to curve
    pts.push(y, y) // horizontal: over to diagonal
    x = y
    if (!isFinite(x)) break // orbit escaped
  }
  return pts
}

/**
 * Sample the curve f(x) over [xMin, xMax] as a flat [x0,y0, x1,y1, ...] array.
 */
export function sampleCurve(
  f: (x: number) => number,
  xMin: number,
  xMax: number,
  n = 200
): number[] {
  const pts: number[] = []
  for (let i = 0; i <= n; i++) {
    const x = xMin + (i / n) * (xMax - xMin)
    const y = f(x)
    pts.push(x, y)
  }
  return pts
}

/**
 * Numerically invert a monotone function C on [xMin, xMax] via bisection.
 * Returns null if y is outside C's range on that interval, or if C is
 * non-monotone (bisection sign check fails).
 */
export function invertNumerically(
  C: (x: number) => number,
  y: number,
  xMin: number,
  xMax: number,
  tol = 1e-10
): number | null {
  const flo = C(xMin) - y
  const fhi = C(xMax) - y
  if (flo * fhi > 0) return null // y outside range or non-monotone
  let lo = xMin
  let hi = xMax
  for (let i = 0; i < 64; i++) {
    if (hi - lo < tol) break
    const mid = (lo + hi) / 2
    if (C(mid) - y < 0 === flo < 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
