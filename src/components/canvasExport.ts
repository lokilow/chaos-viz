/**
 * Canvas-only export helper.
 *
 * Use this when a view only has a raw `<canvas>` reference.
 * For page-faithful exports of composed UI (title, equation, controls, canvas),
 * prefer `exportElementAsPng` from `domExport.ts`.
 */
export type ExportMeta = {
  label: string
  value: string
}

export type CanvasExportOptions = {
  title: string
  subtitle?: string
  metadata?: ExportMeta[]
  fileName?: string
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function dateStamp() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${yyyy}${mm}${dd}-${hh}${min}`
}

export function exportCanvasAsPng(
  source: HTMLCanvasElement,
  options: CanvasExportOptions
) {
  if (source.width === 0 || source.height === 0) return

  const cssWidth = source.clientWidth || source.width
  const dpr = Math.max(1, source.width / cssWidth)
  const pad = Math.round(20 * dpr)
  const gap = Math.round(10 * dpr)
  const titleSize = Math.round(22 * dpr)
  const subtitleSize = Math.round(14 * dpr)
  const metaSize = Math.round(13 * dpr)

  const hasSubtitle = !!options.subtitle
  const hasMeta = !!options.metadata?.length

  let headerHeight = pad + titleSize + pad
  if (hasSubtitle) headerHeight += subtitleSize + gap
  if (hasMeta) headerHeight += metaSize + gap

  const out = document.createElement('canvas')
  out.width = source.width + pad * 2
  out.height = source.height + headerHeight + pad

  const ctx = out.getContext('2d')
  if (!ctx) return

  // Compose a presentation card around the plot canvas.
  ctx.fillStyle = '#f5f5f4'
  ctx.fillRect(0, 0, out.width, out.height)

  // title
  let y = pad + titleSize
  ctx.fillStyle = '#1c1917'
  ctx.font = `${titleSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(options.title, pad, y)

  // subtitle
  if (hasSubtitle && options.subtitle) {
    y += gap + subtitleSize
    ctx.fillStyle = '#57534e'
    ctx.font = `${subtitleSize}px ui-monospace, SFMono-Regular, Menlo, monospace`
    ctx.fillText(options.subtitle, pad, y)
  }

  // metadata row
  if (hasMeta && options.metadata) {
    y += gap + metaSize
    ctx.fillStyle = '#44403c'
    ctx.font = `${metaSize}px ui-monospace, SFMono-Regular, Menlo, monospace`
    const meta = options.metadata
      .map((m) => `${m.label}: ${m.value}`)
      .join('   •   ')
    ctx.fillText(meta, pad, y)
  }

  // plot area
  const plotTop = headerHeight
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(pad, plotTop, source.width, source.height)
  ctx.drawImage(source, pad, plotTop, source.width, source.height)

  // subtle border around plot
  ctx.strokeStyle = '#d6d3d1'
  ctx.lineWidth = Math.max(1, Math.round(1 * dpr))
  ctx.strokeRect(
    pad + ctx.lineWidth / 2,
    plotTop + ctx.lineWidth / 2,
    source.width - ctx.lineWidth,
    source.height - ctx.lineWidth
  )

  const base = options.fileName ?? (slugify(options.title) || 'plot')
  const fileName = `${base}-${dateStamp()}.png`
  const url = out.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
}
