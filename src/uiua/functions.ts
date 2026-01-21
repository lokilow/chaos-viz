// Uiua functions for chaos visualizations
// Each returns interleaved plot data: [x0, y0, x1, y1, ...]

import { run } from './wasm'

// Uiua source files
import identityCode from '../../uiua-modules/identity.ua?raw'

/** Identity function: y = x for x in [0, n) */
export function identity(n = 10): Float64Array {
  return run(identityCode)
}

/** Logistic map parabola: y = r*x*(1-x) for x in [0, 1] */
export function logisticParabola(r: number, numPoints = 100): Float64Array {
  // TODO: implement logistic.ua
  throw new Error('Not implemented')
}

/** Cobweb iteration path for logistic map */
export function cobweb(r: number, x0: number, iterations = 50): Float64Array {
  // TODO: implement cobweb.ua
  throw new Error('Not implemented')
}
