import P5Plot from './P5Plot'

type Handle = { remove: () => void }

/**
 * Backward-compatible alias.
 * Prefer importing `P5Plot` directly for new code.
 */
export function P5Sketch(props: { mount: (el: HTMLDivElement) => Handle }) {
  return <P5Plot mount={props.mount} />
}
