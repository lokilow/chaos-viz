import { createSignal, createEffect, onMount, onCleanup, Show } from 'solid-js'
import CanvasPlot, { type Plot } from './CanvasPlot'
import CanvasExportButton from './CanvasExportButton'
import Latex from './Latex'
import { compileExpr, cobwebPath, sampleCurve } from '../utils/cobweb'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type CobwebMapProps = {
  title: string
  defaultExpr: string
  defaultX0: number
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number }
  gridStep?: number
  iterations?: number
}

export default function CobwebMap(props: CobwebMapProps) {
  const bounds = props.bounds
  const iterations = props.iterations ?? 50
  const gridStep = props.gridStep ?? 1

  // Expression state: draft (in-progress edit) vs committed (compiled)
  const [expr, setExpr] = createSignal(props.defaultExpr)
  const [exprDraft, setExprDraft] = createSignal(props.defaultExpr)
  const [compiledFn, setCompiledFn] = createSignal<
    ((x: number) => number) | null
  >(null)
  const [exprError, setExprError] = createSignal<string | null>(null)

  const [x0, setX0] = createSignal(props.defaultX0)
  const [plotWidth, setPlotWidth] = createSignal(600)
  const [plotHeight, setPlotHeight] = createSignal(460)

  let exportCardRef: HTMLDivElement | undefined
  let plotHostRef: HTMLDivElement | undefined
  let plotResizeObserver: ResizeObserver | undefined

  // Recompile whenever expr changes
  createEffect(() => {
    const result = compileExpr(expr())
    if (result instanceof Error) {
      setCompiledFn(null)
      setExprError(result.message)
    } else {
      // Wrap in arrow fn: SolidJS treats a bare function as a functional updater
      setCompiledFn(() => result)
      setExprError(null)
    }
  })

  const updatePlotSize = () => {
    const host = plotHostRef
    if (!host) return
    const width = Math.floor(host.getBoundingClientRect().width)
    if (width <= 0) return
    const nextWidth = Math.max(280, Math.min(980, width))
    const ratio =
      nextWidth >= 900
        ? 0.6
        : nextWidth >= 700
          ? 0.64
          : nextWidth >= 480
            ? 0.7
            : 0.78
    setPlotWidth(nextWidth)
    setPlotHeight(Math.max(230, Math.min(620, Math.round(nextWidth * ratio))))
  }

  onMount(() => {
    plotResizeObserver = new ResizeObserver(() => updatePlotSize())
    if (plotHostRef) plotResizeObserver.observe(plotHostRef)
    onCleanup(() => plotResizeObserver?.disconnect())
    queueMicrotask(updatePlotSize)
  })

  // ---------------------------------------------------------------------------
  // Draw function — signal reads here are tracked inside CanvasPlot's createEffect
  // ---------------------------------------------------------------------------

  const drawPlot = (ctx: CanvasRenderingContext2D, plot: Plot) => {
    // 1. Identity line y=x (dashed gray)
    ctx.strokeStyle = '#78716c'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(plot.toX(bounds.xMin), plot.toY(bounds.xMin))
    ctx.lineTo(plot.toX(bounds.xMax), plot.toY(bounds.xMax))
    ctx.stroke()
    ctx.setLineDash([])

    const fn = compiledFn() // tracked — redraws when fn changes
    if (!fn) return

    // 2. Curve g(x) (green)
    const curvePoints = sampleCurve(fn, bounds.xMin, bounds.xMax)
    ctx.strokeStyle = '#15803d'
    ctx.lineWidth = 2
    ctx.beginPath()
    let newSegment = true
    for (let i = 0; i < curvePoints.length; i += 2) {
      const px = plot.toX(curvePoints[i])
      const py = plot.toY(curvePoints[i + 1])
      if (!isFinite(px) || !isFinite(py)) {
        newSegment = true
        continue
      }
      if (newSegment) {
        ctx.moveTo(px, py)
        newSegment = false
      } else {
        ctx.lineTo(px, py)
      }
    }
    ctx.stroke()

    // 3. Cobweb path (red)
    const currentX0 = x0() // tracked — redraws when x0 changes
    const path = cobwebPath(fn, currentX0, iterations)
    ctx.strokeStyle = '#dc2626'
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

    // 4. x0 marker dot on x-axis
    if (bounds.yMin <= 0 && bounds.yMax >= 0) {
      const markerX = plot.toX(currentX0)
      const axisY = plot.toY(0)
      ctx.fillStyle = '#dc2626'
      ctx.beginPath()
      ctx.arc(markerX, axisY, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const handleCanvasClick = (mathX: number) => {
    setX0(Math.max(bounds.xMin, Math.min(bounds.xMax, mathX)))
  }

  const formatValue = (value: number) =>
    (Math.round(value * 1e6) / 1e6).toFixed(6).replace(/\.?0+$/, '')

  // ---------------------------------------------------------------------------
  // Inner components
  // ---------------------------------------------------------------------------

  const ParameterControl = (innerProps: {
    labelMath: string
    value: number
    min: number
    max: number
    step: number
    accentClass: string
    onChange: (value: number) => void
  }) => {
    const [editing, setEditing] = createSignal(false)
    const [draft, setDraft] = createSignal(formatValue(innerProps.value))
    let inputRef: HTMLInputElement | undefined

    const beginEdit = () => {
      setDraft(formatValue(innerProps.value))
      setEditing(true)
      queueMicrotask(() => {
        inputRef?.focus()
        inputRef?.select()
      })
    }

    const commitEdit = () => {
      const parsed = parseFloat(draft())
      if (Number.isFinite(parsed)) {
        innerProps.onChange(parsed)
      }
      setEditing(false)
    }

    const cancelEdit = () => {
      setDraft(formatValue(innerProps.value))
      setEditing(false)
    }

    return (
      <div class="space-y-1">
        <div class="flex items-center gap-1 text-xs font-mono text-silver-700">
          <span>
            <Latex math={innerProps.labelMath} />
          </span>
          <span>=</span>
          <Show
            when={editing()}
            fallback={
              <button
                type="button"
                onClick={beginEdit}
                class="rounded px-1 py-0.5 text-silver-800 hover:bg-white/60 cursor-text"
              >
                {formatValue(innerProps.value)}
              </button>
            }
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={draft()}
              onInput={(e) => setDraft(e.currentTarget.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitEdit()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelEdit()
                }
              }}
              class="w-20 rounded border border-silver-300 bg-white px-1.5 py-0.5 text-left text-xs font-mono text-silver-800"
            />
          </Show>
        </div>
        <input
          type="range"
          min={innerProps.min}
          max={innerProps.max}
          step={innerProps.step}
          value={innerProps.value}
          onInput={(e) =>
            innerProps.onChange(parseFloat(e.currentTarget.value))
          }
          class={`w-20 max-w-full sm:w-24 ${innerProps.accentClass}`}
        />
      </div>
    )
  }

  const ExprInput = () => {
    let inputRef: HTMLInputElement | undefined
    return (
      <div class="space-y-1">
        <div class="text-xs font-mono text-silver-700">g(x) =</div>
        <input
          ref={inputRef}
          type="text"
          value={exprDraft()}
          onInput={(e) => setExprDraft(e.currentTarget.value)}
          onBlur={() => setExpr(exprDraft())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              setExpr(exprDraft())
              inputRef?.blur()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setExprDraft(expr())
              inputRef?.blur()
            }
          }}
          spellcheck={false}
          class="w-36 rounded border border-silver-300 bg-white px-1.5 py-0.5 text-xs font-mono text-silver-800"
          placeholder="e.g. 2 - x*x"
        />
        <Show when={exprError()}>
          <p class="text-xs text-red-600 font-mono w-36 break-words leading-tight">
            {exprError()}
          </p>
        </Show>
      </div>
    )
  }

  const ControlsPanel = (panelProps: {
    class?: string
    orientation?: 'column' | 'row'
  }) => (
    <div
      data-export-ignore="true"
      class={
        panelProps.class ??
        `rounded-md border border-silver-300 bg-silver-100/70 backdrop-blur-sm p-2 shadow-md ${
          panelProps.orientation === 'row'
            ? 'flex items-end gap-2'
            : 'space-y-2'
        }`
      }
    >
      <ParameterControl
        labelMath="x_0"
        value={x0()}
        min={bounds.xMin}
        max={bounds.xMax}
        step={0.0001}
        onChange={(v) => setX0(Math.max(bounds.xMin, Math.min(bounds.xMax, v)))}
        accentClass="accent-red-600"
      />
      <ExprInput />
    </div>
  )

  const InfoContent = () => (
    <>
      <p class="mb-3">
        A <strong>cobweb diagram</strong> visualizes the iteration of a 1D map{' '}
        <Latex math="g(x)" />. Starting at <Latex math="x_0" />, each step draws
        a vertical line to the curve, then a horizontal line to the diagonal{' '}
        <Latex math="y = x" />.
      </p>
      <p class="mb-3">
        Fixed points occur where the curve crosses the diagonal. Stability
        depends on the slope <Latex math="|g'(x^*)| < 1" /> at the fixed point.
        Click the canvas or drag <Latex math="x_0" /> to set the initial
        condition.
      </p>
      <p>
        The expression field accepts standard JS math:{' '}
        <code class="text-xs bg-silver-200 px-1 rounded">2 - x*x</code>,{' '}
        <code class="text-xs bg-silver-200 px-1 rounded">Math.sin(x)</code>,{' '}
        <code class="text-xs bg-silver-200 px-1 rounded">4*x*(1-x)</code>.
      </p>
    </>
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div class="p-4 md:p-5 bg-silver-50 rounded-lg shadow">
      <h2 class="sr-only">{props.title}</h2>
      <div class="flex flex-col 2xl:flex-row gap-4 items-start">
        <div class="w-full 2xl:flex-1">
          <div class="relative">
            <div
              ref={exportCardRef}
              class="p-3 md:p-4 bg-silver-100 border border-silver-300 rounded-lg shadow-sm"
            >
              {/* Title row */}
              <div class="mb-2 flex items-start gap-3">
                <h3 class="text-lg font-semibold text-silver-900 shrink-0">
                  {props.title}
                </h3>
                <div class="ml-auto flex items-center justify-end">
                  <div class="relative">
                    <div class="hidden lg:block absolute right-full top-0 mr-2 z-10">
                      <ControlsPanel
                        orientation="row"
                        class="rounded-md border border-silver-300 bg-silver-100/70 backdrop-blur-sm p-2 shadow-md flex items-end gap-2"
                      />
                    </div>
                    <CanvasExportButton
                      getElement={() => exportCardRef}
                      title={props.title}
                      fileName={props.title.toLowerCase().replace(/\s+/g, '-')}
                      ignoreInExport
                      class="shrink-0 px-3 py-1.5 rounded bg-grass-700 text-white text-sm font-medium hover:bg-grass-800 transition-colors shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Equation display */}
              <div class="text-silver-700 mb-2 font-mono text-sm">
                g(x) = <code class="bg-silver-200 px-1 rounded">{expr()}</code>
                <Show when={exprError()}>
                  <span class="ml-2 text-red-600 text-xs">(parse error)</span>
                </Show>
              </div>

              {/* Metadata bar */}
              <div class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-silver-700">
                <span>
                  <Latex math="x_0" />: {formatValue(x0())}
                </span>
                <span>iterations: {iterations}</span>
              </div>

              {/* Plot host (ResizeObserver target) */}
              <div
                ref={(el) => {
                  if (plotHostRef && plotResizeObserver) {
                    plotResizeObserver.unobserve(plotHostRef)
                  }
                  plotHostRef = el
                  if (plotResizeObserver) {
                    plotResizeObserver.observe(el)
                    queueMicrotask(updatePlotSize)
                  }
                }}
                class="w-full"
              >
                <CanvasPlot
                  width={plotWidth()}
                  height={plotHeight()}
                  bounds={bounds}
                  background="#f5f5f4"
                  axes={true}
                  axisLabels={{ x: 'x', y: 'g(x)' }}
                  grid={{ x: gridStep, y: gridStep }}
                  run={drawPlot}
                  onClick={(mathX) => handleCanvasClick(mathX)}
                  class="border border-silver-300 rounded bg-white"
                />
              </div>
            </div>
          </div>

          {/* Mobile controls */}
          <div class="mt-3 lg:hidden">
            <ControlsPanel class="rounded border border-silver-300 bg-silver-100 p-3 space-y-2" />
          </div>

          {/* About (collapsed on non-2xl) */}
          <details class="mt-3 2xl:hidden rounded border border-silver-300 bg-silver-100 p-3 text-sm text-silver-700">
            <summary class="cursor-pointer font-medium text-silver-800 select-none">
              About this plot
            </summary>
            <div class="mt-2 leading-relaxed">
              <InfoContent />
            </div>
          </details>
        </div>

        {/* Wide-screen sidebar */}
        <div class="hidden 2xl:block w-88 text-sm text-silver-700 leading-relaxed">
          <InfoContent />
        </div>
      </div>
    </div>
  )
}
