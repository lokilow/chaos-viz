import { createSignal, createEffect } from 'solid-js'
import { logisticBif } from '../maps/logistic-bif'
import P5Plot from './P5Plot'
import CanvasExportButton from './CanvasExportButton'
import {
  mountBifurcation,
  mountLyapunov,
  type BifurcationHandle,
  type LyapunovHandle,
} from '../sketches/wrap'

export default function LogisticBifurcation() {
  const bd = logisticBif.bifurcationDefaults

  const [paramMin, setParamMin] = createSignal(bd.paramMin)
  const [paramMax, setParamMax] = createSignal(bd.paramMax)
  const [dParam, setDParam] = createSignal(bd.dParam)
  const [N, setN] = createSignal(bd.N)
  const [plotYMin, setPlotYMin] = createSignal(bd.plotYMin)
  const [plotYMax, setPlotYMax] = createSignal(bd.plotYMax)

  let bifHandle: BifurcationHandle | null = null
  let lyapHandle: LyapunovHandle | null = null

  let bifExportRef: HTMLDivElement | undefined
  let bifCanvas: HTMLCanvasElement | undefined
  let lyapExportRef: HTMLDivElement | undefined
  let lyapCanvas: HTMLCanvasElement | undefined

  createEffect(() => {
    if (!bifHandle) return
    bifHandle.update({
      paramMin: paramMin(),
      paramMax: paramMax(),
      dParam: dParam(),
      N: N(),
      plotYMin: plotYMin(),
      plotYMax: plotYMax(),
      plotX: true,
      plotY: false,
    })
    if (lyapHandle) {
      lyapHandle.setData(
        bifHandle.getLyapunovPoints(),
        paramMin(),
        paramMax()
      )
    }
  })

  return (
    <div class="space-y-6">
      {/* Controls */}
      <div class="flex flex-wrap gap-4 items-end text-sm">
        <label class="flex flex-col gap-1">
          <span class="font-medium">a min</span>
          <input
            type="number"
            step="0.1"
            value={paramMin()}
            onInput={(e) => {
              const v = parseFloat(e.currentTarget.value)
              if (!isNaN(v)) setParamMin(v)
            }}
            class="w-24 border border-silver-300 rounded px-2 py-1"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="font-medium">a max</span>
          <input
            type="number"
            step="0.1"
            value={paramMax()}
            onInput={(e) => {
              const v = parseFloat(e.currentTarget.value)
              if (!isNaN(v)) setParamMax(v)
            }}
            class="w-24 border border-silver-300 rounded px-2 py-1"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="font-medium">da</span>
          <input
            type="number"
            step="0.0001"
            value={dParam()}
            onInput={(e) => {
              const v = parseFloat(e.currentTarget.value)
              if (!isNaN(v)) setDParam(v)
            }}
            class="w-28 border border-silver-300 rounded px-2 py-1"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="font-medium">N (iterations)</span>
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
      </div>

      {/* Bifurcation diagram */}
      <div
        ref={bifExportRef}
        class="p-3 bg-silver-100 border border-silver-300 rounded-lg shadow-sm"
      >
        <div class="mb-2 flex items-start justify-between gap-3">
          <h3 class="text-base font-semibold text-silver-900">
            Logistic Map Bifurcation Diagram
          </h3>
          <CanvasExportButton
            getElement={() => bifExportRef}
            getCanvas={() => bifCanvas}
            title="Logistic Bifurcation"
            fileName="logistic-bifurcation"
            ignoreInExport
            class="px-3 py-1.5 rounded bg-grass-700 text-white text-sm font-medium hover:bg-grass-800 transition-colors shadow-sm"
          />
        </div>
        <div class="overflow-x-auto">
          <P5Plot
            mount={(el) => {
              bifHandle = mountBifurcation(el, logisticBif, {
                paramMin: paramMin(),
                paramMax: paramMax(),
                dParam: dParam(),
                N: N(),
                plotYMin: plotYMin(),
                plotYMax: plotYMax(),
                plotX: true,
                plotY: false,
              })
              return bifHandle
            }}
            onCanvas={(canvas) => {
              bifCanvas = canvas
            }}
          />
        </div>
      </div>

      {/* Lyapunov exponent plot */}
      <div
        ref={lyapExportRef}
        class="p-3 bg-silver-100 border border-silver-300 rounded-lg shadow-sm"
      >
        <div class="mb-2 flex items-start justify-between gap-3">
          <h3 class="text-base font-semibold text-silver-900">
            Lyapunov Exponent vs a
          </h3>
          <CanvasExportButton
            getElement={() => lyapExportRef}
            getCanvas={() => lyapCanvas}
            title="Lyapunov Exponent"
            fileName="logistic-lyapunov"
            ignoreInExport
            class="px-3 py-1.5 rounded bg-grass-700 text-white text-sm font-medium hover:bg-grass-800 transition-colors shadow-sm"
          />
        </div>
        <div class="overflow-x-auto">
          <P5Plot
            mount={(el) => {
              const pts = bifHandle?.getLyapunovPoints() ?? []
              lyapHandle = mountLyapunov(el, pts, paramMin(), paramMax())
              return lyapHandle
            }}
            onCanvas={(canvas) => {
              lyapCanvas = canvas
            }}
          />
        </div>
      </div>
    </div>
  )
}
