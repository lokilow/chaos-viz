import { createSignal, onMount, Show } from 'solid-js'
import { init, identity } from '../uiua'
import CanvasPlot, { type Plot } from './CanvasPlot'

export default function LogisticMap() {
  const [initialized, setInitialized] = createSignal(false)
  const [status, setStatus] = createSignal('Initializing Wasm...')
  const [points, setPoints] = createSignal<Float64Array | null>(null)

  const bounds = { xMin: -0.1, xMax: 1.1, yMin: -0.1, yMax: 1.1 }

  onMount(async () => {
    try {
      await init()
      setStatus('Wasm initialized, running Uiua...')
      const result = identity(10)
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

  return (
    <div class="p-6 bg-silver-50 rounded-lg shadow">
      <h2 class="text-xl font-bold mb-4">Logistic Map (1D)</h2>
      <Show
        when={initialized()}
        fallback={
          <div class="text-grass-600 font-mono animate-pulse">{status()}</div>
        }
      >
        <CanvasPlot
          width={600}
          height={400}
          bounds={bounds}
          background="#f5f5f4"
          axes={true}
          axisLabels={{ x: 'xₙ', y: 'f(xₙ)' }}
          grid={{ x: 0.2, y: 0.2 }}
          run={drawPlot}
          class="border border-silver-300 rounded"
        />
      </Show>
    </div>
  )
}
