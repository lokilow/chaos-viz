import { createSignal, onMount, Show, For } from 'solid-js'
import { init, identity } from '../uiua'
import CanvasPlot, { type Plot } from './CanvasPlot'
import Latex from './Latex'

export default function LogisticMap() {
  const [initialized, setInitialized] = createSignal(false)
  const [status, setStatus] = createSignal('Initializing Wasm...')
  const [points, setPoints] = createSignal<Float64Array | null>(null)

  const [r, setR] = createSignal(2.5)
  const [visibleIterations, setVisibleIterations] = createSignal({
    f1: true,
    f2: false,
    f3: false,
    f4: false,
    f5: false,
  })

  const toggleIteration = (key: keyof ReturnType<typeof visibleIterations>) => {
    setVisibleIterations((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const bounds = { xMin: -0.1, xMax: 1.1, yMin: -0.1, yMax: 1.1 }

  onMount(async () => {
    try {
      await init()
      setStatus('Wasm initialized, running Uiua...')
      const result = identity(bounds.xMin, bounds.xMax)
      setPoints(result)
      setInitialized(true)
      setStatus('Ready')
    } catch (err) {
      console.error('Wasm init error:', err)
      setStatus(`Error: ${err}`)
    }
  })

  const drawPlot = (ctx: CanvasRenderingContext2D, plot: Plot) => {
    const data = points()
    if (!data || data.length === 0) return

    // Draw the identity line (y=x)
    ctx.strokeStyle = '#15803d'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < data.length; i += 2) {
      const px = plot.toX(data[i])
      const py = plot.toY(data[i + 1])
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }

  const iterationLabels = [
    { key: 'f1' as const, label: 'f' },
    { key: 'f2' as const, label: 'f\u00B2' },
    { key: 'f3' as const, label: 'f\u00B3' },
    { key: 'f4' as const, label: 'f\u2074' },
    { key: 'f5' as const, label: 'f\u2075' },
  ]

  return (
    <div class="p-6 bg-silver-50 rounded-lg shadow">
      <h2 class="text-xl font-bold mb-2">Logistic Map</h2>
      <div class="mb-4">
        <Latex math="x_{n+1} = r x_n (1 - x_n)" display />
      </div>
      <Show
        when={initialized()}
        fallback={
          <div class="text-grass-600 font-mono animate-pulse">{status()}</div>
        }
      >
        {/* Controls */}
        <div class="mb-4 flex items-center gap-6">
          {/* r slider */}
          <div class="flex items-center gap-3">
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
              class="w-48 accent-grass-600"
            />
          </div>

          {/* Iteration checkboxes */}
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium text-silver-700">Show:</span>
            <For each={iterationLabels}>
              {(item) => (
                <label class="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleIterations()[item.key]}
                    onChange={() => toggleIteration(item.key)}
                    class="accent-grass-600"
                  />
                  {item.label}
                </label>
              )}
            </For>
          </div>
        </div>

        <div class="flex gap-6">
          <CanvasPlot
            width={500}
            height={400}
            bounds={bounds}
            background="#f5f5f4"
            axes={true}
            axisLabels={{ x: 'xₙ', y: 'f(xₙ)' }}
            grid={{ x: 0.2, y: 0.2 }}
            run={drawPlot}
            class="border border-silver-300 rounded"
          />
          <div class="flex-1 text-sm text-silver-700 leading-relaxed">
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
              points where <Latex math="x_{n+1} = x_n" />.
            </p>
          </div>
        </div>
      </Show>
    </div>
  )
}
