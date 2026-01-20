import { createSignal, For, Show } from 'solid-js'
import LogisticMap from './components/LogisticMap'
import MandelbrotSet from './components/MandelbrotSet'
import JuliaSet from './components/JuliaSet'

// Define the tabs config
const TABS = [
  { id: 'logistic', label: 'Logistic Map', component: LogisticMap },
  { id: 'mandelbrot', label: 'Mandelbrot Set', component: MandelbrotSet },
  { id: 'julia', label: 'Julia Set', component: JuliaSet },
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
    <div class="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Header */}
      <header class="bg-blue-900 text-white p-4 shadow-md">
        <div class="max-w-5xl mx-auto flex items-center justify-between">
          <h1 class="text-2xl font-bold tracking-tight">Chaos & Fractals</h1>
          <div class="text-blue-200 text-sm">Computational Lab</div>
        </div>
      </header>

      {/* Main Content */}
      <main class="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
        {/* Tab Navigation */}
        <div class="flex border-b border-gray-200 mb-8 overflow-x-auto">
          <For each={TABS}>
            {(tab) => (
              <button
                onClick={() => switchTab(tab.id)}
                class={`
                  py-2 px-6 font-medium text-sm transition-colors border-b-2 whitespace-nowrap
                  ${
                    activeTab() === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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

      <footer class="bg-gray-100 border-t border-gray-200 p-6 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Computational Laboratory</p>
      </footer>
    </div>
  )
}

export default App
