import p5 from 'p5'
import type { MapDefinition } from '../maps/types'

const W = 900
const H = 900
const MARGIN = { top: 60, right: 40, bottom: 60, left: 70 }

// ---- helpers ----

function niceStep(range: number): number {
  const rough = range / 8
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm = rough / mag
  if (norm < 1.5) return mag
  if (norm < 3.5) return 2 * mag
  if (norm < 7.5) return 5 * mag
  return 10 * mag
}

function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step) * step
}

// ============================================================
// Bifurcation
// ============================================================

export interface BifurcationOverrides {
  paramMin?: number
  paramMax?: number
  dParam?: number
  N?: number
  ic?: [number, number]
  plotYMin?: number
  plotYMax?: number
  params?: Record<string, number>
  plotX?: boolean
  plotY?: boolean
}

export interface BifurcationHandle {
  remove: () => void
  redraw: () => void
  update: (overrides: BifurcationOverrides) => void
  getPeriodDoublings: () => Map<number, number>
}

export function mountBifurcation(
  container: HTMLElement,
  mapDef: MapDefinition,
  overrides?: BifurcationOverrides
): BifurcationHandle {
  const d = mapDef.bifurcationDefaults
  let paramMin = overrides?.paramMin ?? d.paramMin
  let paramMax = overrides?.paramMax ?? d.paramMax
  let dParam = overrides?.dParam ?? d.dParam
  let N = overrides?.N ?? d.N
  let ic = overrides?.ic ?? ([...d.ic] as [number, number])
  let plotYMin = overrides?.plotYMin ?? d.plotYMin
  let plotYMax = overrides?.plotYMax ?? d.plotYMax
  let mapParams = overrides?.params ?? { ...mapDef.defaultParams }
  let plotX = overrides?.plotX ?? true
  let plotY = overrides?.plotY ?? false

  // computed data
  let points: { a: number; x: number; y: number }[] = []
  let periodDoublings: Map<number, number> = new Map()

  function compute() {
    points = []
    periodDoublings = new Map()
    const sweepParam = mapDef.bifurcationParam
    const S = 12
    const tol = 1e-5

    for (let a = paramMin; a <= paramMax; a += dParam) {
      const p = { ...mapParams, [sweepParam]: a }

      const xArr = new Float64Array(N + 1)
      const yArr = new Float64Array(N + 1)
      xArr[0] = ic[0]
      yArr[0] = ic[1]

      let diverged = false
      for (let i = 0; i < N; i++) {
        const [nx, ny] = mapDef.step(xArr[i], yArr[i], p)
        xArr[i + 1] = nx
        yArr[i + 1] = ny
        if (Math.abs(xArr[i + 1]) > 1e10) {
          diverged = true
          break
        }
      }
      if (diverged) continue

      let period = S
      let found = false
      for (let j = 0; j <= S; j++) {
        const per = 2 ** j
        if (per > N) break
        if (Math.abs(xArr[N] - xArr[N - per]) < tol && !found) {
          found = true
          period = j
        }
      }

      const detectedPeriod = 2 ** period
      if (found && !periodDoublings.has(detectedPeriod)) {
        periodDoublings.set(detectedPeriod, a)
      }

      const orbitLen = found ? detectedPeriod : Math.min(256, N)
      const start = N - orbitLen
      for (let k = start; k <= N; k++) {
        points.push({ a, x: xArr[k], y: yArr[k] })
      }
    }
  }

  compute()

  function mapPx(p: p5, a: number) {
    return p.map(a, paramMin, paramMax, MARGIN.left, W - MARGIN.right)
  }
  function mapPy(p: p5, val: number) {
    return p.map(val, plotYMin, plotYMax, H - MARGIN.bottom, MARGIN.top)
  }

  let instance: p5

  const sketch = (p: p5) => {
    p.setup = () => {
      p.createCanvas(W, H)
      p.background(255)
      p.noLoop()
    }

    p.draw = () => {
      p.background(255)

      // axes
      p.stroke(0)
      p.strokeWeight(1)
      p.line(
        MARGIN.left,
        H - MARGIN.bottom,
        W - MARGIN.right,
        H - MARGIN.bottom
      )
      p.line(MARGIN.left, MARGIN.top, MARGIN.left, H - MARGIN.bottom)

      p.textSize(12)
      p.fill(0)
      p.noStroke()

      p.textAlign(p.CENTER, p.TOP)
      const xStep = niceStep(paramMax - paramMin)
      for (
        let a = ceilTo(paramMin, xStep);
        a <= paramMax + 0.0001;
        a += xStep
      ) {
        const px = mapPx(p, a)
        p.stroke(0)
        p.line(px, H - MARGIN.bottom, px, H - MARGIN.bottom + 6)
        p.noStroke()
        p.text(a.toFixed(3), px, H - MARGIN.bottom + 10)
      }

      p.textAlign(p.RIGHT, p.CENTER)
      const yStep = niceStep(plotYMax - plotYMin)
      for (
        let v = ceilTo(plotYMin, yStep);
        v <= plotYMax + 0.0001;
        v += yStep
      ) {
        const py = mapPy(p, v)
        p.stroke(0)
        p.line(MARGIN.left - 6, py, MARGIN.left, py)
        p.noStroke()
        p.text(v.toFixed(1), MARGIN.left - 10, py)
      }

      // points
      p.strokeWeight(1)
      if (plotX) {
        p.stroke(0)
        for (const pt of points) {
          p.point(mapPx(p, pt.a), mapPy(p, pt.x))
        }
      }
      if (plotY) {
        p.stroke(40, 90, 220)
        for (const pt of points) {
          p.point(mapPx(p, pt.a), mapPy(p, pt.y))
        }
      }

      // labels
      p.noStroke()
      p.fill(0)
      p.textAlign(p.CENTER, p.TOP)
      p.textSize(18)
      p.textStyle(p.BOLD)
      p.text(mapDef.name + ' Bifurcation Diagram', W / 2, 15)
      p.textSize(13)
      p.textStyle(p.NORMAL)
      const paramStr = Object.entries(mapParams)
        .filter(([k]) => k !== mapDef.bifurcationParam)
        .map(([k, v]) => `${k} = ${v}`)
        .join(', ')
      p.text(`sweep: ${mapDef.bifurcationParam}   ${paramStr}`, W / 2, 38)
      p.textSize(14)
      p.text('parameter ' + mapDef.bifurcationParam, W / 2, H - 20)

      const varLabel = plotX && plotY ? 'x, y' : plotY ? 'y' : 'x'
      p.push()
      p.translate(18, H / 2)
      p.rotate(-p.HALF_PI)
      p.textAlign(p.CENTER, p.CENTER)
      p.textSize(14)
      p.text(varLabel, 0, 0)
      p.pop()
    }

    instance = p
  }

  new p5(sketch, container)

  return {
    remove() {
      instance.remove()
    },
    redraw() {
      instance.redraw()
    },
    update(ov) {
      if (ov.paramMin !== undefined) paramMin = ov.paramMin
      if (ov.paramMax !== undefined) paramMax = ov.paramMax
      if (ov.dParam !== undefined) dParam = ov.dParam
      if (ov.N !== undefined) N = ov.N
      if (ov.ic !== undefined) ic = [...ov.ic] as [number, number]
      if (ov.plotYMin !== undefined) plotYMin = ov.plotYMin
      if (ov.plotYMax !== undefined) plotYMax = ov.plotYMax
      if (ov.params !== undefined) mapParams = { ...ov.params }
      if (ov.plotX !== undefined) plotX = ov.plotX
      if (ov.plotY !== undefined) plotY = ov.plotY
      compute()
      instance.redraw()
    },
    getPeriodDoublings() {
      return periodDoublings
    },
  }
}

