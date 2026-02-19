# Uiua Workflow Guide

This guide explains how this project uses Uiua, why we use it this way, and how to contribute new Uiua-powered visualizations without fighting stack plumbing.

The short version:

1. Uiua is the math kernel.
2. TypeScript is the orchestration and rendering layer.
3. Keep Uiua functions small, pure, and explicit about stack signatures.
4. Prefer stateful iteration patterns (`⍥`, `∧`, `\`) over clever partial-application tricks.

## Why Uiua in this project

Chaos visualization is mostly array math. Uiua is a good fit because:

1. It is concise for vectorized transforms.
2. It makes iteration and shape operations first-class.
3. It keeps mathematical intent close to the code.

The project architecture intentionally separates concerns:

1. `uiua-modules/*.ua`: math kernels (pure transforms that produce numeric arrays).
2. `src/uiua/functions.ts`: typed TS wrappers for Uiua kernels.
3. `src/uiua/wasm.ts`: runtime bridge (`run()` prepends prelude + strips imports).
4. `core/src/lib.rs`: executes Uiua safely in Wasm and returns flat numeric data.
5. `src/components/*`: drawing and UI interaction.

This separation keeps Uiua focused on computation and keeps rendering logic in JS/Canvas where it belongs.

## Shared code strategy (`prelude.ua`)

Your `prelude.ua` approach is good for this app architecture.

You currently share utilities through:

1. Explicit imports in Uiua modules (`~ "prelude.ua" ~ ...`) for local CLI/tooling use.
2. Runtime prelude injection in `src/uiua/wasm.ts` for browser/Wasm execution.

Why this dual approach is useful:

1. Modules can still be run and type-checked in normal Uiua tooling.
2. Browser runtime does not rely on file system/module loading.
3. Shared helpers (`ToPlotData`, `Domain`) stay centralized.

Recommendation:

1. Keep `prelude.ua` small and stable.
2. Put only broadly shared, shape-stable helpers there.
3. Keep domain-specific math (e.g., cobweb internals) in dedicated modules.

## Data contract used by the app

Most plot functions return interleaved coordinates:

`[x0, y0, x1, y1, x2, y2, ...]`

That contract is important because:

1. Canvas drawing loops in TS are simple and fast.
2. The bridge code (`run`) just moves raw numeric arrays.
3. Different visualizations can share the same draw loop shape.

`ToPlotData` in `uiua-modules/prelude.ua` standardizes this conversion.

## Core style rules for Uiua modules

Use these rules when adding or refactoring a `.ua` module:

1. Declare stack signatures in comments at each public function.
2. Keep one conceptual unit per function (map step, orbit, path builder).
3. Keep modules pure: no side effects, no system calls.
4. Make shape intent explicit (slices, joins, transposes).
5. Favor readability over point-free cleverness.
6. Use `|N` signatures to make intent and errors obvious.
7. Keep output contract stable and documented.

## The key pattern: keep parameters in loop state

The most common trap is trying to "save a partially applied function" and then iterate it.

In this codebase, a more reliable pattern is:

1. Keep static parameters (like `r` in the logistic map) in loop state.
2. Use `⍥` repeat (or `∧`/`\`) to evolve the dynamic state (`x`).
3. Let repeat collect the evolving outputs.

This avoids brittle stack choreography and makes signatures easier to reason about.

## Cobweb example (reference implementation)

See `uiua-modules/cobweb.ua`.

```uiua
# Cobweb diagram path for the logistic map
~ "prelude.ua" ~ ToPlotData

# Logistic: r x -> f(x) = r*x*(1-x)
Logistic ← ××(⤙⊙¬)

# Orbit: steps r x0 -> [x0, x1, ..., x_{steps-1}]
# Keep r as persistent loop state and collect x values each repeat.
Orbit ← |3 ⍥(⊸⟜Logistic)

# CobwebPath: steps r x0 -> interleaved [px0,py0, px1,py1, ...]
# Path visits: (x0,0) -> (x0,x1) -> (x1,x1) -> (x1,x2) -> ...
CobwebPath ← |3 (
  Orbit
  # left = all but last, right = all but first
  ⊃(↘¯1|↘1)
  ⊃( # Xs: [left0 left0 left1 left1 ... right_last]
    ⊂⊃(♭⍉˜⊟⊃(⊙◌|⊙◌)|⊣⋅∘)
  | # Ys: [0 right0 right0 right1 right1 ...]
    ⊂0♭⍉˜⊟⊃(⋅∘|⋅∘)
  )
  ToPlotData ⊟
)
```

### Why this specific shape works

1. `Orbit` yields the scalar sequence `x0, x1, ...`.
2. Cobweb needs alternating vertical/horizontal path segments.
3. Splitting into `left` and `right` gives adjacent pairs `(xi, xi+1)`.
4. `Xs` duplicates each `left` value (vertical then horizontal) and appends the last `x`.
5. `Ys` starts with `0`, then duplicates each `right` value.
6. `ToPlotData` interleaves `Xs` and `Ys` for Canvas.

## TS bridge expectations (important)

The TS wrapper should own user-input normalization and call the Uiua function with clean values.

Example from `src/uiua/functions.ts`:

```ts
export function cobweb(r: number, x0: number, iterations = 50): Float64Array {
  const safeIterations = Math.max(1, Math.floor(iterations))
  const steps = safeIterations + 1
  return run(`${cobwebCode}\nCobwebPath ${steps} ${uiuaNum(r)} ${uiuaNum(x0)}`)
}
```

Two important details:

1. `steps = iterations + 1` because the orbit includes `x0`.
2. `uiuaNum` converts JS negatives to Uiua's `¯` notation.

## Contributor workflow

Use this process for new Uiua functions:

1. Define the output contract first (shape + ordering).
2. Write minimal helper functions (`Step`, `Orbit`, `Path`, etc.).
3. Add signature comments (`a b -> c`) for each helper/public function.
4. Validate module compile:
   `uiua check uiua-modules/<module>.ua`
5. Prototype confusing stack pieces with tiny evals:
   `uiua eval '<expr>'`
6. Add/adjust TS wrapper in `src/uiua/functions.ts`.
7. Run full project build.

## Interactive development without cache clutter

### Why nested `uiua-modules` folders appeared

Uiua stores module cache under `uiua-modules/cache` relative to the current working directory.

If you run commands from nested directories (like `uiua-modules/` or `core/`), Uiua may create:

1. `uiua-modules/uiua-modules/...`
2. `core/uiua-modules/...`

These are generated cache artifacts, not source structure.

### Practical workflow

1. Run Uiua commands from repo root whenever possible.
2. Use:
   `bun run uiua:check`
3. Clean cache from root with:
   `bun run uiua:clean-cache`
4. For interactive evaluation that mirrors browser behavior, use:
   `bun run uiua:eval -- uiua-modules/cobweb.ua "CobwebPath 51 3.7 0.2"`

`uiua:eval` strips imports and prepends `prelude.ua`, matching `src/uiua/wasm.ts` behavior.

## Keeping `uiua_primitive_defs.rs` current

If you want to track `docs/reference/uiua/uiua_primitive_defs.rs`, treat it as a synced reference file, not handwritten source.

This repo now includes:

1. `scripts/sync-uiua-primitive-defs.sh`
2. `bun run uiua:sync-defs`
3. `bun run uiua:sync-defs-if-needed`

What it does:

1. Reads `uiua_parser` version from `core/Cargo.lock`.
2. Locates local Cargo registry source for that exact version.
3. Copies `defs.rs` into `docs/reference/uiua/uiua_primitive_defs.rs` with a generated header.

This keeps your local doc mirror aligned with the exact Uiua version your Rust/Wasm core uses.
The `build:wasm` script runs the `--if-needed` sync automatically, so version bumps in `core/Cargo.lock` are picked up on build.

## Debugging tips

When Uiua feels opaque:

1. Reduce to a tiny expression in `uiua eval`.
2. Inspect primitive docs locally:
   `uiua doc ⍥`
   `uiua doc ∧`
   `uiua doc \`
3. Verify shapes at each transform step.
4. Keep an eye on signature warnings from `|N`.

Common symptoms:

1. Wrong point count usually means an off-by-one in orbit/steps.
2. Zig-zag path wrong usually means `left/right` split or duplication order is wrong.
3. Empty arrays often mean stack order mismatch earlier in the function.

## Anti-patterns to avoid

1. Building giant one-liners before validating intermediate arrays.
2. Overusing stack-manipulation combinators when direct iteration is clearer.
3. Letting TS infer semantics that should be explicit in Uiua signatures.
4. Returning ambiguous shapes from Uiua functions.

## How to think about future modules

For bifurcation, fractals, attractors, and similar additions:

1. Keep Uiua as "compute arrays only."
2. Keep TS/Canvas as "render arrays only."
3. Build from small shape-preserving primitives.
4. Make input normalization and defaults explicit in wrappers.
5. Preserve stable data contracts so rendering code stays simple.

If you follow this pattern, contributors can reason locally:

1. "What does this Uiua function consume and produce?"
2. "How does TS normalize inputs and call it?"
3. "How does Canvas consume the returned array?"

That clarity is the primary reason this architecture scales.
