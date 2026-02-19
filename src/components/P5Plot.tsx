import { createEffect, onCleanup } from 'solid-js'

type P5Handle = { remove: () => void }

type P5PlotProps = {
  /**
   * Mount a p5 sketch into the provided container and return a handle with teardown.
   * Keep this function stable. Use `remountKey` when you intentionally want a remount.
   */
  mount: (el: HTMLDivElement) => P5Handle
  /**
   * Optional key to force full sketch remount (destroy + mount).
   * This is useful when a sketch cannot be updated incrementally.
   */
  remountKey?: unknown
  /**
   * Called with the live canvas after mount, and `undefined` on cleanup.
   * Useful for shared export infrastructure.
   */
  onCanvas?: (canvas: HTMLCanvasElement | undefined) => void
  class?: string
}

/**
 * Lifecycle wrapper for p5 sketches.
 *
 * This aligns p5 usage with the same component-driven lifecycle as CanvasPlot:
 * - mount once by default
 * - clean teardown on unmount
 * - opt-in remount via `remountKey`
 * - optional canvas handoff for export workflows
 */
export default function P5Plot(props: P5PlotProps) {
  let containerRef: HTMLDivElement | undefined
  let handle: P5Handle | undefined

  // Intentionally capture mount once to avoid remounting on every parent rerender.
  const mount = props.mount

  const teardown = () => {
    handle?.remove()
    handle = undefined
  }

  createEffect(() => {
    props.remountKey
    const container = containerRef
    if (!container) return

    teardown()
    container.replaceChildren()
    handle = mount(container)

    queueMicrotask(() => {
      props.onCanvas?.(container.querySelector('canvas') ?? undefined)
    })
  })

  onCleanup(() => {
    teardown()
    props.onCanvas?.(undefined)
  })

  return (
    <div
      ref={(el) => {
        containerRef = el
      }}
      class={props.class}
    />
  )
}
