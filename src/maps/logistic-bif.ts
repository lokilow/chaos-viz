import type { MapDefinition } from './types'

export const logisticBif: MapDefinition = {
  name: 'Logistic',
  step: (x, _y, p) => [p.a * x * (1 - x), 0],
  defaultParams: {},
  bifurcationParam: 'a',
  bounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
  bifurcationDefaults: {
    paramMin: 2,
    paramMax: 4,
    dParam: 0.001,
    N: 1000,
    ic: [0.5, 0],
    plotYMin: 0,
    plotYMax: 1,
  },
  iterationDefaults: { iterates: 1000, lag: 50, speed: 1 },
  randomIC: true,
  lyapunovDerivative: (x, p) => p.a * (1 - 2 * x),
}
