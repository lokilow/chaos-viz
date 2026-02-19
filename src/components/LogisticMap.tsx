import { createSignal, onMount, Show } from 'solid-js'
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
  const iterations = 50
  const bounds = { xMin: -0.1, xMax: 1.1, yMin: -0.1, yMax: 1.1 }
  // The export button targets this whole card so exported PNG matches on-screen layout.
  let exportCardRef: HTMLDivElement | undefined

  onMount(async () => {
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

  return (
    <div class="p-6 bg-silver-50 rounded-lg shadow">
      <h2 class="text-xl font-bold mb-2">Logistic Map</h2>
      <Show
        when={initialized()}
        fallback={
          <div class="text-grass-600 font-mono animate-pulse">{status()}</div>
        }
      >
        {/* Compact control strip */}
        <div class="mb-4 flex flex-wrap items-end gap-x-5 gap-y-3">
          <div class="min-w-[220px] text-silver-700">
            <Latex math="x_{n+1} = r x_n (1 - x_n)" />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-silver-700">
              <Latex math="r" /> = {r().toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="4"
              step="0.01"
              value={r()}
              onInput={(e) => setR(parseFloat(e.currentTarget.value))}
              class="w-32 accent-grass-600"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-silver-700">
              <Latex math="x_0" /> = {x0().toFixed(3)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={x0()}
              onInput={(e) => setX0(parseFloat(e.currentTarget.value))}
              class="w-32 accent-red-600"
            />
          </div>
        </div>

        <div class="flex flex-col lg:flex-row gap-5 items-start">
          <div class="w-full max-w-[680px]">
            {/* Reusable export-card pattern for other plots:
                title row + equation/meta + CanvasPlot + export button with getElement */}
            <div
              ref={exportCardRef}
              class="p-4 bg-silver-100 border border-silver-300 rounded-lg shadow-sm"
            >
              <div class="mb-1 flex items-start justify-between gap-3">
                <h3 class="text-lg font-semibold text-silver-900">
                  Logistic Map
                </h3>
                <CanvasExportButton
                  getElement={() => exportCardRef}
                  title="Logistic Map"
                  fileName="logistic-map"
                  ignoreInExport
                  class="px-3 py-1.5 rounded bg-grass-700 text-white text-sm font-medium hover:bg-grass-800 transition-colors shadow-sm"
                />
              </div>
              <div class="text-silver-700 mb-2">
                <Latex math="x_{n+1} = r x_n (1 - x_n)" />
              </div>
              <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-silver-700">
                <span>
                  <Latex math="r" />: {r().toFixed(3)}
                </span>
                <span>
                  <Latex math="x_0" />: {x0().toFixed(3)}
                </span>
                <span>iterations: {iterations}</span>
              </div>
              <CanvasPlot
                width={600}
                height={460}
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
          <div class="max-w-sm text-sm text-silver-700 leading-relaxed">
            <p class="mb-3">
              The <strong>logistic map</strong> is a simple recurrence relation
              that exhibits complex chaotic behavior. Starting from an initial
              value <Latex math="x_0" /> between 0 and 1, each iteration applies
              the map to produce the next value.
            </p>
            <p class="mb-3">
              The parameter <Latex math="r" /> controls the dynamics: for small{' '}
              <Latex math="r" />, the system settles to a fixed point. As{' '}
              <Latex math="r" /> increases, the behavior becomes periodic, then
              chaotic through a series of period-doubling bifurcations.
            </p>
            <p>
              The diagonal line <Latex math="y = x" /> helps visualize fixed
              points where <Latex math="x_{n+1} = x_n" />. Click the canvas or
              drag the <Latex math="x_0" /> slider to set the initial condition.
            </p>
          </div>
        </div>
      </Show>
    </div>
  )
}
