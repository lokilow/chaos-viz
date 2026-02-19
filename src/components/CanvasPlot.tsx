import { createEffect } from 'solid-js'

export type Bounds = {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export type Plot = {
  toX: (x: number) => number
  toY: (y: number) => number
  width: number
  height: number
  bounds: Bounds
}

type CanvasPlotProps = {
  width: number
  height: number
  bounds: Bounds
  background?: string
  axes?: boolean
  axisLabels?: { x: string; y: string }
  grid?: { x: number; y: number } | false
  run: (ctx: CanvasRenderingContext2D, plot: Plot) => void
  onClick?: (mathX: number, mathY: number) => void
  class?: string
}

export default function CanvasPlot(props: CanvasPlotProps) {
  let canvasRef: HTMLCanvasElement | undefined

  const render = () => {
    const canvas = canvasRef
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height, bounds } = props

    // High-DPI Scaling
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.resetTransform()
    ctx.scale(dpr, dpr)

    // Coordinate transforms
    const toX = (x: number) =>
      ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * width
    const toY = (y: number) =>
      height - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * height

    const plot: Plot = { toX, toY, width, height, bounds }

    // Clear / background
    ctx.clearRect(0, 0, width, height)
    if (props.background) {
      ctx.fillStyle = props.background
      ctx.fillRect(0, 0, width, height)
    }

    // Grid
    if (props.grid) {
      ctx.strokeStyle = '#e7e5e4'
      ctx.lineWidth = 1

      // Vertical grid lines
      const xStart = Math.ceil(bounds.xMin / props.grid.x) * props.grid.x
      for (let x = xStart; x <= bounds.xMax; x += props.grid.x) {
        const px = toX(x)
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, height)
        ctx.stroke()
      }

      // Horizontal grid lines
      const yStart = Math.ceil(bounds.yMin / props.grid.y) * props.grid.y
      for (let y = yStart; y <= bounds.yMax; y += props.grid.y) {
        const py = toY(y)
        ctx.beginPath()
        ctx.moveTo(0, py)
        ctx.lineTo(width, py)
        ctx.stroke()
      }
    }

    // Axes
    if (props.axes) {
      ctx.strokeStyle = '#78716c'
      ctx.lineWidth = 2

      // X axis (y=0) if in bounds
      if (bounds.yMin <= 0 && bounds.yMax >= 0) {
        const y0 = toY(0)
        ctx.beginPath()
        ctx.moveTo(0, y0)
        ctx.lineTo(width, y0)
        ctx.stroke()
      }

      // Y axis (x=0) if in bounds
      if (bounds.xMin <= 0 && bounds.xMax >= 0) {
        const x0 = toX(0)
        ctx.beginPath()
        ctx.moveTo(x0, 0)
        ctx.lineTo(x0, height)
        ctx.stroke()
      }

      // Axis labels
      if (props.grid) {
        ctx.fillStyle = '#78716c'
        ctx.font = '11px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'

        const y0 = toY(0)
        const x0 = toX(0)

        // Format number to avoid floating point ugliness
        const fmt = (n: number) => {
          const rounded = Math.round(n * 1e10) / 1e10
          return String(rounded)
        }

        // X axis labels
        const xStart = Math.ceil(bounds.xMin / props.grid.x) * props.grid.x
        for (let x = xStart; x <= bounds.xMax; x += props.grid.x) {
          if (Math.abs(x) < 1e-10) continue
          const px = toX(x)
          ctx.fillText(fmt(x), px, y0 + 6)
        }

        // Y axis labels
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        const yStart = Math.ceil(bounds.yMin / props.grid.y) * props.grid.y
        for (let y = yStart; y <= bounds.yMax; y += props.grid.y) {
          if (Math.abs(y) < 1e-10) continue
          const py = toY(y)
          ctx.fillText(fmt(y), x0 - 6, py)
        }
      }

      // Axis arrows
      const arrowSize = 8
      ctx.fillStyle = '#78716c'

      // X axis arrow (right)
      if (bounds.yMin <= 0 && bounds.yMax >= 0) {
        const y0 = toY(0)
        ctx.beginPath()
        ctx.moveTo(width, y0)
        ctx.lineTo(width - arrowSize, y0 - arrowSize / 2)
        ctx.lineTo(width - arrowSize, y0 + arrowSize / 2)
        ctx.closePath()
        ctx.fill()
      }

      // Y axis arrow (up)
      if (bounds.xMin <= 0 && bounds.xMax >= 0) {
        const x0 = toX(0)
        ctx.beginPath()
        ctx.moveTo(x0, 0)
        ctx.lineTo(x0 - arrowSize / 2, arrowSize)
        ctx.lineTo(x0 + arrowSize / 2, arrowSize)
        ctx.closePath()
        ctx.fill()
      }

      // Axis labels
      if (props.axisLabels) {
        ctx.fillStyle = '#57534e'
        ctx.font = '13px monospace'

        // X axis label (bottom right)
        if (bounds.yMin <= 0 && bounds.yMax >= 0) {
          ctx.textAlign = 'right'
          ctx.textBaseline = 'top'
          ctx.fillText(props.axisLabels.x, width - 4, toY(0) + 8)
        }

        // Y axis label (top left)
        if (bounds.xMin <= 0 && bounds.xMax >= 0) {
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          ctx.fillText(props.axisLabels.y, toX(0) + 8, 4)
        }
      }
    }

    // User drawing
    ctx.save()
    props.run(ctx, plot)
    ctx.restore()
  }

  createEffect(() => {
    // Subscribe to all props
    props.run
    props.width
    props.height
    props.bounds
    props.axes
    props.axisLabels
    props.grid
    props.background
    render()
  })

  const handleClick = (e: MouseEvent) => {
    if (!props.onClick || !canvasRef) return
    const rect = canvasRef.getBoundingClientRect()
    const { bounds, width, height } = props
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const mathX = bounds.xMin + (px / width) * (bounds.xMax - bounds.xMin)
    const mathY = bounds.yMax - (py / height) * (bounds.yMax - bounds.yMin)
    props.onClick(mathX, mathY)
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${props.width}px`,
        height: `${props.height}px`,
        cursor: props.onClick ? 'crosshair' : undefined,
      }}
      class={props.class}
      onClick={handleClick}
    />
  )
}
