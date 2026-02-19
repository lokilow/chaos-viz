/**
 * DOM-based PNG export for "what you see is what you get" graph cards.
 *
 * Pipeline:
 * 1. Clone the target element
 * 2. Inline computed styles onto every cloned node
 * 3. Replace cloned `<canvas>` nodes with `<img>` snapshots
 * 4. Remove nodes marked with `data-export-ignore="true"`
 * 5. Render clone via SVG `foreignObject`, then rasterize to PNG
 */
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

function copyComputedStyles(source: HTMLElement, clone: HTMLElement) {
  const sourceEls = [
    source,
    ...Array.from(source.querySelectorAll<HTMLElement>('*')),
  ]
  const cloneEls = [
    clone,
    ...Array.from(clone.querySelectorAll<HTMLElement>('*')),
  ]

  for (let i = 0; i < sourceEls.length; i++) {
    const sourceEl = sourceEls[i]
    const cloneEl = cloneEls[i]
    if (!sourceEl || !cloneEl) continue

    const computed = window.getComputedStyle(sourceEl)
    const style = cloneEl.style
    for (let j = 0; j < computed.length; j++) {
      const prop = computed.item(j)
      style.setProperty(
        prop,
        computed.getPropertyValue(prop),
        computed.getPropertyPriority(prop)
      )
    }
  }
}

function replaceCanvasesWithImages(source: HTMLElement, clone: HTMLElement) {
  const sourceCanvases = Array.from(source.querySelectorAll('canvas'))
  const cloneCanvases = Array.from(clone.querySelectorAll('canvas'))

  sourceCanvases.forEach((sourceCanvas, i) => {
    const cloneCanvas = cloneCanvases[i]
    if (!cloneCanvas) return

    const img = document.createElement('img')
    img.src = sourceCanvas.toDataURL('image/png')
    img.width = sourceCanvas.width
    img.height = sourceCanvas.height
    img.style.width = `${sourceCanvas.clientWidth}px`
    img.style.height = `${sourceCanvas.clientHeight}px`
    img.style.display = window.getComputedStyle(sourceCanvas).display
    cloneCanvas.replaceWith(img)
  })
}

function removeIgnoredNodes(clone: HTMLElement) {
  clone
    .querySelectorAll<HTMLElement>('[data-export-ignore="true"]')
    .forEach((el) => el.remove())
}

function downloadUrl(url: string, fileName: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load export image'))
    img.src = url
  })
}

export type ElementExportOptions = {
  fileName?: string
  scale?: number
  background?: string
}

/**
 * Export an HTMLElement as PNG while preserving current visual layout.
 * This is the default path for plot-card exports.
 */
export async function exportElementAsPng(
  element: HTMLElement,
  options: ElementExportOptions = {}
) {
  if (!element) return
  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const rect = element.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  const scale = Math.max(1, options.scale ?? (window.devicePixelRatio || 1))

  const clone = element.cloneNode(true) as HTMLElement
  copyComputedStyles(element, clone)
  replaceCanvasesWithImages(element, clone)
  removeIgnoredNodes(clone)

  const wrapper = document.createElement('div')
  wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  wrapper.style.width = `${width}px`
  wrapper.style.height = `${height}px`
  wrapper.style.boxSizing = 'border-box'
  wrapper.style.overflow = 'hidden'
  wrapper.style.background =
    options.background ||
    window.getComputedStyle(element).backgroundColor ||
    '#ffffff'
  wrapper.appendChild(clone)

  const serialized = new XMLSerializer().serializeToString(wrapper)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject></svg>`
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(blob)

  try {
    const img = await loadImage(svgUrl)
    const out = document.createElement('canvas')
    out.width = Math.round(width * scale)
    out.height = Math.round(height * scale)
    const ctx = out.getContext('2d')
    if (!ctx) return

    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.fillStyle = options.background || '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    const base = options.fileName ?? (slugify(document.title) || 'plot')
    const fileName = `${base}-${dateStamp()}.png`
    downloadUrl(out.toDataURL('image/png'), fileName)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}
