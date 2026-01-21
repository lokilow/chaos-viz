import { createSignal, onMount, Show } from 'solid-js'

export default function MandelbrotSet() {
  const [initialized, setInitialized] = createSignal(false)
  const [status, setStatus] = createSignal('Initializing...')

  onMount(async () => {
    await new Promise((r) => setTimeout(r, 1000))
    setInitialized(true)
    setStatus('Initialized')
  })

  return (
    <div class="p-6 bg-silver-50 rounded-lg shadow">
      <h2 class="text-xl font-bold mb-4">Mandelbrot Set (Fractal)</h2>
      <Show
        when={initialized()}
        fallback={
          <div class="text-grass-600 font-mono animate-pulse">{status()}</div>
        }
      >
        <div class="h-64 bg-silver-200 rounded flex items-center justify-center text-silver-400">
          [Canvas Area]
        </div>
      </Show>
    </div>
  )
}
