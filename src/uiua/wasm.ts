// wasm-bindgen generates this module from our Rust code in core/src/lib.rs
// - Default export (initWasm): async function that loads & instantiates the .wasm binary
// - Named export (run_algo): our Rust function exposed via #[wasm_bindgen]
import initWasm, { run_algo } from '../pkg/chaos_engine'

// Module-level state: ES modules are singletons, so this is shared
// across all components that import from this file
let initialized = false

/** Initialize the Uiua wasm module. Safe to call multiple times. */
export async function init(): Promise<void> {
  if (initialized) return
  await initWasm()
  initialized = true
}

/** Run Uiua code and return the result as a Float64Array */
export function run(code: string, r = 0, x = 0): Float64Array {
  const result = run_algo(code, r, x)
  if (import.meta.env.DEV) {
    console.debug('Uiua:', {
      code: code.trim().split('\n').pop(),
      r,
      x,
      result,
    })
  }
  return result
}
