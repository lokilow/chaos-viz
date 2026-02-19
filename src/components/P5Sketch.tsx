import { onMount, onCleanup } from 'solid-js'

type Handle = { remove: () => void }

export function P5Sketch(props: { mount: (el: HTMLDivElement) => Handle }) {
  let container!: HTMLDivElement
  onMount(() => {
    const handle = props.mount(container)
    onCleanup(() => handle.remove())
  })
  return <div ref={container} />
}
