import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import CanvasPlot, { type Plot } from './CanvasPlot'
import CanvasExportButton from './CanvasExportButton'
import Latex from './Latex'
import { juliaIIM, JULIA_PRESETS } from '../utils/julia'
// TODO: swap engine — implement Uiua escape-time kernel ("The Texture Blaster"):
//   Uiua computes escape iterations for every pixel → returns Uint8Array of RGBA values
//   JS wraps with `new ImageData(rgba, w, h)` → canvas uses `ctx.putImageData()`
//   See CLAUDE.md §"For Fractals" for the full strategy. Replace `drawPlot` below.

const BOUNDS = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 }
const DEFAULT_NITER = 150_000

export default function JuliaSet() {
  const [a, setA] = createSignal(0)
  const [b, setB] = createSignal(-1)
  const [plotWidth, setPlotWidth] = createSignal(600)
  const [plotHeight, setPlotHeight] = createSignal(600)

  let exportCardRef: HTMLDivElement | undefined
  let plotHostRef: HTMLDivElement | undefined
  let plotResizeObserver: ResizeObserver | undefined

  const updatePlotSize = () => {
    const host = plotHostRef
    if (!host) return
    const w = Math.floor(host.getBoundingClientRect().width)
    if (w <= 0) return
    const size = Math.max(280, Math.min(700, w))
    setPlotWidth(size)
    setPlotHeight(size) // square canvas — complex plane is symmetric
  }

  onMount(() => {
    plotResizeObserver = new ResizeObserver(() => updatePlotSize())
    if (plotHostRef) plotResizeObserver.observe(plotHostRef)
    onCleanup(() => plotResizeObserver?.disconnect())
  })

  const drawPlot = (ctx: CanvasRenderingContext2D, plot: Plot) => {
    const pts = juliaIIM(a(), b(), DEFAULT_NITER)

    ctx.fillStyle = '#15803d' // grass-700
    for (let i = 0; i < pts.length; i += 2) {
      const px = plot.toX(pts[i])
      const py = plot.toY(pts[i + 1])
      // Skip points outside canvas bounds (can happen for diverging params)
      if (px < 0 || px > plot.width || py < 0 || py > plot.height) continue
      ctx.fillRect(px, py, 1, 1)
    }
  }

  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, v))
  const fmt = (v: number) =>
    (Math.round(v * 1e4) / 1e4).toFixed(4).replace(/\.?0+$/, '')

  const normalizeA = (v: number) => Math.round(clamp(v, -2, 2) * 1e6) / 1e6
  const normalizeB = (v: number) => Math.round(clamp(v, -2, 2) * 1e6) / 1e6

  const ParameterControl = (props: {
    labelMath: string
    value: number
    min: number
    max: number
    step: number
    accentClass: string
    onChange: (v: number) => void
  }) => {
    const [editing, setEditing] = createSignal(false)
    const [draft, setDraft] = createSignal(fmt(props.value))
    let inputRef: HTMLInputElement | undefined

    const beginEdit = () => {
      setDraft(fmt(props.value))
      setEditing(true)
      queueMicrotask(() => { inputRef?.focus(); inputRef?.select() })
    }
    const commitEdit = () => {
      const parsed = parseFloat(draft())
      if (Number.isFinite(parsed)) props.onChange(parsed)
      setEditing(false)
    }
    const cancelEdit = () => { setDraft(fmt(props.value)); setEditing(false) }

    return (
      <div class="space-y-1">
        <div class="flex items-center gap-1 text-xs font-mono text-silver-700">
          <span><Latex math={props.labelMath} /></span>
          <span>=</span>
          <Show
            when={editing()}
            fallback={
              <button
                type="button"
                onClick={beginEdit}
                class="rounded px-1 py-0.5 text-silver-800 hover:bg-white/60 cursor-text"
              >
                {fmt(props.value)}
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
                if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
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

  const ControlsPanel = (props: { class?: string; orientation?: 'column' | 'row' }) => (
    <div
      data-export-ignore="true"
      class={
        props.class ??
        `rounded-md border border-silver-300 bg-silver-100/70 backdrop-blur-sm p-2 shadow-md ${
          props.orientation === 'row' ? 'flex items-end gap-4' : 'space-y-2'
        }`
      }
    >
      <ParameterControl
        labelMath="\text{Re}(c)"
        value={a()}
        min={-2}
        max={2}
        step={0.0001}
        onChange={(v) => setA(normalizeA(v))}
        accentClass="accent-grass-600"
      />
      <ParameterControl
        labelMath="\text{Im}(c)"
        value={b()}
        min={-2}
        max={2}
        step={0.0001}
        onChange={(v) => setB(normalizeB(v))}
        accentClass="accent-red-600"
      />
      <div class="space-y-1">
        <div class="text-xs font-mono text-silver-600">presets</div>
        <div class="flex flex-wrap gap-1">
          {JULIA_PRESETS.map((p) => (
            <button
              type="button"
              onClick={() => { setA(p.a); setB(p.b) }}
              class="rounded border border-silver-300 bg-white px-1.5 py-0.5 text-xs font-mono text-silver-700 hover:bg-silver-50 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const InfoContent = () => (
    <>
      <p class="mb-3">
        The <strong>Julia set</strong> of <Latex math="f(z) = z^2 + c" /> is
        the boundary between initial conditions that stay bounded and those that
        escape to infinity under iteration.
      </p>
      <p class="mb-3">
        Visualized here using the{' '}
        <strong>Inverse Iteration Method</strong>: instead of iterating forward,
        we apply the inverse map <Latex math="z \mapsto \pm\sqrt{z - c}" />{' '}
        repeatedly, randomly selecting a branch at each step. The resulting
        random walk converges to the Julia set boundary.
      </p>
      <p>
        Each choice of <Latex math="c" /> produces a qualitatively different
        set. When <Latex math="c" /> lies inside the Mandelbrot set, the Julia
        set is a connected fractal curve. Outside, it becomes a Cantor dust.
      </p>
    </>
  )

  return (
    <div class="p-4 md:p-5 bg-silver-50 rounded-lg shadow">
      <h2 class="sr-only">Julia Set</h2>
      <div class="flex flex-col 2xl:flex-row gap-4 items-start">
        <div class="w-full 2xl:flex-1">
          <div class="relative">
            <div
              ref={exportCardRef}
              class="p-3 md:p-4 bg-silver-100 border border-silver-300 rounded-lg shadow-sm"
            >
              <div class="mb-2 flex items-start gap-3">
                <h3 class="text-lg font-semibold text-silver-900 shrink-0">
                  Julia Set
                </h3>
                <div class="ml-auto flex items-center justify-end">
                  <div class="relative">
                    <div class="hidden lg:block absolute right-full top-0 mr-2 z-10">
                      <ControlsPanel
                        orientation="row"
                        class="rounded-md border border-silver-300 bg-silver-100/70 backdrop-blur-sm p-2 shadow-md flex items-end gap-4"
                      />
                    </div>
                    <CanvasExportButton
                      getElement={() => exportCardRef}
                      title="Julia Set"
                      fileName="julia-set"
                      ignoreInExport
                      class="shrink-0 px-3 py-1.5 rounded bg-grass-700 text-white text-sm font-medium hover:bg-grass-800 transition-colors shadow-sm"
                    />
                  </div>
                </div>
              </div>
              <div class="text-silver-700 mb-2">
                <Latex math="f(z) = z^2 + c" />
                {', '}
                <Latex math={`c = ${fmt(a())} + ${fmt(b())}i`} />
              </div>
              <div class="mb-2 text-xs font-mono text-silver-600">
                {DEFAULT_NITER.toLocaleString()} iterations · IIM
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
                  bounds={BOUNDS}
                  background="#f5f5f4"
                  axes={true}
                  axisLabels={{ x: 'Re(z)', y: 'Im(z)' }}
                  grid={{ x: 0.5, y: 0.5 }}
                  run={drawPlot}
                  class="border border-silver-300 rounded bg-white"
                />
              </div>
            </div>
          </div>
          <div class="mt-3 lg:hidden">
            <ControlsPanel class="rounded border border-silver-300 bg-silver-100 p-3 space-y-3" />
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
        <div class="hidden 2xl:block w-88 text-sm text-silver-700 leading-relaxed">
          <InfoContent />
        </div>
      </div>
    </div>
  )
}
