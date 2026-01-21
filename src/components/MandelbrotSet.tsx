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
    <div class="p-6 bg-white rounded-lg shadow">
      <h2 class="text-xl font-bold mb-4">Mandelbrot Set (Fractal)</h2>
      <Show
        when={initialized()}
        fallback={
          <div class="text-blue-600 font-mono animate-pulse">{status()}</div>
        }
      >
        <div class="text-green-600 font-mono mb-4">
          {status()}{' '}
          <span class="text-gray-400 text-sm">(Ready for plotting logic)</span>
        </div>
        <div class="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-400">
          [Canvas Area]
        </div>
      </Show>
    </div>
  )
}
