import { createSignal, createEffect, onMount, onCleanup, Show } from 'solid-js'
import CanvasPlot, { type Plot, type Bounds } from './CanvasPlot'
import Latex from './Latex'
import {
  compileExpr,
  cobwebPath,
  sampleCurve,
  invertNumerically,
} from '../utils/cobweb'

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const PANEL_ASPECT = 1.05 // height / width
const ITERATIONS = 50
const G_BOUNDS: Bounds = { xMin: -0.05, xMax: 1.05, yMin: -0.05, yMax: 1.05 }
const g_BOUNDS: Bounds = { xMin: -2.3, xMax: 2.3, yMin: -2.3, yMax: 2.3 }
const C_BOUNDS: Bounds = { xMin: -0.05, xMax: 1.05, yMin: -2.3, yMax: 2.3 }

// ---------------------------------------------------------------------------
// Reusable expression input with draft/commit and error display
// ---------------------------------------------------------------------------

function ExprInput(props: {
  label: string
  value: () => string
  error: () => string | null
  onCommit: (s: string) => void
  placeholder?: string
  width?: string
}) {
  const [draft, setDraft] = createSignal(props.value())
  // Keep draft in sync if parent resets the value externally
  createEffect(() => setDraft(props.value()))

  let inputRef: HTMLInputElement | undefined
  const commit = () => props.onCommit(draft())
  const revert = () => {
    setDraft(props.value())
    inputRef?.blur()
  }

  return (
    <div class="flex flex-col gap-0.5">
      <label class="text-xs font-mono text-silver-600">{props.label} =</label>
      <input
        ref={inputRef}
        type="text"
        value={draft()}
        onInput={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
            inputRef?.blur()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            revert()
          }
        }}
        spellcheck={false}
        placeholder={props.placeholder ?? 'JS expression…'}
        class={`${props.width ?? 'w-36'} rounded border border-silver-300 bg-white px-1.5 py-0.5 text-xs font-mono text-silver-800`}
      />
      <Show when={props.error()}>
        <p class="text-xs text-red-600 font-mono w-36 break-words leading-tight">
          {props.error()}
        </p>
      </Show>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cobweb panel — draws identity line, curve, and cobweb path
// ---------------------------------------------------------------------------

