import { createEffect } from 'solid-js'
import katex from 'katex'
import 'katex/dist/katex.min.css'

type LatexProps = {
  math: string
  display?: boolean
  class?: string
}

export default function Latex(props: LatexProps) {
  let ref: HTMLSpanElement | undefined

  createEffect(() => {
    if (ref) {
      katex.render(props.math, ref, {
        displayMode: props.display ?? false,
        throwOnError: false,
      })
    }
  })

  return <span ref={ref} class={props.class} />
}
