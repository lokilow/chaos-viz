import { createSignal, For, Show } from 'solid-js'
import LogisticMap from './components/LogisticMap'
import MandelbrotSet from './components/MandelbrotSet'
import JuliaSet from './components/JuliaSet'
import { MapPage } from './components/MapPage'
import { henon } from './maps/henon'

const HenonMap = () => <MapPage map={henon} />

// Define the tabs config
const TABS = [
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
      <header class="bg-grass-900 text-white p-4 shadow-md">
        <div class="max-w-5xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold tracking-tight">Chaos & Fractals</h1>
        </div>
      </header>

      {/* Main Content */}
      <main class="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
        {/* Tab Navigation */}
        <div class="flex border-b border-silver-300 mb-8 overflow-x-auto">
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
                  <tab.component />
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
