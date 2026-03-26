/**
 * Julia Set via the Inverse Iteration Method (IIM)
 *
 * For f(z) = z² + c, the inverse map is z → ±√(z − c).
 * Iterating the inverse map backward while randomly selecting branches
 * produces a random walk that densely covers the Julia set boundary.
 *
 * Based on: Lynch, "Dynamical Systems with Applications using MATLAB", 2004
 */

/** Unstable fixed point z* = 0.5 + √(0.25 − c), used as starting value */
function fixedPoint(a: number, b: number): [number, number] {
  // 0.25 − c = (0.25 − a) − bi
  const rx = 0.25 - a
  const ry = -b
  const r = Math.sqrt(rx * rx + ry * ry)
  const sx = Math.sqrt((r + rx) / 2)
  const sy = (ry >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, (r - rx) / 2))
  return [0.5 + sx, sy]
}

/**
 * Generate Julia set scatter points via IIM.
 *
 * @param a   Real part of c
 * @param b   Imaginary part of c
 * @param niter  Number of iterations (points to generate)
 * @returns Float64Array of interleaved [x0, y0, x1, y1, …] coordinates
 */
export function juliaIIM(a: number, b: number, niter = 100_000): Float64Array {
  const [x0, y0] = fixedPoint(a, b)
  let x = x0
  let y = y0

  const pts = new Float64Array(niter * 2)

  for (let n = 0; n < niter; n++) {
    const dx = x - a
    const dy = y - b
    const r = Math.sqrt(dx * dx + dy * dy)

    // sqrt(z − c): correct branch by sign of Im(z − c)
    let nx = Math.sqrt((r + dx) / 2)
    let ny = (dy >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, (r - dx) / 2))

    // Randomly pick the other branch (negate both) with p = 0.5
    if (Math.random() < 0.5) {
      nx = -nx
      ny = -ny
    }

    x = nx
    y = ny
    pts[n * 2] = x
    pts[n * 2 + 1] = y
  }

  return pts
}

/** Preset c values for interesting Julia sets */
export const JULIA_PRESETS = [
  { label: 'Basilica', a: 0, b: -1 },
  { label: 'Rabbit', a: -0.123, b: 0.745 },
  { label: 'Airplane', a: -0.7269, b: 0.1889 },
  { label: 'San Marco', a: -0.75, b: 0.1 },
  { label: 'Dendrite', a: 0, b: 1 },
  { label: 'Lynch c', a: 0, b: 0.9 },
] as const
