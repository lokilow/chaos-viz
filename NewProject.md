# Fractal Explorer Project Plan

**Recommendation**

Do not start fully from scratch. Reuse the SolidJS/Vite/Tailwind frontend foundation and some UI patterns from your existing repo, but drop the current Uiua/WASM plumbing. The pieces worth carrying forward are the component style and canvas patterns, and the existing Vite/Tailwind setup. 

To achieve both rapid local iteration and zero-cost public deployment, utilize a **Phased Engine Strategy**. Start with a Julia HTTP server for local development, and eventually implement an Adapter Pattern to swap to a static, browser-native hybrid engine (WebGPU + Rust WASM) for public GitHub Pages deployment. Drop the Elixir/BEAM orchestration layer; it adds unnecessary overhead for a purely mathematical visualizer.

---

## **Architecture**

### Phase 1: Local Development Architecture
A two-process local app optimized for mathematical exploration:
* **Web:** SolidJS + TypeScript + Tailwind (served by Vite)
* **Engine:** Julia HTTP server on `localhost` returning Canvas2D `ImageData` or PNGs.

### Phase 2: Static Deployment Architecture (The Hybrid Engine)
A zero-backend static site optimized for performance and sharing:
* **Web:** SolidJS + TypeScript + Tailwind (hosted on GitHub Pages)
* **Navigation Engine (Zoom < 10^14):** WebGPU Compute Shaders for 60 FPS exploration using hardware 32-bit/64-bit floats.
* **Deep Dive Engine (Zoom >= 10^14):** Pure Rust WASM (using `malachite` for arbitrary-precision math and `rayon` for Web Worker multithreading).

---

## **Product Plan**

**Phase 1: Mandelbrot explorer (Julia Backend)**
* Render the Mandelbrot set for a viewport.
* Support pan, scroll-zoom, drag-zoom rectangle, reset, and home view.
* Show coordinates and current zoom scale.
* Support progressive redraw: low-res preview first, full-res second.
* Make click on a point set the complex parameter `c`.

**Phase 2: Linked Julia pane**
* Split UI into two panes: Mandelbrot on the left, Julia on the right.
* Clicking a point in Mandelbrot updates `c` and rerenders the Julia set.
* Show `c = a + bi` prominently.
* Add a few saved “interesting” `c` presets.

**Phase 3: Julia explorer**
* Julia pane gets its own pan/zoom controls.
* Preserve the selected `c` while exploring the Julia viewport.
* Add “sync reset” and “reset Julia viewport”.

**Phase 4: Usability and performance**
* Tile-based rendering.
* Request cancellation from the frontend (`AbortController`).
* Render queue with stale-request dropping.
* Optional histogram coloring / smooth coloring.
* Saved views, bookmarks, permalinkable URLs.

**Phase 5: The Deep Zoom Path & WASM Migration**
* Implement the `FractalEngine` TypeScript adapter.
* Build the WebGPU shader for standard navigation.
* Build the Rust/WASM engine for arbitrary precision.
* Switchable precision strategy by zoom threshold: Frontend detects zoom level and silently swaps between WebGPU and Rust WASM to prevent pixelation while maximizing framerate.

---

## **Frontend State Model**

Keep state explicit, serializable, and engine-agnostic:

* `mandelbrotViewport`
* `juliaViewport`
* `selectedC`
* `renderSettings`
* `uiState`

Suggested TS shape:

```ts
type Complex = { re: number; im: number }

type Viewport = {
  center: Complex
  spanRe: number
  width: number
  height: number
  maxIter: number
  zoomLevel: number // Crucial for Phase 5 engine swapping
}

type FractalKind = 'mandelbrot' | 'julia'

type RenderRequest = {
  kind: FractalKind
  viewport: Viewport
  juliaC?: Complex
  coloring: 'escape' | 'smooth'
  supersample?: 1 | 2
  tile?: { x: number; y: number; width: number; height: number }
}

// The Adapter Pattern for Phase 2
interface FractalEngine {
  render(request: RenderRequest): Promise<ImageData | Blob>;
}
```

---

## **Backend Contract (Phase 1: Julia)**

Keep the API narrow. Start with three endpoints:
* `POST /api/render`
* `POST /api/preview`
* `GET /api/health`

`/api/render` request:

```json
{
  "kind": "mandelbrot",
  "viewport": {
    "center": { "re": -0.75, "im": 0.0 },
    "spanRe": 3.0,
    "width": 800,
    "height": 600,
    "maxIter": 500,
    "zoomLevel": 1.0
  },
  "coloring": "smooth",
  "supersample": 1
}
```

**Response options:** Start with `image/png` for speed of development, then move to raw RGBA arrays only if profiling says it matters or when transitioning to Web Worker messaging in Phase 5.

---

## **Rendering Engine Choice**

**Recommended v1 render strategy (Local):**
* Julia computes pixels.
* Frontend draws returned PNG image into `<canvas>`.
* On interaction, request a lower-res preview image.
* After 100-150ms of idle, request full-res.
* Cancel old requests with `AbortController` and ignore stale responses with a request id.

**Recommended v2 render strategy (Static Deployment):**
* `VITE_ENGINE=wasm` environment variable injects the WebGPU/Rust adapter.
* Frontend passes the `RenderRequest` object to the active engine instead of the `fetch` API.

---

## **Project Structure**

Reshape the repo to support the eventual multi-engine architecture:

```text
apps/
  web/
    src/
    vite.config.ts
    package.json
services/
  julia-engine/
    Project.toml
    Manifest.toml
    src/
      server.jl
      render.jl
      color.jl
      viewport.jl
  rust-wasm-engine/    <-- (Added in Phase 5)
    Cargo.toml
    src/
      lib.rs
scripts/
  dev
  build
```

---

## **Build / Dev Pipeline**

Make one command start everything for local development. Use a `justfile` or `Makefile`.

* `just setup`
* `just dev`
* `just test`

`just dev` should:
* Start Julia HTTP server on `localhost:4001`
* Start Vite on `localhost:3000`
* Configure Vite proxy `/api -> 4001`

**Suggested dev ergonomics:**
* Vite HMR for frontend.
* `Revise.jl` in Julia so backend code reloads without constant restart.
* Typed API client in TypeScript.
* To solve Julia's "time to first plot" lag, use `PrecompileTools.jl` during the `just dev` boot sequence.

---

## **Deployment Configuration (GitHub Pages)**

When compiling the Phase 5 Rust/WASM engine, you will need to utilize `SharedArrayBuffer` for `rayon` multithreading. 

Ensure your static hosting configuration includes the following headers to satisfy browser security requirements:
* `Cross-Origin-Opener-Policy: same-origin`
* `Cross-Origin-Embedder-Policy: require-corp`

*(Note: If deploying strictly to GitHub Pages, a service worker workaround like `coi-serviceworker` will be required to inject these headers).*

---

## **Decision Summary**

* **Architecture:** Drop Elixir/BEAM. Use a purely static Vite frontend.
* **Execution (Local):** Start with a local Julia HTTP server to quickly dial in the math, UI, and interactions.
* **Execution (Production):** Plan for a Phase 5 migration to a browser-native hybrid engine (WebGPU for speed, pure Rust WASM for deep-zoom precision).
* **Rendering:** Start with Canvas2D + PNG responses. Do not touch WebGL/WebGPU until the UI and state management are flawless.
* **Tooling:** Use `just` for a single-command dev environment that supervises both Vite and Julia.
