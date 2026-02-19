import { createSignal, createEffect, For, Show } from 'solid-js'
import type { MapDefinition } from '../maps/types'
import P5Plot from './P5Plot'
import CanvasExportButton from './CanvasExportButton'
import {
  mountBifurcation,
  mountIteration,
  type BifurcationHandle,
  type IterationHandle,
  type IterationState,
} from '../sketches/wrap'

type View = 'bifurcation' | 'iteration'

interface MapPageProps {
  map: MapDefinition
}

export function MapPage(props: MapPageProps) {
  const map = props.map
  const bd = map.bifurcationDefaults
  const id = map.iterationDefaults
  const mapSlug =
    map.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'map'

  // ---- view toggle ----
  const [view, setView] = createSignal<View>('bifurcation')

  // ---- bifurcation params ----
  const [paramMin, setParamMin] = createSignal(bd.paramMin)
  const [paramMax, setParamMax] = createSignal(bd.paramMax)
  const [dParam, setDParam] = createSignal(bd.dParam)
  const [N, setN] = createSignal(bd.N)
  const [plotYMin, setPlotYMin] = createSignal(bd.plotYMin)
  const [plotYMax, setPlotYMax] = createSignal(bd.plotYMax)
  const [plotX, setPlotX] = createSignal(true)
  const [plotY, setPlotY] = createSignal(false)
  const [mapParams, setMapParams] = createSignal({ ...map.defaultParams })

  // ---- bifurcation output ----
  const [periodDoublings, setPeriodDoublings] = createSignal<
    Map<number, number>
  >(new Map())

  // ---- iteration params ----
  const [iterSpeed, setIterSpeed] = createSignal(id.speed)

  // ---- iteration state display ----
  const [iterState, setIterState] = createSignal<IterationState>({
    x: 0,
    y: 0,
    step: 0,
    maxStep: 0,
    waiting: true,
    icX: 0,
    icY: 0,
    detectedPeriod: null,
    cyclePoints: [],
    playbackStep: null,
    isRunning: false,
  })

  // ---- handles (set after mount) ----
  let bifHandle: BifurcationHandle | null = null
  let iterHandle: IterationHandle | null = null
  let bifurcationExportRef: HTMLDivElement | undefined
  let bifurcationCanvas: HTMLCanvasElement | undefined
  let iterationExportRef: HTMLDivElement | undefined
  let iterationCanvas: HTMLCanvasElement | undefined
  let resumeIterationAfterExport = false

  // ---- bifurcation recompute on param change ----
  createEffect(() => {
    if (!bifHandle) return
    bifHandle.update({
      paramMin: paramMin(),
      paramMax: paramMax(),
      dParam: dParam(),
      N: N(),
      plotYMin: plotYMin(),
      plotYMax: plotYMax(),
      plotX: plotX(),
      plotY: plotY(),
      params: mapParams(),
    })
    setPeriodDoublings(new Map(bifHandle.getPeriodDoublings()))
  })

  // ---- iteration speed update ----
  createEffect(() => {
    if (!iterHandle) return
    iterHandle.update({ speed: iterSpeed(), params: mapParams() })
  })

  const sortedPeriods = () =>
    [...periodDoublings().entries()].sort(([a], [b]) => a - b)

  return (
    <div class="space-y-6">
      {/* View toggle */}
      <div class="flex gap-2">
        <button
          onClick={() => setView('bifurcation')}
          class={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            view() === 'bifurcation'
              ? 'bg-grass-700 text-white'
              : 'bg-silver-200 text-silver-700 hover:bg-silver-300'
          }`}
        >
          Bifurcation
        </button>
        <button
          onClick={() => setView('iteration')}
          class={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            view() === 'iteration'
              ? 'bg-grass-700 text-white'
              : 'bg-silver-200 text-silver-700 hover:bg-silver-300'
          }`}
        >
          Iteration
        </button>
      </div>

      {/* Shared map params */}
      <div class="flex flex-wrap gap-4 items-end">
        <For each={Object.keys(map.defaultParams)}>
          {(key) => (
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-medium">{key}</span>
              <input
                type="number"
                step="0.01"
                value={mapParams()[key]}
                onInput={(e) => {
                  const v = parseFloat(e.currentTarget.value)
                  if (!isNaN(v)) setMapParams((prev) => ({ ...prev, [key]: v }))
                }}
                class="w-24 border border-silver-300 rounded px-2 py-1 text-sm"
              />
            </label>
          )}
        </For>
      </div>

      {/* Bifurcation view */}
      <Show when={view() === 'bifurcation'}>
        <div class="space-y-4">
          {/* Bifurcation controls */}
          <div class="flex flex-wrap gap-4 items-end text-sm">
            <label class="flex flex-col gap-1">
              <span class="font-medium">param min</span>
              <input
                type="number"
                step="0.001"
                value={paramMin()}
                onInput={(e) => {
                  const v = parseFloat(e.currentTarget.value)
                  if (!isNaN(v)) setParamMin(v)
                }}
                class="w-28 border border-silver-300 rounded px-2 py-1"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-medium">param max</span>
              <input
                type="number"
                step="0.001"
                value={paramMax()}
                onInput={(e) => {
                  const v = parseFloat(e.currentTarget.value)
                  if (!isNaN(v)) setParamMax(v)
                }}
                class="w-28 border border-silver-300 rounded px-2 py-1"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-medium">dParam</span>
              <input
                type="number"
                step="0.00001"
                value={dParam()}
                onInput={(e) => {
                  const v = parseFloat(e.currentTarget.value)
                  if (!isNaN(v)) setDParam(v)
                }}
                class="w-28 border border-silver-300 rounded px-2 py-1"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-medium">N</span>
              <input
                type="number"
                step="100"
                value={N()}
                onInput={(e) => {
                  const v = parseInt(e.currentTarget.value, 10)
                  if (!isNaN(v)) setN(v)
                }}
                class="w-24 border border-silver-300 rounded px-2 py-1"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-medium">y min</span>
              <input
                type="number"
                step="0.1"
                value={plotYMin()}
                onInput={(e) => {
                  const v = parseFloat(e.currentTarget.value)
                  if (!isNaN(v)) setPlotYMin(v)
                }}
                class="w-24 border border-silver-300 rounded px-2 py-1"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-medium">y max</span>
              <input
                type="number"
                step="0.1"
                value={plotYMax()}
                onInput={(e) => {
                  const v = parseFloat(e.currentTarget.value)
                  if (!isNaN(v)) setPlotYMax(v)
                }}
                class="w-24 border border-silver-300 rounded px-2 py-1"
              />
            </label>
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                checked={plotX()}
                onChange={(e) => setPlotX(e.currentTarget.checked)}
              />
              <span>plot x</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                checked={plotY()}
                onChange={(e) => setPlotY(e.currentTarget.checked)}
              />
              <span>plot y</span>
            </label>
          </div>

          {/* Period-doubling table */}
          <Show when={sortedPeriods().length > 0}>
            <div class="text-sm">
              <span class="font-medium">Period doublings: </span>
              <span class="text-silver-600">
                {sortedPeriods()
                  .map(([period, a]) => `${period} @ ${a.toFixed(5)}`)
                  .join('  \u2022  ')}
              </span>
            </div>
          </Show>

          {/* Bifurcation sketch + export */}
          <div
            ref={bifurcationExportRef}
            class="p-3 bg-silver-100 border border-silver-300 rounded-lg shadow-sm"
          >
            <div class="mb-2 flex items-start justify-between gap-3">
              <h3 class="text-base font-semibold text-silver-900">
                {map.name} Bifurcation
              </h3>
              <CanvasExportButton
                getElement={() => bifurcationExportRef}
                getCanvas={() => bifurcationCanvas}
                title={`${map.name} Bifurcation`}
                fileName={`${mapSlug}-bifurcation`}
                ignoreInExport
                class="px-3 py-1.5 rounded bg-grass-700 text-white text-sm font-medium hover:bg-grass-800 transition-colors shadow-sm"
              />
            </div>
            <div class="overflow-x-auto">
              <P5Plot
                mount={(el) => {
                  bifHandle = mountBifurcation(el, map, {
                    paramMin: paramMin(),
                    paramMax: paramMax(),
                    dParam: dParam(),
                    N: N(),
                    plotYMin: plotYMin(),
                    plotYMax: plotYMax(),
                    plotX: plotX(),
                    plotY: plotY(),
                    params: mapParams(),
                  })
                  setPeriodDoublings(new Map(bifHandle.getPeriodDoublings()))
                  return bifHandle
                }}
                onCanvas={(canvas) => {
                  bifurcationCanvas = canvas
                }}
              />
            </div>
          </div>
        </div>
      </Show>

      {/* Iteration view */}
      <Show when={view() === 'iteration'}>
        <div class="space-y-4">
          {/* Iteration controls */}
          <div class="flex flex-wrap gap-4 items-end text-sm">
            <label class="flex flex-col gap-1">
              <span class="font-medium">speed</span>
              <input
                type="number"
                min="1"
                max="50"
                step="1"
                value={iterSpeed()}
                onInput={(e) => {
                  const v = parseInt(e.currentTarget.value, 10)
                  if (!isNaN(v) && v > 0) setIterSpeed(v)
                }}
                class="w-20 border border-silver-300 rounded px-2 py-1"
              />
            </label>
            <button
              onClick={() => {
                if (!iterHandle || iterState().waiting) return
                if (iterState().isRunning) {
                  iterHandle.pause()
                } else {
                  iterHandle.resume(true)
                }
                setIterState({ ...iterHandle.getState() })
              }}
              disabled={iterState().waiting}
              class="px-3 py-1.5 bg-grass-700 hover:bg-grass-800 disabled:bg-silver-300 disabled:text-silver-500 text-white rounded text-sm font-medium transition-colors"
            >
              {iterState().isRunning ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={() => iterHandle?.reset()}
              class="px-3 py-1.5 bg-silver-200 hover:bg-silver-300 text-silver-800 rounded text-sm font-medium transition-colors"
            >
              Reset
            </button>
            <Show
              when={!iterState().waiting && iterState().playbackStep !== null}
            >
              <button
                onClick={() => {
                  if (!iterHandle) return
                  iterHandle.setPlaybackStep(null)
                  setIterState({ ...iterHandle.getState() })
                }}
                class="px-3 py-1.5 bg-silver-200 hover:bg-silver-300 text-silver-800 rounded text-sm font-medium transition-colors"
              >
                Live
              </button>
            </Show>
          </div>

          {/* State display */}
          <Show when={!iterState().waiting}>
            <div class="text-sm text-silver-700 font-mono space-y-0.5">
              <div>
                IC: ({iterState().icX.toFixed(4)}, {iterState().icY.toFixed(4)})
              </div>
              <div>
                step: {iterState().step}/{iterState().maxStep} &nbsp;|&nbsp; x:{' '}
                {iterState().x.toFixed(6)} &nbsp;|&nbsp; y:{' '}
                {iterState().y.toFixed(6)}
              </div>
              <div>
                mode:{' '}
                {iterState().isRunning
                  ? 'running'
                  : iterState().playbackStep === null
                    ? 'paused'
                    : 'paused (time travel)'}
              </div>
              <div>
                period:{' '}
                {iterState().detectedPeriod === null
                  ? 'detecting…'
                  : iterState().detectedPeriod === 0
                    ? 'chaotic / none'
                    : String(iterState().detectedPeriod)}
              </div>
            </div>
          </Show>

          <Show when={!iterState().waiting && iterState().maxStep > 0}>
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs text-silver-600 font-medium">
                <span>timeline</span>
                <span>
                  step {iterState().step} of {iterState().maxStep}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={iterState().maxStep}
                step="1"
                value={iterState().step}
                onInput={(e) => {
                  const v = parseInt(e.currentTarget.value, 10)
                  if (isNaN(v) || !iterHandle) return
                  if (iterState().isRunning) {
                    iterHandle.pause()
                  }
                  iterHandle.setPlaybackStep(v)
                  setIterState({ ...iterHandle.getState() })
                }}
                class="w-full accent-grass-700"
              />
            </div>
          </Show>

          {/* Iteration sketch + export */}
          <div
            ref={iterationExportRef}
            class="p-3 bg-silver-100 border border-silver-300 rounded-lg shadow-sm"
          >
            <div class="mb-2 flex items-start justify-between gap-3">
              <h3 class="text-base font-semibold text-silver-900">
                {map.name} Iteration
              </h3>
              <CanvasExportButton
                getElement={() => iterationExportRef}
                getCanvas={() => iterationCanvas}
                title={`${map.name} Iteration`}
                fileName={`${mapSlug}-iteration`}
                beforeExport={() => {
                  resumeIterationAfterExport = iterHandle?.pause() ?? false
                }}
                afterExport={() => {
                  iterHandle?.resume(resumeIterationAfterExport)
                  resumeIterationAfterExport = false
                }}
                ignoreInExport
                class="px-3 py-1.5 rounded bg-grass-700 text-white text-sm font-medium hover:bg-grass-800 transition-colors shadow-sm"
              />
            </div>
            <div class="overflow-x-auto">
              <P5Plot
                mount={(el) => {
                  iterHandle = mountIteration(el, map, {
                    speed: iterSpeed(),
                    params: mapParams(),
                  })
                  iterHandle.onStateChange(() => {
                    setIterState({ ...iterHandle!.getState() })
                  })
                  setIterState({ ...iterHandle.getState() })
                  return iterHandle
                }}
                onCanvas={(canvas) => {
                  iterationCanvas = canvas
                }}
              />
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
