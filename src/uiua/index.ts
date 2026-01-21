// Barrel file: re-exports the public API from this module
//
// When you import from a folder (e.g., `import { init } from '../uiua'`),
// TypeScript/bundlers automatically look for an index.ts file in that folder.
// This is similar to how index.html is the default page in a web directory.
//
// Benefits:
// 1. Clean imports - consumers write `from '../uiua'` not `from '../uiua/wasm'`
// 2. Encapsulation - internal files (wasm.ts) stay hidden; we control the public API
// 3. Refactoring - we can reorganize internals without changing consumer imports
//
// Example: if we later split functions.ts into logistic.ts and mandelbrot.ts,
// consumers still just `import { cobweb } from '../uiua'` - no changes needed.

export { init } from './wasm'
export { identity, logisticParabola, cobweb } from './functions'
