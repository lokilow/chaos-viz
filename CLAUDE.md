Please read the @README.md.

I am essentially building a **"Computational Laboratory"** for the math course. We are using SolidJS for components and reactivity, and Uiua/Wasm for the computational engine. The goal with using **Uiua** as the computational engine via Wasm is a deliberate choice to force myself to understand the vector math deeply.

Here is a roadmap that maps the syllabus specifically to the visualization tools you will need.

### Part 1: The Syllabus-to-Visualization Map

Your syllabus requires three distinct "Rendering Modes." Do not try to force them all into one library.

| Course Topic                                       | Mathematical Nature                                                                 | Recommended Viz Tool                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **1. 1D Maps & Stability** (Logistic Map, Cobwebs) | **Geometric Paths:** Lines, Parabolas, and "Staircases" bouncing between functions. | **Raw Canvas 2D** (Best for custom geometry like cobwebs)        |
| **2. Bifurcation & Chaos** (Feigenbaum constants)  | **Massive Scatter Plots:** Millions of points ( vs ) showing density.               | **uPlot** (It handles high-density pixel rendering perfectly)    |
| **3. Fractals** (Mandelbrot/Julia)                 | **Pixel Fields:** Every pixel is a calculated value. Not a "chart."                 | **Canvas `putImageData**` (Feed a byte array directly from Uiua) |
| **4. Attractors** (Lorenz/Rossler)                 | **3D Trajectories:** A line moving in 3D space ().                                  | **Canvas 2D (Projection)** or **Three.js**                       |

---

### Part 2: The "Cobweb" Application Guide (Lesson 1)

For the first few weeks (1D Maps), you need a specific setup. You are analyzing the iteration .

#### The Architecture: "The Uiua Reactor"

Instead of writing math in JavaScript, treat Uiua as your **"Physics Engine."**

1. **SolidJS Signal:** Holds the state (`r`, `x0`).
2. **Uiua Wasm:** Receives state, returns **Arrays** of coordinates.
3. **Canvas:** Draws the arrays.

#### Step-by-Step Implementation Plan

**1. The Uiua Kernel (The "Backend")**
Write a Uiua function that generates the "Cobweb Path." A cobweb diagram is just a list of line segments:

_Notice the pattern? Vertical move to the curve, Horizontal move to the diagonal._

**Uiua Concept (Mental Draft):**
You will likely want a function that takes `r`, `x0`, and `iterations`, and outputs a flat array of coordinates `[x0, 0, x0, x1, x1, x1, x1, x2...]` that you can feed directly to a Canvas `path`.

**2. The Visualization (SolidJS + Canvas)**
Don't use `uPlot` for the Cobweb itself—it's too restrictive for this specific "zigzag" geometry. Use a raw `<canvas>` element wrapped in a Solid component.

- **Layer 1 (Background):** Draw the static elements once.
- The Diagonal Line ().
- The Parabola (). _Generate 100 points in Uiua and draw a line through them._

- **Layer 2 (Foreground):** The "Live" Cobweb.
- This redraws every time your SolidJS signal `r` changes.

**3. The Bifurcation Diagram (The "Big Data" View)**
Later in this module, you will plot the famous Bifurcation Diagram.

- **Challenge:** You need to plot ~500 iterations for _every_ pixel of width on your screen. That’s ~500,000 points.
- **Solution:** This is where you switch to **uPlot**.
- Have Uiua generate the massive X/Y arrays.
- Pass them to `uPlot` in `mode: 2` (scatter).
- _Performance Tip:_ Uiua is fast, but transferring 1MB of data from Wasm to JS every frame is slow. Only recalculate this when the user releases the slider (on `change`, not `input`).

---

### Part 3: Architecture for the Future (Fractals & Attractors)

As you move to **Topics 4 & 7**, your app needs to evolve.

#### For Fractals (Topic 4)

When you reach the Mandelbrot set, `uPlot` and `Canvas paths` become useless.

- **Strategy:** "The Texture Blaster."
- **How:**

1. Uiua calculates the fractal. It returns a `Uint8Array` representing RGBA values for every pixel (e.g., 500x500 image = 1,000,000 bytes).
2. JavaScript wraps this memory in `new ImageData()`.
3. Canvas calls `ctx.putImageData()`.

- _Note:_ Uiua is an array language, so it is mathematically perfect for generating fractals. It might be slower than a GPU shader, but for 500px images, it will likely be fast enough to feel interactive.

#### For The Lorenz Attractor (Topic 7)

This is a 3D system ().

- **Strategy:** "The 2D Projection."
- **Math:** Since you want to learn Linear Algebra, **do not use Three.js**. Use Uiua to multiply the 3D points by a Rotation Matrix to flatten them into 2D ().
- **Viz:** Draw the flattened result as a simple path on your existing 2D Canvas. This connects your Chaos studies back to your Matrix studies!

### Summary: Your "Next Step" Checklist

1. **Set up the Repo:** Initialize SolidJS + Tailwind.
2. **Install Uiua:** Get the `uiua` wasm package running so you can call a simple function (e.g., `Add(1, 2)`) from Javascript.
3. **Build "The Canvas Component":** Create a generic `<CanvasPlot width={800} height={600} draw={fn} />` component in Solid that accepts a draw function.
4. **Implement Lesson 1:**

- Uiua: Write `Logistic(r, x)`
- JS: Call it, get points.
- Canvas: `ctx.moveTo(x0, 0); ctx.lineTo(x0, x1); ...`

Begin each session by saying "Ready to Rock n Roll" so I know you have read these instructions.