function CobwebPanel(props: {
  title: string
  compiledFn: () => ((x: number) => number) | null
  x0: () => number | null
  bounds: Bounds
  width: number
  height: number
  cobwebColor: string
  axisLabel: string
  onX0Change: (v: number) => void
}) {
  const drawPlot = (ctx: CanvasRenderingContext2D, plot: Plot) => {
    const { xMin, xMax } = props.bounds

    // Identity line y=x
    ctx.strokeStyle = '#78716c'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(plot.toX(xMin), plot.toY(xMin))
    ctx.lineTo(plot.toX(xMax), plot.toY(xMax))
    ctx.stroke()
    ctx.setLineDash([])

    const fn = props.compiledFn()
    if (!fn) return

    // Curve
    const pts = sampleCurve(fn, xMin, xMax)
    ctx.strokeStyle = '#15803d'
    ctx.lineWidth = 2
    ctx.beginPath()
    let newSeg = true
    for (let i = 0; i < pts.length; i += 2) {
      const px = plot.toX(pts[i])
      const py = plot.toY(pts[i + 1])
      if (!isFinite(px) || !isFinite(py)) {
        newSeg = true
        continue
      }
      if (newSeg) {
        ctx.moveTo(px, py)
        newSeg = false
      } else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Cobweb
    const currentX0 = props.x0()
    if (currentX0 === null || !isFinite(currentX0)) return

    const path = cobwebPath(fn, currentX0, ITERATIONS)
    ctx.strokeStyle = props.cobwebColor
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < path.length; i += 2) {
      const px = plot.toX(path[i])
      const py = plot.toY(path[i + 1])
      if (!isFinite(px) || !isFinite(py)) break
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // x0 dot on x-axis
    const { yMin, yMax } = props.bounds
    if (yMin <= 0 && yMax >= 0) {
      ctx.fillStyle = props.cobwebColor
      ctx.beginPath()
      ctx.arc(plot.toX(currentX0), plot.toY(0), 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return (
    <div class="bg-silver-100 border border-silver-300 rounded-lg p-2 shadow-sm flex flex-col gap-1">
      <div class="text-sm font-semibold text-silver-800">{props.title}</div>
      <CanvasPlot
        width={props.width}
        height={props.height}
        bounds={props.bounds}
        background="#f5f5f4"
        axes={true}
        axisLabels={{ x: props.axisLabel, y: `${props.axisLabel}'` }}
        grid={{ x: 0.5, y: 0.5 }}
        run={drawPlot}
        onClick={(mathX) => props.onX0Change(mathX)}
        class="border border-silver-300 rounded bg-white"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Translator panel — draws C(x) curve with crosshair at (x0G, C(x0G))
// ---------------------------------------------------------------------------

function TranslatorPanel(props: {
  compiledC: () => ((x: number) => number) | null
  x0G: () => number
  width: number
  height: number
  onX0GChange: (v: number) => void
}) {
  const drawPlot = (ctx: CanvasRenderingContext2D, plot: Plot) => {
    const fn = props.compiledC()

    if (fn) {
      // C(x) curve
      const pts = sampleCurve(fn, C_BOUNDS.xMin, C_BOUNDS.xMax)
      ctx.strokeStyle = '#15803d'
      ctx.lineWidth = 2
      ctx.beginPath()
      let newSeg = true
      for (let i = 0; i < pts.length; i += 2) {
        const px = plot.toX(pts[i])
        const py = plot.toY(pts[i + 1])
        if (!isFinite(px) || !isFinite(py)) {
          newSeg = true
          continue
        }
        if (newSeg) {
          ctx.moveTo(px, py)
          newSeg = false
        } else ctx.lineTo(px, py)
      }
      ctx.stroke()

      // Crosshair at (x0G, C(x0G))
      const x = props.x0G()
      const y = fn(x)
      if (isFinite(y)) {
        const px = plot.toX(x)
        const py = plot.toY(y)

        // Dashed crosshair lines
        ctx.strokeStyle = '#a8a29e'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(px, plot.toY(C_BOUNDS.yMin))
        ctx.lineTo(px, py)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(plot.toX(C_BOUNDS.xMin), py)
        ctx.lineTo(px, py)
        ctx.stroke()
        ctx.setLineDash([])

        // Dot at (x0G, C(x0G))
        ctx.fillStyle = '#7c3aed'
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  return (
    <div class="bg-silver-100 border border-silver-300 rounded-lg p-2 shadow-sm flex flex-col gap-1">
      <div class="text-sm font-semibold text-silver-800">Conjugacy C</div>
      <CanvasPlot
        width={props.width}
        height={props.height}
        bounds={C_BOUNDS}
        background="#f5f5f4"
        axes={true}
        axisLabels={{ x: 'x', y: 'C(x)' }}
        grid={{ x: 0.25, y: 0.5 }}
        run={drawPlot}
        onClick={(mathX) =>
          props.onX0GChange(
            Math.max(C_BOUNDS.xMin, Math.min(C_BOUNDS.xMax, mathX))
          )
        }
        class="border border-silver-300 rounded bg-white"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers: manage one expression signal triple
// ---------------------------------------------------------------------------

function useExpr(initial: string) {
  const [expr, setExpr] = createSignal(initial)
  const [compiledFn, setCompiledFn] = createSignal<
    ((x: number) => number) | null
  >(null)
  const [error, setError] = createSignal<string | null>(null)

  createEffect(() => {
    const result = compileExpr(expr())
    if (result instanceof Error) {
      setCompiledFn(null)
      setError(result.message)
    } else {
      setCompiledFn(() => result)
      setError(null)
    }
  })

  const commit = (s: string) => setExpr(s)

  return { expr, compiledFn, error, commit }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ConjugacyView() {
  // Expression state for each function
  const G = useExpr('4*x*(1-x)')
  const g = useExpr('2 - x*x')
  const C = useExpr('')
  const CInv = useExpr('')

  // Shared x0 — lives in G's coordinate space
  const [x0G, setX0G] = createSignal(0.2)
  const [autoInvert, setAutoInvert] = createSignal(true)

  // Derived x0 for g: apply C to x0G
  const x0g = (): number | null => {
    const fn = C.compiledFn()
    if (!fn) return null
    const v = fn(x0G())
    return isFinite(v) ? v : null
  }

  // Clicking g's panel: invert C to find x0G
  const handleGClick = (mathX: number) => {
    const clamped = Math.max(G_BOUNDS.xMin, Math.min(G_BOUNDS.xMax, mathX))
    setX0G(clamped)
  }

  const handleGSmallClick = (mathX: number) => {
    const cfn = C.compiledFn()
    if (!cfn) return
    if (autoInvert()) {
      const inv = invertNumerically(cfn, mathX, G_BOUNDS.xMin, G_BOUNDS.xMax)
      if (inv !== null) setX0G(inv)
    } else {
      const invFn = CInv.compiledFn()
      if (!invFn) return
      const v = invFn(mathX)
      if (isFinite(v))
        setX0G(Math.max(G_BOUNDS.xMin, Math.min(G_BOUNDS.xMax, v)))
    }
  }

  // Responsive panel sizing via ResizeObserver on container
  const [panelSize, setPanelSize] = createSignal(300)
  let containerRef: HTMLDivElement | undefined
  let ro: ResizeObserver | undefined

  onMount(() => {
    ro = new ResizeObserver(() => {
      if (!containerRef) return
      const totalW = containerRef.getBoundingClientRect().width
      if (totalW <= 0) return
      // lg breakpoint = 1024px: three columns with 2×gap(16px)
      const isThreeCol = totalW >= 640
      const panelW = isThreeCol
        ? Math.floor((totalW - 32) / 3)
        : Math.min(Math.floor(totalW), 500)
      setPanelSize(Math.max(200, Math.min(420, panelW)))
    })
    if (containerRef) ro.observe(containerRef)
    onCleanup(() => ro?.disconnect())
    queueMicrotask(() => {
      if (!containerRef) return
      const totalW = containerRef.getBoundingClientRect().width
      if (totalW <= 0) return
      const isThreeCol = totalW >= 640
      const panelW = isThreeCol
        ? Math.floor((totalW - 32) / 3)
        : Math.min(Math.floor(totalW), 500)
      setPanelSize(Math.max(200, Math.min(420, panelW)))
    })
  })

  const panelH = () => Math.round(panelSize() * PANEL_ASPECT)

  const formatVal = (v: number | null) =>
    v === null
      ? '—'
      : (Math.round(v * 1e5) / 1e5).toFixed(5).replace(/\.?0+$/, '')

  return (
    <div class="p-4 md:p-5 bg-silver-50 rounded-lg shadow space-y-4">
      <h2 class="text-lg font-semibold text-silver-900">Conjugacy</h2>

      {/* Equation display */}
      <div class="text-sm text-silver-600 leading-relaxed">
        <Latex math="C \circ G = g \circ C" /> — drag <Latex math="x_0" /> in
        either cobweb; the other updates via C.
      </div>

      {/* Controls row */}
      <div
        data-export-ignore="true"
        class="flex flex-wrap gap-x-6 gap-y-3 items-start p-3 rounded-lg border border-silver-300 bg-silver-100"
      >
        <ExprInput
          label="G(x)"
          value={G.expr}
          error={G.error}
          onCommit={G.commit}
          placeholder="4*x*(1-x)"
        />
        <ExprInput
          label="C(x)"
          value={C.expr}
          error={C.error}
          onCommit={C.commit}
          placeholder="derive and enter…"
        />
        <ExprInput
          label="g(x)"
          value={g.expr}
          error={g.error}
          onCommit={g.commit}
          placeholder="2 - x*x"
        />

        {/* Auto-invert toggle + optional C⁻¹ field */}
        <div class="flex flex-col gap-1.5">
          <label class="flex items-center gap-2 text-xs text-silver-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoInvert()}
              onChange={(e) => setAutoInvert(e.currentTarget.checked)}
              class="accent-grass-700"
            />
            auto C⁻¹
          </label>
          <Show when={!autoInvert()}>
            <ExprInput
              label="C⁻¹(x)"
              value={CInv.expr}
              error={CInv.error}
              onCommit={CInv.commit}
              placeholder="(2 - x) / 4"
            />
          </Show>
        </div>

        {/* Live x0 readout */}
        <div class="text-xs font-mono text-silver-600 self-center space-y-0.5">
          <div>
            <Latex math="x_0" /> in G: {formatVal(x0G())}
          </div>
          <div>
            C(
            <Latex math="x_0" />
            ): {formatVal(x0g())}
          </div>
          <Show when={!autoInvert() && C.compiledFn() !== null}>
            <div class="text-amber-600">using explicit C⁻¹</div>
          </Show>
          <Show when={autoInvert() && C.compiledFn() !== null}>
            <div class="text-silver-400">using bisection for C⁻¹</div>
          </Show>
        </div>
      </div>

      {/* Three-panel grid */}
      <div ref={containerRef} class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CobwebPanel
          title="G(x) = 4x(1−x)"
          compiledFn={G.compiledFn}
          x0={() => x0G()}
          bounds={G_BOUNDS}
          width={panelSize()}
          height={panelH()}
          cobwebColor="#2563eb"
          axisLabel="x"
          onX0Change={handleGClick}
        />
        <TranslatorPanel
          compiledC={C.compiledFn}
          x0G={x0G}
          width={panelSize()}
          height={panelH()}
          onX0GChange={(v) =>
            setX0G(Math.max(G_BOUNDS.xMin, Math.min(G_BOUNDS.xMax, v)))
          }
        />
        <CobwebPanel
          title="g(x) = 2 − x²"
          compiledFn={g.compiledFn}
          x0={x0g}
          bounds={g_BOUNDS}
          width={panelSize()}
          height={panelH()}
          cobwebColor="#dc2626"
          axisLabel="y"
          onX0Change={handleGSmallClick}
        />
      </div>

      {/* About */}
      <details class="rounded border border-silver-300 bg-silver-100 p-3 text-sm text-silver-700">
        <summary class="cursor-pointer font-medium text-silver-800 select-none">
          About conjugacy
        </summary>
        <div class="mt-2 leading-relaxed space-y-2">
          <p>
            Two maps are <strong>topologically conjugate</strong> if there is a
            homeomorphism C such that <Latex math="C \circ G = g \circ C" />.
            This means every orbit of G corresponds to an orbit of g under the
            coordinate change C.
          </p>
          <p>
            Enter C(x) above to see the translation in action. Dragging{' '}
            <Latex math="x_0" /> in the G panel updates the g panel via{' '}
            <Latex math="g\text{-side } x_0 = C(x_0)" />. Clicking the g panel
            inverts C (numerically or via your explicit C⁻¹) to recover the
            G-side <Latex math="x_0" />.
          </p>
          <p>
            The middle panel shows the curve <Latex math="y = C(x)" /> with a
            dot at <Latex math="(x_0, C(x_0))" /> — its y-coordinate is exactly
            the initial condition for g.
          </p>
        </div>
      </details>
    </div>
  )
}