// ============================================================
// Iteration
// ============================================================

export interface IterationOverrides {
  iterates?: number
  lag?: number
  speed?: number
  params?: Record<string, number>
}

export interface CyclePoint {
  x: number
  y: number
}

export interface IterationState {
  x: number
  y: number
  step: number
  waiting: boolean
  icX: number
  icY: number
  detectedPeriod: number | null // null = not yet detected, 0 = chaotic/none
  cyclePoints: CyclePoint[]
}

export interface IterationHandle {
  remove: () => void
  reset: () => void
  update: (overrides: IterationOverrides) => void
  startAt: (x: number, y: number) => void
  getState: () => IterationState
  onStateChange: (fn: () => void) => void
}

export function mountIteration(
  container: HTMLElement,
  mapDef: MapDefinition,
  overrides?: IterationOverrides
): IterationHandle {
  const d = mapDef.iterationDefaults
  const bnd = mapDef.bounds
  let iterates = overrides?.iterates ?? d.iterates
  let lag = overrides?.lag ?? d.lag
  let speed = overrides?.speed ?? d.speed
  let mapParams = overrides?.params ?? { ...mapDef.defaultParams }

  let orbit: { x: number; y: number }[] = []
  let icX = 0
  let icY = 0
  let curX = 0
  let curY = 0
  let curStep = 0
  let waiting = true
  let diverged = false
  let stateCallback: (() => void) | null = null

  // period detection state
  let detectedPeriod: number | null = null
  let cyclePoints: CyclePoint[] = []

  // full history for period detection (stored after transient)
  let historyX: number[] = []
  let historyY: number[] = []
  const TRANSIENT = 500 // ignore first N iterates as transient
  const PERIOD_TOL = 1e-8
  const MAX_PERIOD_CHECK = 128

  function detectPeriod() {
    const len = historyX.length
    if (len < 2) return

    // check periods 1, 2, 3, ..., MAX_PERIOD_CHECK
    for (let p = 1; p <= Math.min(MAX_PERIOD_CHECK, Math.floor(len / 2)); p++) {
      let match = true
      // verify the last 2*p points repeat with period p
      const checks = Math.min(p * 2, len - p)
      for (let i = 0; i < checks; i++) {
        const idx = len - 1 - i
        const prevIdx = idx - p
        if (prevIdx < 0) {
          match = false
          break
        }
        if (
          Math.abs(historyX[idx] - historyX[prevIdx]) > PERIOD_TOL ||
          Math.abs(historyY[idx] - historyY[prevIdx]) > PERIOD_TOL
        ) {
          match = false
          break
        }
      }
      if (match) {
        detectedPeriod = p
        cyclePoints = []
        for (let i = 0; i < p; i++) {
          cyclePoints.push({
            x: historyX[len - p + i],
            y: historyY[len - p + i],
          })
        }
        return
      }
    }
    // no period found yet
    detectedPeriod = null
  }

  function beginOrbit(x: number, y: number) {
    icX = x
    icY = y
    curX = x
    curY = y
    orbit = [{ x, y }]
    historyX = []
    historyY = []
    detectedPeriod = null
    cyclePoints = []
    curStep = 0
    waiting = false
    diverged = false
    stateCallback?.()
    instance.loop()
  }

  function mapPx(p: p5, val: number) {
    return p.map(val, bnd.xMin, bnd.xMax, MARGIN.left, W - MARGIN.right)
  }
  function mapPy(p: p5, val: number) {
    return p.map(val, bnd.yMin, bnd.yMax, H - MARGIN.bottom, MARGIN.top)
  }

  let instance: p5

  const sketch = (p: p5) => {
    p.setup = () => {
      p.createCanvas(W, H)
      p.background(255)
      p.frameRate(30)
    }

    p.draw = () => {
      p.background(255)

      // axes
      p.stroke(0)
      p.strokeWeight(1)
      p.line(
        MARGIN.left,
        H - MARGIN.bottom,
        W - MARGIN.right,
        H - MARGIN.bottom
      )
      p.line(MARGIN.left, MARGIN.top, MARGIN.left, H - MARGIN.bottom)

      p.textSize(12)
      p.fill(0)
      p.noStroke()

      p.textAlign(p.CENTER, p.TOP)
      for (let v = Math.ceil(bnd.xMin); v <= bnd.xMax; v += 1) {
        const px = mapPx(p, v)
        p.stroke(0)
        p.line(px, H - MARGIN.bottom, px, H - MARGIN.bottom + 6)
        p.noStroke()
        p.text(v.toFixed(0), px, H - MARGIN.bottom + 10)
      }

      p.textAlign(p.RIGHT, p.CENTER)
      for (let v = Math.ceil(bnd.yMin); v <= bnd.yMax; v += 1) {
        const py = mapPy(p, v)
        p.stroke(0)
        p.line(MARGIN.left - 6, py, MARGIN.left, py)
        p.noStroke()
        p.text(v.toFixed(0), MARGIN.left - 10, py)
      }

      // title + param display
      p.noStroke()
      p.fill(0)
      p.textAlign(p.CENTER, p.TOP)
      p.textSize(18)
      p.textStyle(p.BOLD)
      p.text(mapDef.name + ' Iteration', W / 2, 15)
      p.textSize(13)
      p.textStyle(p.NORMAL)
      const paramStr = Object.entries(mapParams)
        .map(([k, v]) => `${k} = ${v}`)
        .join(', ')
      p.text(paramStr, W / 2, 38)

      p.textSize(14)
      p.text('x', W / 2, H - 20)
      p.push()
      p.translate(18, H / 2)
      p.rotate(-p.HALF_PI)
      p.textAlign(p.CENTER, p.CENTER)
      p.textSize(14)
      p.text('y', 0, 0)
      p.pop()

      if (waiting) {
        p.noStroke()
        p.fill(100)
        p.textAlign(p.CENTER, p.CENTER)
        p.textSize(16)
        p.text('Click on the plot to choose an initial condition', W / 2, H / 2)
        return
      }

      // iterate
      if (!diverged && curStep < iterates) {
        for (let i = 0; i < speed; i++) {
          if (curStep >= iterates || diverged) break
          const [nx, ny] = mapDef.step(curX, curY, mapParams)
          curX = nx
          curY = ny
          curStep++

          if (Math.abs(curX) > 1e10 || Math.abs(curY) > 1e10) {
            diverged = true
            break
          }

          orbit.push({ x: curX, y: curY })
          if (orbit.length > lag) {
            orbit.shift()
          }

          // record post-transient history for period detection
          if (curStep > TRANSIENT) {
            historyX.push(curX)
            historyY.push(curY)
          }
        }

        // try to detect period every frame
        if (detectedPeriod === null && historyX.length > MAX_PERIOD_CHECK * 3) {
          detectPeriod()
        }

        stateCallback?.()
      }

      // draw orbit tail
      if (orbit.length > 1) {
        p.stroke(220, 50, 50, 80)
        p.strokeWeight(1)
        for (let i = 1; i < orbit.length; i++) {
          p.line(
            mapPx(p, orbit[i - 1].x),
            mapPy(p, orbit[i - 1].y),
            mapPx(p, orbit[i].x),
            mapPy(p, orbit[i].y)
          )
        }
      }
      p.strokeWeight(4)
      p.stroke(220, 50, 50)
      for (const pt of orbit) {
        p.point(mapPx(p, pt.x), mapPy(p, pt.y))
      }

      // highlight cycle points if detected
      if (
        detectedPeriod !== null &&
        detectedPeriod > 0 &&
        cyclePoints.length > 0
      ) {
        // draw cycle connections
        p.stroke(50, 130, 220, 120)
        p.strokeWeight(1)
        for (let i = 0; i < cyclePoints.length; i++) {
          const next = cyclePoints[(i + 1) % cyclePoints.length]
          p.line(
            mapPx(p, cyclePoints[i].x),
            mapPy(p, cyclePoints[i].y),
            mapPx(p, next.x),
            mapPy(p, next.y)
          )
        }
        // draw cycle points as larger blue circles
        p.noFill()
        p.stroke(50, 130, 220)
        p.strokeWeight(2)
        for (const pt of cyclePoints) {
          p.circle(mapPx(p, pt.x), mapPy(p, pt.y), 10)
        }
      }

      if (diverged) {
        p.noStroke()
        p.fill(200, 50, 50)
        p.textAlign(p.CENTER, p.TOP)
        p.textSize(14)
        p.text('Orbit diverged!', W / 2, MARGIN.top + 10)
      } else if (curStep >= iterates) {
        // final period detection attempt
        if (detectedPeriod === null && historyX.length > 2) {
          detectPeriod()
          stateCallback?.()
        }
        p.noLoop()
      }
    }

    p.mousePressed = () => {
      if (
        p.mouseX >= MARGIN.left &&
        p.mouseX <= W - MARGIN.right &&
        p.mouseY >= MARGIN.top &&
        p.mouseY <= H - MARGIN.bottom
      ) {
        const x0 = p.map(
          p.mouseX,
          MARGIN.left,
          W - MARGIN.right,
          bnd.xMin,
          bnd.xMax
        )
        const y0 = p.map(
          p.mouseY,
          MARGIN.top,
          H - MARGIN.bottom,
          bnd.yMax,
          bnd.yMin
        )
        beginOrbit(x0, y0)
      }
    }

    instance = p
  }

  new p5(sketch, container)

  function doReset() {
    orbit = []
    historyX = []
    historyY = []
    detectedPeriod = null
    cyclePoints = []
    icX = 0
    icY = 0
    curX = 0
    curY = 0
    curStep = 0
    waiting = true
    diverged = false
    stateCallback?.()
    instance.loop()
  }

  return {
    remove() {
      instance.remove()
    },
    reset: doReset,
    startAt: beginOrbit,
    update(ov) {
      if (ov.iterates !== undefined) iterates = ov.iterates
      if (ov.lag !== undefined) lag = ov.lag
      if (ov.speed !== undefined) speed = ov.speed
      if (ov.params !== undefined) mapParams = { ...ov.params }
      doReset()
    },
    getState(): IterationState {
      return {
        x: curX,
        y: curY,
        step: curStep,
        waiting,
        icX,
        icY,
        detectedPeriod,
        cyclePoints: [...cyclePoints],
      }
    },
    onStateChange(fn: () => void) {
      stateCallback = fn
    },
  }
}
