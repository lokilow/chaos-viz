# Fractal Explorer Project Plan

**Recommendation**

Do not start fully from scratch. Reuse the SolidJS/Vite/Tailwind frontend foundation and some UI patterns from this repo, but do not reuse the current Uiua/Wasm plumbing for the fractal engine. The pieces worth carrying forward are the component style and canvas patterns in [src/components/JuliaSet.tsx](/Users/lokilow/edu/chaos-viz/src/components/JuliaSet.tsx), [src/components/LogisticMap.tsx](/Users/lokilow/edu/chaos-viz/src/components/LogisticMap.tsx), and the existing Vite/Tailwind setup in [package.json](/Users/lokilow/edu/chaos-viz/package.json) and [vite.config.ts](/Users/lokilow/edu/chaos-viz/vite.config.ts). The fractal renderer itself should be a new Julia service.

**Architecture**

Use a two-process local app:

- `web`: SolidJS + TypeScript + Tailwind
- `engine`: Julia HTTP server on `localhost`

Start simple on rendering:

- `Canvas2D + ImageData` in the browser
- backend returns either raw RGBA bytes or PNG tiles
- no WebGL in v1
- no WebSockets in v1

Why this is the right first step:
- Mandelbrot/Julia are pixel fields, so `putImageData` or drawing image tiles is the natural path.
- Julia can own the heavy math cleanly.
- The frontend stays focused on viewport state, interaction, and presentation.

**Product Plan**

Phase 1: Mandelbrot explorer
- Render the Mandelbrot set for a viewport.
- Support pan, scroll-zoom, drag-zoom rectangle, reset, and home view.
- Show coordinates and current zoom scale.
- Support progressive redraw: low-res preview first, full-res second.
- Make click on a point set the complex parameter `c`.

Phase 2: Linked Julia pane
- Split UI into two panes: Mandelbrot on the left, Julia on the right.
- Clicking a point in Mandelbrot updates `c` and rerenders the Julia set.
- Show `c = a + bi` prominently.
- Add a few saved “interesting” `c` presets.

Phase 3: Julia explorer
- Julia pane gets its own pan/zoom controls.
- Preserve the selected `c` while exploring the Julia viewport.
- Add “sync reset” and “reset Julia viewport”.

Phase 4: usability and performance
- Tile-based rendering.
- Request cancellation from the frontend.
- Render queue with stale-request dropping.
- Optional histogram coloring / smooth coloring.
- Saved views, bookmarks, permalinkable URLs.

Phase 5: deep zoom path
- Higher precision modes in Julia.
- Switchable precision strategy by zoom threshold.
- Add a `zoomLevel` or `pixelScale` parameter to `RenderRequest` so the backend knows when to switch precision modes.
- At extremely deep zooms, standard 64-bit floats lose precision (visible as pixelated blocks). The backend needs to dynamically switch to arbitrary-precision arithmetic (`BigFloat` in Julia) and `zoomLevel` is the signal to incur that performance hit.
- Later: perturbation/reference-orbit techniques if you go truly deep.

**Frontend State Model**

Keep state explicit and serializable:

- `mandelbrotViewport`
- `juliaViewport`
- `selectedC`
- `renderSettings`
- `uiState`

Suggested TS shape:

```ts
type Complex = { re: number; im: number }

type Viewport = {
  center: Complex
  spanRe: number
  width: number
  height: number
  maxIter: number
}

type FractalKind = 'mandelbrot' | 'julia'

type RenderRequest = {
  kind: FractalKind
  viewport: Viewport
  juliaC?: Complex
  coloring: 'escape' | 'smooth'
  supersample?: 1 | 2
  tile?: { x: number; y: number; width: number; height: number }
  // Future (Phase 5): add zoomLevel or pixelScale here so the backend can
  // decide when to switch from Float64 to BigFloat. Standard 64-bit floats
  // lose precision at deep zooms, producing pixelated blocks. The frontend
  // already tracks zoom as a scalar — passing it through keeps the precision
  // strategy entirely in Julia where it belongs.
}
```

This is the contract I’d build around. It is stable, explicit, and language-agnostic.

**Backend Contract**

Keep the API narrow. Start with three endpoints:

- `POST /api/render`
- `POST /api/preview`
- `GET /api/health`

