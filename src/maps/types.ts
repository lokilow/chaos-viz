export interface MapDefinition {
  name: string
  /** The map: given state (x, y) and params, return [x', y'] */
  step: (
    x: number,
    y: number,
    params: Record<string, number>
  ) => [number, number]
  /** Default parameter values — keys become UI labels */
  defaultParams: Record<string, number>
  /** Which param is swept on the bifurcation x-axis */
  bifurcationParam: string
  /** Suggested plot bounds for the iteration view */
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number }
  /** Defaults for the bifurcation sweep */
  bifurcationDefaults: {
    paramMin: number
    paramMax: number
    dParam: number
    N: number
    ic: [number, number]
    /** y-axis bounds for bifurcation plot (state variable range) */
    plotYMin: number
    plotYMax: number
  }
  /** Defaults for the iteration animation */
  iterationDefaults: { iterates: number; lag: number; speed: number }
}
