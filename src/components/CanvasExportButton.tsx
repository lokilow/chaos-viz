import { createSignal } from 'solid-js'
import { exportCanvasAsPng, type ExportMeta } from './canvasExport'
import { exportElementAsPng } from './domExport'

/**
 * Shared export button for plots.
 *
 * Export modes:
 * - Preferred: pass `getElement` to export the full rendered card (WYSIWYG)
 * - Fallback: pass `getCanvas` to export only the plot canvas with generated header/meta
 */
type CanvasExportButtonProps = {
  /** Return the canvas when only raw canvas export is needed. */
  getCanvas?: () => HTMLCanvasElement | undefined
  /** Return a container element to export exactly what the user sees. */
  getElement?: () => HTMLElement | undefined
  title: string
  subtitle?: string
  metadata?: ExportMeta[]
  fileName?: string
  /** Marks this button as hidden from DOM-based exports. */
  ignoreInExport?: boolean
  class?: string
}

export default function CanvasExportButton(props: CanvasExportButtonProps) {
  const [exporting, setExporting] = createSignal(false)

  const onExport = async () => {
    if (exporting()) return
    setExporting(true)
    try {
      const element = props.getElement?.()
      if (element) {
        await exportElementAsPng(element, {
          fileName: props.fileName,
        })
        return
      }

      const canvas = props.getCanvas?.()
      if (!canvas) return
      exportCanvasAsPng(canvas, {
        title: props.title,
        subtitle: props.subtitle,
        metadata: props.metadata,
        fileName: props.fileName,
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onExport}
      class={
        props.class ??
        'px-3 py-2 rounded bg-grass-700 text-white text-sm font-medium hover:bg-grass-800 transition-colors'
      }
      disabled={exporting()}
      data-export-ignore={props.ignoreInExport ? 'true' : undefined}
    >
      {exporting() ? 'Exporting…' : 'Export PNG'}
    </button>
  )
}
