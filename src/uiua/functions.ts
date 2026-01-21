// Uiua functions for chaos visualizations
// Each returns interleaved plot data: [x0, y0, x1, y1, ...]

import { run } from './wasm'

// Uiua source files
import identityCode from '../../uiua-modules/identity.ua?raw'
import logisticCode from '../../uiua-modules/logistic.ua?raw'

/** Format number for Uiua (uses ¯ for negative) */
function uiuaNum(n: number): string {
  return n < 0 ? `¯${Math.abs(n)}` : String(n)
}

/** Identity function: y = x for given bounds */
export function identity(
  min: number,
  max: number,
  numPoints = 101
): Float64Array {
  // Append call with params after function definitions
  return run(
    `${identityCode}\nToPlotData Identity ${numPoints} ${uiuaNum(max)} ${uiuaNum(min)}`
  )
}

/** Logistic map parabola: y = r*x*(1-x) for x in [0, 1] */
export function logisticParabola(r: number): Float64Array {
  return run(`${logisticCode}\nLogisticCurve ${r}`)
}

/** Cobweb iteration path for logistic map */
export function cobweb(r: number, x0: number, iterations = 50): Float64Array {
  // TODO: implement cobweb.ua
  throw new Error('Not implemented')
}
