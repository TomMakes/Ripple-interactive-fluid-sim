# Concepts behind Ripple

This is Stage 1 documentation (per the build plan §10): accurate raw material, not
polished pedagogy. It's written for a strong engineer with no graphics background,
and every section points at real code. A later pass turns this into an interactive
`concepts.html`.

## 1. The frame loop

Browsers repaint the screen roughly 60 times a second. `requestAnimationFrame` is
the browser API for scheduling a callback to run right before the next repaint —
it's how you get smooth, tear-free animation instead of updating the screen at
random, off-beat intervals. PixiJS wraps this in a `Ticker`; we hand it one
callback and it calls that callback once per repaint, forever.

That callback is the entire heartbeat of the toy. Look at [src/main.ts:36-41](src/main.ts#L36-L41):
every tick, it advances the simulation (`sim.step()`), then hands the updated
heights to the renderer (`renderer.render(sim)`). Nothing in this project
animates by tweening between two states — every single frame is a fresh,
complete physics step followed by a fresh, complete recolor of every dot. There's
no interpolation, no "catch up" logic. If the frame loop stops, the water freezes
exactly where it was; there's no separate "animation" happening independently of
it.

This is also why the loop lives in `main.ts` and nowhere else: the composition
root (see §7 below) is the one place that's allowed to know both "the sim needs
to advance" and "the renderer needs to draw," and gluing those two facts together
once per tick is its whole job.

## 2. The heightfield

A real water surface is billions of molecules. Simulating that directly (particle
physics, e.g. SPH) is expensive and, for a toy that's just viewed from directly
above, overkill: from a top-down camera, all you ever perceive of the water is
*how high the surface is at each point*. So instead of particles, we store a
single number per grid point — vertical displacement from rest — in a
[Float32Array](src/sim/Simulation.ts#L13-L17). Two arrays, actually (`prev` and
`curr`); more on that in §4.

This is a legitimate, classic trick — real-time water demos have used exactly
this "heightfield" approach for decades, because it captures the visual behavior
that matters (ripples spreading, reflecting, interfering) with a tiny fraction of
the compute. The tradeoff is that it can't represent things a true fluid sim can
(splashes, foam that separates from the surface, overturning waves) — but for a
"clicking makes ripples" toy, none of that is needed.

The dots you see are a rendering choice layered on top of this grid — see §5 and
§6. The simulation itself has no idea dots exist; it only knows about numbers in
an array. That's enforced structurally: [Simulation.ts](src/sim/Simulation.ts)
has zero imports from Pixi or the DOM.

## 3. The wave equation, informally

The whole physics model is one line, [Simulation.ts:49](src/sim/Simulation.ts#L49):

```ts
prev[i] = (neighborSum * 0.5 - prev[i]) * config.damping;
```

Read it in three parts:

- **`neighborSum * 0.5`** — the average height of the four neighboring cells
  (up/down/left/right). This is the *curvature* term: a cell pulls toward
  whatever its neighbors are doing. A cell that's higher than its surroundings
  gets pulled down; a cell that's lower gets pulled up. This alone would just
  smooth/blur a disturbance flat — not make it wave.
- **`- prev[i]`** — subtracting the cell's *own value from one step ago*. This is
  what turns smoothing into oscillation: the cell has "memory" of where it was,
  so instead of settling directly onto the neighbor average, it overshoots past
  it — like a mass on a spring overshooting its rest position. That overshoot,
  repeated cell by cell, is what propagates as a wave.
- **`* config.damping`** — a friction term, slightly below 1 (see `config.ts`).
  Every step bleeds a small fraction of energy, so the overshoot-oscillation
  above doesn't continue forever; the surface gradually settles back to calm.

The loop only touches interior cells ([Simulation.ts:44-51](src/sim/Simulation.ts#L44-L51));
border cells are never written, so they stay at their initial 0 forever. That
fixed-0 boundary is why waves visibly bounce off the edges of the window instead
of vanishing off the sides — it's a "tank," not an infinite ocean.

Disturbances ([Simulation.ts:64-84](src/sim/Simulation.ts#L64-L84)) just subtract
a smooth, cosine-shaped bump from `curr` around the click/drag point before the
next `step()` runs — a deliberately rounded bump, because a hard-edged circle
would inject high-frequency noise that reads as ugly jagged artifacts once it
starts propagating.

## 4. Double buffering

Computing a cell's new value needs its neighbors' *current, not-yet-updated*
values. If the update loop wrote new values directly into the same array it was
reading from, cells visited later in the same pass would read a mix of old and
new neighbor values — corrupted physics, not a wave equation anymore. The
standard fix is two buffers: one array everyone reads from this step, a second
array the new values get written into; then the two swap roles for the next
step.

This codebase's specific trick ([Simulation.ts:41-55](src/sim/Simulation.ts#L41-L55)):
rather than allocating a third scratch array, the new value is written straight
into `prev[i]`. That's safe because `prev[i]`'s old value is only ever read by
that *same* cell's own update — never by a neighbor's — so once it's been read
once, it can be overwritten immediately. After the loop, `this.curr = prev; this.prev = curr;`
swaps which array is "current" versus "next to be overwritten," by reassigning
two references.

That last step is the point worth remembering: it's a pointer swap, not a copy.
Copying tens of thousands of floats every frame, just to relabel which one is
"current," would be pure waste. Swapping which variable name points to which
already-allocated array costs nothing, regardless of grid size.

## 5. Color LUTs

Every dot needs a color derived from its height, every frame. Computing that
color by interpolating a 5-stop gradient from scratch — for every dot, 60 times a
second — would repeat the same handful of possible answers over and over,
since height is clamped and effectively quantized anyway (see below).

So the gradient is computed once, at startup: [palette.ts's `buildPaletteLUT()`](src/render/palette.ts#L37-L62)
interpolates the §6 palette stops into a 256-entry `Uint32Array`, each entry a
packed RGB color. Then [`heightToLutIndex()`](src/render/palette.ts#L65-L69) clamps
a height to `[-heightMax, +heightMax]` and maps it onto one of those 256 buckets.
Per frame, coloring a dot ([Renderer.ts:138](src/render/Renderer.ts#L138)) is one
clamp, one multiply, and one array read — no gradient math in the hot path.

This is the classic space/time trade: spend a small, fixed amount of memory
(1KB) once, so that the per-frame cost of using it is as cheap as possible.
Quantizing a continuous height value down to 256 buckets is lossy, but
imperceptibly so — it's the same trade 8-bit color channels already make.

## 6. Why the GPU is fast at this

Naively, you might issue one GPU draw call per dot. Draw calls have fixed
overhead — state changes, command submission — that's often far larger than the
cost of actually rasterizing a tiny circle. At ~20,000 dots and 60 frames a
second, that overhead alone would blow the frame budget many times over.

GPUs are instead very good at drawing the *same* shape many times in one batched
instruction, varying only per-instance data like position and tint. That's
exactly this project's situation: every dot is an instance of one shared
texture — a small circle, drawn once with `Graphics` and baked into a texture at
startup ([Renderer.ts:73-78](src/render/Renderer.ts#L73-L78)). PixiJS's automatic
sprite batching collects same-texture sprites in a container and uploads them to
the GPU in as few draw calls as it can, instead of one call per dot.

Pixi v8 also ships a newer `ParticleContainer`/`Particle` API purpose-built for
exactly this case, offering an even thinner per-instance representation than a
full `Sprite`. This project deliberately didn't use it — as of this build it's
marked experimental in Pixi's own docs, and a plain `Container` of `Sprite`s is
already comfortably fast enough at this dot count (see the class comment at
[Renderer.ts:12-20](src/render/Renderer.ts#L12-L20)) while being far better
documented and more stable to build a tutorial around. That's a real engineering
tradeoff worth naming: the theoretically-faster API wasn't worth the stability
risk here.

## 7. Map of the code

Start reading at [`src/main.ts`](src/main.ts). It's the *composition root* — the
only file that imports and wires together every other module
([`bootstrap()`](src/main.ts#L23-L42)) — and the *facade for embedding*
([`createFluidSim()`](src/main.ts#L13-L16)), a one-call entry point a future host
page (e.g. a portfolio site) could use to drop the whole toy into a container
with optional config overrides.

From there:

- **`src/config.ts`** — every tunable constant, one place, each with a comment
  explaining what it does.
- **`src/types.ts`** — the shared contract (`SimulationState`, `DisturbOptions`,
  `Config`) that lets sim, renderer, and input avoid importing each other
  directly.
- **`src/sim/Simulation.ts`** — the physics (§2–§4 above). Zero Pixi/DOM
  imports, by design and enforced by its own unit tests.
- **`src/render/Renderer.ts`** — owns the Pixi `Application` and the dot pool;
  reads sim state, writes pixels, never the reverse. `onResize` (line 43) is a
  callback hook, not a direct import of `Simulation` — the composition root
  bridges the two, so `Renderer` stays ignorant of physics.
- **`src/render/palette.ts`** — the *lookup table* pattern (§5 above).
- **`src/input/PointerInput.ts`** — Pointer Events → `sim.disturb()`, via a
  constructor-injected callback rather than an import of `Simulation`, for the
  same reason as `Renderer.onResize`.

Data flow, once per frame: `PointerInput` calls `disturb()` on user input (async,
whenever it happens) → the ticker calls `sim.step()` (once per frame, always) →
`Renderer.render()` reads the resulting heights and repaints. Sim and renderer
never call into each other directly; they only ever touch the same
`SimulationState`-shaped data.
