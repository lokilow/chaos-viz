import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import { init, identity, logisticParabola, cobweb } from '../uiua'
import CanvasPlot, { type Plot } from './CanvasPlot'
import CanvasExportButton from './CanvasExportButton'
import Latex from './Latex'

export default function LogisticMap() {
  const [initialized, setInitialized] = createSignal(false)
  const [status, setStatus] = createSignal('Initializing Wasm...')
  const [identityLine, setIdentityLine] = createSignal<Float64Array | null>(
    null
  )

  const [r, setR] = createSignal(2.5)
  const [x0, setX0] = createSignal(0.2)
  const [plotWidth, setPlotWidth] = createSignal(600)
  const [plotHeight, setPlotHeight] = createSignal(460)
  const iterations = 50
  const bounds = { xMin: -0.1, xMax: 1.1, yMin: -0.1, yMax: 1.1 }
  // The export button targets this whole card so exported PNG matches on-screen layout.
  let exportCardRef: HTMLDivElement | undefined
  let plotHostRef: HTMLDivElement | undefined
  let plotResizeObserver: ResizeObserver | undefined

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

  onMount(async () => {
    plotResizeObserver = new ResizeObserver(() => updatePlotSize())
    if (plotHostRef) plotResizeObserver.observe(plotHostRef)
    onCleanup(() => plotResizeObserver?.disconnect())

    try {
      await init()
      setIdentityLine(identity(-0.1, 1.1))
      setInitialized(true)
      setStatus('Ready')
    } catch (err) {
      console.error('Wasm init error:', err)
      setStatus(`Error: ${err}`)
    }
  })

  const drawPlot = (ctx: CanvasRenderingContext2D, plot: Plot) => {
    const idLine = identityLine()
    if (!idLine) return

    // Draw the identity line y=x (static, gray dashed)
    ctx.strokeStyle = '#78716c'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    for (let i = 0; i < idLine.length; i += 2) {
      const px = plot.toX(idLine[i])
      const py = plot.toY(idLine[i + 1])
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Draw the logistic parabola (reactive to r)
    const parabola = logisticParabola(r())
    ctx.strokeStyle = '#15803d'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < parabola.length; i += 2) {
      const px = plot.toX(parabola[i])
      const py = plot.toY(parabola[i + 1])
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Draw the cobweb path (reactive to r and x0)
    try {
      const path = cobweb(r(), x0(), iterations)
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < path.length; i += 2) {
        const px = plot.toX(path[i])
        const py = plot.toY(path[i + 1])
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
    } catch {
      // cobweb.ua not yet implemented — skip silently
    }

    // Draw x0 marker on x-axis
    const markerX = plot.toX(x0())
    const axisY = plot.toY(0)
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.arc(markerX, axisY, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  const handleCanvasClick = (mathX: number) => {
    const clamped = Math.max(0, Math.min(1, mathX))
    setX0(clamped)
  }

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value))

  const formatValue = (value: number) =>
    (Math.round(value * 1e6) / 1e6).toFixed(6).replace(/\.?0+$/, '')

  const normalizeR = (value: number) =>
    Math.round(clamp(value, 0, 4) * 1e6) / 1e6
  const normalizeX0 = (value: number) =>
    Math.round(clamp(value, 0, 1) * 1e6) / 1e6

  const updateR = (value: number) => {
    if (!Number.isFinite(value)) return
    setR(normalizeR(value))
  }

  const updateX0 = (value: number) => {
    if (!Number.isFinite(value)) return
    setX0(normalizeX0(value))
  }

  const ParameterControl = (props: {
    labelMath: string
    value: number
    min: number
    max: number
    step: number
    accentClass: string
    onChange: (value: number) => void
  }) => {
    const [editing, setEditing] = createSignal(false)
    const [draft, setDraft] = createSignal(formatValue(props.value))
    let inputRef: HTMLInputElement | undefined

    const beginEdit = () => {
      setDraft(formatValue(props.value))
      setEditing(true)
      queueMicrotask(() => {
        inputRef?.focus()
        inputRef?.select()
      })
    }

    const commitEdit = () => {
      const parsed = parseFloat(draft())
      if (Number.isFinite(parsed)) {
        props.onChange(parsed)
      }
      setEditing(false)
    }

    const cancelEdit = () => {
      setDraft(formatValue(props.value))
      setEditing(false)
    }

    return (
      <div class="space-y-1">
        <div class="flex items-center gap-1 text-xs font-mono text-silver-700">
          <span>
            <Latex math={props.labelMath} />
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
                {formatValue(props.value)}
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
          min={props.min}
          max={props.max}
          step={props.step}
          value={props.value}
          onInput={(e) => props.onChange(parseFloat(e.currentTarget.value))}
          class={`w-20 max-w-full sm:w-24 ${props.accentClass}`}
        />
      </div>
    )
  }

  const ControlsPanel = (props: {
    class?: string
    orientation?: 'column' | 'row'
  }) => (
    <div
      data-export-ignore="true"
      class={
        props.class ??
        `rounded-md border border-silver-300 bg-silver-100/70 backdrop-blur-sm p-2 shadow-md ${
          props.orientation === 'row' ? 'flex items-end gap-2' : 'space-y-2'
        }`
      }
    >
      <ParameterControl
        labelMath="r"
        value={r()}
        min={0}
        max={4}
        step={0.000001}
        onChange={updateR}
        accentClass="accent-grass-600"
      />
      <ParameterControl
        labelMath="x_0"
        value={x0()}
        min={0}
        max={1}
        step={0.000001}
        onChange={updateX0}
        accentClass="accent-red-600"
      />
    </div>
  )

  const InfoContent = () => (
    <>
      <p class="mb-3">
        The <strong>logistic map</strong> is a simple recurrence relation that
        exhibits complex chaotic behavior. Starting from an initial value{' '}
        <Latex math="x_0" /> between 0 and 1, each iteration applies the map to
        produce the next value.
      </p>
      <p class="mb-3">
        The parameter <Latex math="r" /> controls the dynamics: for small{' '}
        <Latex math="r" />, the system settles to a fixed point. As{' '}
        <Latex math="r" /> increases, the behavior becomes periodic, then
        chaotic through a series of period-doubling bifurcations.
      </p>
      <p>
        The diagonal line <Latex math="y = x" /> helps visualize fixed points
        where <Latex math="x_{n+1} = x_n" />. Click the canvas or drag the{' '}
        <Latex math="x_0" /> slider to set the initial condition.
      </p>
    </>
  )

  return (
    <div class="p-4 md:p-5 bg-silver-50 rounded-lg shadow">
      <h2 class="sr-only">Logistic Map</h2>
      <Show
        when={initialized()}
        fallback={
          <div class="text-grass-600 font-mono animate-pulse">{status()}</div>
        }
      >
        <div class="flex flex-col 2xl:flex-row gap-4 items-start">
          <div class="w-full 2xl:flex-1">
            <div class="relative">
              {/* Reusable export-card pattern for other plots:
                title row + equation/meta + CanvasPlot + export button with getElement */}
              <div
                ref={exportCardRef}
                class="p-3 md:p-4 bg-silver-100 border border-silver-300 rounded-lg shadow-sm"
              >
                <div class="mb-2 flex items-start gap-3">
                  <h3 class="text-lg font-semibold text-silver-900 shrink-0">
                    Logistic Map
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
                        title="Logistic Map"
                        fileName="logistic-map"
                        ignoreInExport
                        class="shrink-0 px-3 py-1.5 rounded bg-grass-700 text-white text-sm font-medium hover:bg-grass-800 transition-colors shadow-sm"
                      />
                    </div>
                  </div>
                </div>
                <div class="text-silver-700 mb-2">
                  <Latex math="x_{n+1} = r x_n (1 - x_n)" />
                </div>
                <div class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-silver-700">
                  <span>
                    <Latex math="r" />: {formatValue(r())}
                  </span>
                  <span>
                    <Latex math="x_0" />: {formatValue(x0())}
                  </span>
                  <span>iterations: {iterations}</span>
                </div>
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
                    axisLabels={{ x: 'xₙ', y: 'f(xₙ)' }}
                    grid={{ x: 0.2, y: 0.2 }}
                    run={drawPlot}
                    onClick={(mathX) => handleCanvasClick(mathX)}
                    class="border border-silver-300 rounded bg-white"
                  />
                </div>
              </div>
            </div>
            {/* Mobile controls live below the card for touch comfort */}
            <div class="mt-3 lg:hidden">
              <ControlsPanel class="rounded border border-silver-300 bg-silver-100 p-3 space-y-2" />
            </div>
            <details class="mt-3 2xl:hidden rounded border border-silver-300 bg-silver-100 p-3 text-sm text-silver-700">
              <summary class="cursor-pointer font-medium text-silver-800 select-none">
                About this plot
              </summary>
              <div class="mt-2 leading-relaxed">
                <InfoContent />
              </div>
            </details>
          </div>
          <div class="hidden 2xl:block w-[22rem] text-sm text-silver-700 leading-relaxed">
            <InfoContent />
          </div>
        </div>
      </Show>
    </div>
  )
}
