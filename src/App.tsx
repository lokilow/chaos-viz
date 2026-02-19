import {
  createSignal,
  For,
  Show,
  Suspense,
  lazy,
  type Component,
} from 'solid-js'

const LogisticMap = lazy(() => import('./components/LogisticMap'))
const MandelbrotSet = lazy(() => import('./components/MandelbrotSet'))
const JuliaSet = lazy(() => import('./components/JuliaSet'))
const HenonMap = lazy(async () => {
  const [{ MapPage }, { henon }] = await Promise.all([
    import('./components/MapPage'),
    import('./maps/henon'),
  ])
  const Page: Component = () => <MapPage map={henon} />
  return { default: Page }
})

// Define the tabs config
const TABS: { id: string; label: string; component: Component }[] = [
  { id: 'logistic', label: 'Logistic Map', component: LogisticMap },
  { id: 'mandelbrot', label: 'Mandelbrot Set', component: MandelbrotSet },
  { id: 'julia', label: 'Julia Set', component: JuliaSet },
  { id: 'henon', label: 'Hénon Map', component: HenonMap },
]

function App() {
  const [activeTab, setActiveTab] = createSignal(TABS[0].id)
  // Track which tabs have been initialized (visited at least once)
  const [visited, setVisited] = createSignal<Record<string, boolean>>({
    [TABS[0].id]: true,
  })

  const switchTab = (id: string) => {
    setActiveTab(id)
    setVisited((prev) => ({ ...prev, [id]: true }))
  }

  return (
    <div class="min-h-screen bg-silver-100 flex flex-col font-sans text-silver-900">
      {/* Header */}
      <header class="bg-grass-900 text-white py-3 shadow-md">
        <div class="max-w-7xl mx-auto px-4 md:px-5 flex items-center justify-between">
          <h1 class="text-2xl font-bold tracking-tight">Chaos & Fractals</h1>
        </div>
      </header>

      {/* Main Content */}
      <main class="flex-1 w-full max-w-7xl mx-auto p-3 md:p-5">
        {/* Mobile tab selector */}
        <div class="mb-3 md:hidden">
          <label for="plot-tab-select" class="sr-only">
            Select plot
          </label>
          <select
            id="plot-tab-select"
            value={activeTab()}
            onChange={(e) => switchTab(e.currentTarget.value)}
            class="w-full rounded border border-silver-300 bg-white px-3 py-2 text-sm font-medium text-silver-800"
          >
            <For each={TABS}>
              {(tab) => <option value={tab.id}>{tab.label}</option>}
            </For>
          </select>
        </div>

        {/* Tab Navigation */}
        <div class="hidden md:flex border-b border-silver-300 mb-5 overflow-x-auto">
          <For each={TABS}>
            {(tab) => (
              <button
                onClick={() => switchTab(tab.id)}
                class={`
                  py-2 px-6 font-medium text-sm transition-colors border-b-2 whitespace-nowrap
                  ${
                    activeTab() === tab.id
                      ? 'border-grass-600 text-grass-700'
                      : 'border-transparent text-silver-500 hover:text-silver-700 hover:border-silver-400'
                  }
                `}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>

        {/* Tab Content Panels */}
        <div class="relative">
          <For each={TABS}>
            {(tab) => (
              // 1. Only mount if visited at least once (Lazy Load)
              <Show when={visited()[tab.id]}>
                {/* 2. Toggle visibility instead of unmounting (Keep Alive) */}
                <div class={activeTab() === tab.id ? 'block' : 'hidden'}>
                  <Suspense
                    fallback={
                      <div class="text-grass-700 font-mono animate-pulse">
                        Loading {tab.label}…
                      </div>
                    }
                  >
                    <tab.component />
                  </Suspense>
                </div>
              </Show>
            )}
          </For>
        </div>
      </main>

      <footer class="bg-silver-200 border-t border-silver-300 p-6 text-center text-silver-500 text-sm">
        <a
          href="https://noisegate.io"
          class="hover:text-grass-700 transition-colors"
        >
          noisegate
        </a>
      </footer>
    </div>
  )
}

export default App