`/api/render` request:

```json
{
  "kind": "mandelbrot",
  "viewport": {
    "center": { "re": -0.75, "im": 0.0 },
    "spanRe": 3.0,
    "width": 800,
    "height": 600,
    "maxIter": 500
  },
  "coloring": "smooth",
  "supersample": 1
}
```

For Julia:

```json
{
  "kind": "julia",
  "viewport": {
    "center": { "re": 0.0, "im": 0.0 },
    "spanRe": 3.0,
    "width": 800,
    "height": 800,
    "maxIter": 500
  },
  "juliaC": { "re": -0.7269, "im": 0.1889 },
  "coloring": "smooth",
  "supersample": 1
}
```

Response options:

1. `image/png`
   Simplest operationally. Easy to display. Good first version.

2. JSON metadata + binary RGBA
   Better if you want full control over palette work in the frontend.

I would start with PNG for speed of development, then move to raw RGBA only if profiling says it matters.

**Rendering Engine Choice**

Start with:
- Julia computes pixels
- frontend draws returned image into `<canvas>`

Do not start with WebGL. It adds shader complexity before you know where the bottleneck is.

Recommended v1 render strategy:
- on interaction, request a lower-res preview image
- after 100-150ms of idle, request full-res
- cancel old requests with `AbortController`
- ignore stale responses with a request id

This will feel much more “live” than trying to brute-force full-res every wheel tick.

**What To Reuse From This Repo**

Reuse:
- Solid/Vite/Tailwind base from [package.json](/Users/lokilow/edu/chaos-viz/package.json)
- canvas component ideas from [src/components/JuliaSet.tsx](/Users/lokilow/edu/chaos-viz/src/components/JuliaSet.tsx)
- parameter control and responsive sizing patterns from [src/components/LogisticMap.tsx](/Users/lokilow/edu/chaos-viz/src/components/LogisticMap.tsx)

Do not reuse:
- Uiua/Wasm bridge
- current fractal math code as the backend core
- any assumptions that the compute engine returns plot points rather than pixels

So: reuse the frontend shell and interaction patterns, but create a new fractal app slice.

**Project Structure**

I’d reshape the repo into something like:

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
scripts/
  dev
  build
```

If you want to keep it simpler, keep the frontend in root and put Julia under `julia-engine/`.

**Build / Dev Pipeline**

To get a Phoenix-like developer experience, make one command start everything.

Use:
- `bun` or `npm` for frontend
- Julia `Pkg` for backend dependencies
- a root `justfile`, `mise.toml`, or `Makefile`
- optionally `overmind`/`foreman` style process management

I’d use a `justfile`. Then dev is:

- `just setup`
- `just dev`
- `just test`

`just dev` should:
- start Julia HTTP server on `localhost:4001`
- start Vite on `localhost:3000`
- configure Vite proxy `/api -> 4001`

That gives you the “one command, two supervised processes” feel you’re used to.

Suggested dev ergonomics:
- Vite HMR for frontend
- `Revise.jl` in Julia so backend code reloads without constant restart
- Vite proxy so the frontend always talks to `/api`
- typed API client in TypeScript generated or handwritten once

**Nice DX Equivalent to Phoenix**

To get close to Phoenix quality, build these in early:

- one command dev boot
- single `.env` or config source for ports
- clear app folders
- typed request/response contract
- request logging on both sides
- saved example views
- screenshot export
- reproducible setup script

Julia-specific tooling I’d use:
- `HTTP.jl`
- `JSON3.jl`
- `StructTypes.jl`
- `Revise.jl`
- possibly `Colors.jl` if you want palette handling in Julia

**First Milestone**

I’d define the first real milestone as:

1. Open app.
2. See Mandelbrot set.
3. Click a point.
4. Julia pane rerenders for that `c`.
5. Pan/zoom independently in both panes.
6. URL stores the current view.

That is the first complete product.

**Decision Summary**

- Start local, not cloud.
- Start with Julia HTTP, not Julia-in-browser.
- Start with Canvas2D, not WebGL.
- Start with PNG/image responses, not sockets.
- Reuse the frontend shell from this repo, but not the current compute backend.
- Use a root process runner so the project feels like one app, not two disconnected tools.
