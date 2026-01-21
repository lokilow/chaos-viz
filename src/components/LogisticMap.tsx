import { createSignal, onMount, Show } from 'solid-js'
import { init, identity } from '../uiua'
import CanvasPlot from './CanvasPlot'

// Coordinate system configuration
type PlotBounds = {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

// Transform from math coordinates to canvas pixels
function toCanvasX(x: number, bounds: PlotBounds, width: number): number {
  return ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * width
}

function toCanvasY(y: number, bounds: PlotBounds, height: number): number {
  // Canvas Y is inverted (0 at top)
  return height - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * height
}

export default function LogisticMap() {
  const [initialized, setInitialized] = createSignal(false)
  const [status, setStatus] = createSignal('Initializing Wasm...')
  const [points, setPoints] = createSignal<Float64Array | null>(null)

  // Default bounds for identity function test
  const bounds: PlotBounds = {
    xMin: 0,
    xMax: 10,
    yMin: 0,
    yMax: 10,
  }

  onMount(async () => {
    try {
      // Initialize the wasm module
      await init()
      setStatus('Wasm initialized, running Uiua...')

      // Run the identity function via Uiua
      const result = identity(10)
      setPoints(result)
      setInitialized(true)
      setStatus('Ready')
    } catch (err) {
      console.error('Wasm init error:', err)
      setStatus(`Error: ${err}`)
    }
  })

  const drawPlot = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const data = points()
    if (!data || data.length === 0) return

    // Background
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(0, 0, width, height)

    // Draw axes
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 1

    // X axis (y=0)
    const y0 = toCanvasY(0, bounds, height)
    ctx.beginPath()
    ctx.moveTo(0, y0)
    ctx.lineTo(width, y0)
    ctx.stroke()

    // Y axis (x=0)
    const x0 = toCanvasX(0, bounds, width)
    ctx.beginPath()
    ctx.moveTo(x0, 0)
    ctx.lineTo(x0, height)
    ctx.stroke()

    // Data is interleaved: [x0, y0, x1, y1, x2, y2, ...]
    // Draw the identity line (y=x)
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i < data.length; i += 2) {
      const x = data[i]
      const y = data[i + 1]
      const canvasX = toCanvasX(x, bounds, width)
      const canvasY = toCanvasY(y, bounds, height)

      if (i === 0) {
        ctx.moveTo(canvasX, canvasY)
      } else {
        ctx.lineTo(canvasX, canvasY)
      }
    }
    ctx.stroke()

    // Draw points
    ctx.fillStyle = '#ef4444'
    for (let i = 0; i < data.length; i += 2) {
      const x = data[i]
      const y = data[i + 1]
      const canvasX = toCanvasX(x, bounds, width)
      const canvasY = toCanvasY(y, bounds, height)

      ctx.beginPath()
      ctx.arc(canvasX, canvasY, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Labels
    ctx.fillStyle = '#666'
    ctx.font = '12px monospace'
    ctx.fillText('y = x (via Uiua)', 10, 20)
  }

  return (
    <div class="p-6 bg-white rounded-lg shadow">
      <h2 class="text-xl font-bold mb-4">Logistic Map (1D)</h2>
      <Show
        when={initialized()}
        fallback={
          <div class="text-blue-600 font-mono animate-pulse">{status()}</div>
        }
      >
        <div class="text-green-600 font-mono mb-4 text-sm">
          {status()} - Uiua wired up!
        </div>
        <CanvasPlot
          width={600}
          height={400}
          run={drawPlot}
          class="border border-gray-200 rounded"
        />
      </Show>
    </div>
  )
}
