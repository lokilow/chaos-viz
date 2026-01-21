// wasm-bindgen generates this module from our Rust code in core/src/lib.rs
// - Default export (initWasm): async function that loads & instantiates the .wasm binary
// - Named export (run_algo): our Rust function exposed via #[wasm_bindgen]
import initWasm, { run_algo } from '../pkg/chaos_engine'

// Uiua prelude: shared utilities automatically in scope for all Uiua code
// (wasm can't access filesystem, so we prepend this to every run)
import prelude from '../../uiua-modules/prelude.ua?raw'

// Module-level state: ES modules are singletons, so this is shared
// across all components that import from this file
let initialized = false

/** Initialize the Uiua wasm module. Safe to call multiple times. */
export async function init(): Promise<void> {
  if (initialized) return
  await initWasm()
  initialized = true
}

/** Strip import lines (wasm can't access filesystem, prelude is prepended instead) */
function stripImports(code: string): string {
  return code
    .split('\n')
    .filter((line) => !line.startsWith('~'))
    .join('\n')
}

/** Run Uiua code and return the result as a Float64Array */
export function run(code: string, r = 0, x = 0): Float64Array {
  const withPrelude = prelude + '\n' + stripImports(code)
  const result = run_algo(withPrelude, r, x)
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
