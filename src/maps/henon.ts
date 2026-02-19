import type { MapDefinition } from './types'

export const henon: MapDefinition = {
  name: 'Hénon',
  step: (x, y, p) => [p.a - x * x + p.b * y, x],
  defaultParams: { a: 1.4, b: -0.4 },
  bifurcationParam: 'a',
  bounds: { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 },
  bifurcationDefaults: {
    paramMin: 2.177,
    paramMax: 2.1815,
    dParam: 1e-5,
    N: 1000,
    ic: [0, 2],
    plotYMin: -0.5,
    plotYMax: 2,
  },
  iterationDefaults: { iterates: 1000, lag: 50, speed: 1 },
}
