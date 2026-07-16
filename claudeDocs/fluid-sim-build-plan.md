# Build Plan: "Ripple" — Interactive Fluid Simulation

**Executor:** Claude Sonnet, working phase-by-phase with a human collaborator (software engineer, limited graphics background).
**Budget:** One day of human–AI collaboration.
**This document is the contract.** If a decision isn't covered here, choose the simplest option that preserves the architecture boundaries in §4.

---

## 1. Project summary

A browser-based interactive water toy. The viewer looks straight down at a water surface rendered as a dense grid of dots ("molecules"). Clicking creates a ripple that propagates outward; dragging carves a wake that trails the cursor. Each dot's color is driven by its current displacement (wave height), so waves read as bands of shifting color — deep troughs in dark green-teal, crests in pale blue-white.

The simulation is a **2D heightfield** (the classic damped wave-equation ripple algorithm), not a particle physics sim. The dots are a *rendering choice* layered on top of grid physics. This is the key trick that keeps the project inside a one-day budget while still delivering the "molecules colored by depth" effect.

Two equally important deliverables:

1. The running toy, deployed to GitHub Pages.
2. A codebase the human can read as a graphics tutorial: `CONCEPTS.md` plus disciplined inline documentation.

---

## 2. Definition of done (hard checklist)

The project is **finished** when every box below is checked. Nothing outside this list belongs in v1 — new ideas go to the v2 backlog (§12), not into scope.

- [ ] Click anywhere → a circular ripple propagates outward and decays naturally.
- [ ] Press-and-drag → a continuous wake follows the pointer; faster drags make bigger disturbances.
- [ ] Works with touch (single pointer) as well as mouse, via Pointer Events.
- [ ] Every dot's color maps to its current height through a palette gradient (trough → crest).
- [ ] Sustains ~60 fps with a full-viewport dot grid on a mid-range laptop (see perf budget, §9).
- [ ] Window resize rebuilds the grid to fit (debounced; no crash, no distortion).
- [ ] `README.md`: what it is, how to run, how to deploy, project structure map.
- [ ] `CONCEPTS.md`: a complete, accurate draft of the graphics tutorial (outline in §10; the polished interactive version is a separate Opus session, per §10 Stage 2 — it is *not* a Day 1 requirement).
- [ ] Deployed and reachable at a public GitHub Pages URL.
- [ ] The simulation module imports nothing from PixiJS and has at least 3 passing unit tests.

**Explicit non-goals for v1:** no particle physics (SPH), no WebGL shaders written by hand, no obstacles, no rain mode, no sound, no UI controls/settings panel, no multi-touch, no mobile-specific layout work beyond "it doesn't break."

---

## 3. Tech stack

| Choice | What | Why |
|---|---|---|
| Build | Vite + vanilla **TypeScript** | Zero-config dev server, trivial GH Pages deploy; TS types double as documentation |
| Rendering | **PixiJS v8** (pin exact version in package.json) | Batched WebGL sprite rendering handles ~10k tinted dots without hand-written shaders |
| Testing | Vitest | Ships with the Vite ecosystem; used lightly (sim module only) |
| Deploy | GitHub Actions → GitHub Pages | One workflow file, then forget it |

**Note to Sonnet:** PixiJS v8's API differs significantly from v7 (e.g., async `Application.init()`, new `ParticleContainer`/`Particle` API). Do not write Pixi code from memory — check the installed version's types in `node_modules` or the official v8 docs before Phase 3. If per-particle tinting proves awkward in the installed version, the fallback is a plain `Container` of `Sprite`s (still fast enough at our dot count).

---

## 4. Architecture

The load-bearing rule: **the simulation knows nothing about rendering, and the renderer knows nothing about physics.** They meet only through a shared, read-only view of typed arrays. This is what makes the project extensible (swap renderers, add disturbance types) and testable.

```
src/
  main.ts          # Composition root: builds sim, renderer, input; runs the loop
  config.ts        # Every tunable constant, with a comment explaining each
  sim/
    Simulation.ts  # Pure TS. Heightfield state + step() + disturb(). No Pixi imports.
  render/
    Renderer.ts    # Owns the Pixi app + dot pool. Reads sim state, writes pixels.
    palette.ts     # Height → color lookup table (LUT)
  input/
    PointerInput.ts# Pointer events → calls sim.disturb(). No Pixi, no rendering.
  types.ts         # Shared interfaces (SimulationState, DisturbOptions, ...)
CONCEPTS.md
README.md
```

**Data flow, once per frame:**

```
PointerInput ──disturb(x, y, radius, strength)──▶ Simulation
                                                     │ step(): update heightfield
Renderer ◀──reads heights (Float32Array)─────────────┘
   │ for each dot: color = LUT[height], write to particle
   ▼
 Pixi draws
```

**Patterns in use (name them in code comments so the human can find them):**
- *Composition root* — `main.ts` is the only file that knows about all modules; everything else receives dependencies via constructor.
- *Double buffering* — the sim holds `previous` and `current` height arrays and swaps references each step (explained in CONCEPTS.md).
- *Lookup table* — colors precomputed once, indexed per frame; the standard trade of memory for per-frame math.
- *Facade for embedding* — export a single `createFluidSim(container: HTMLElement, config?: Partial<Config>)` from `main.ts` so the whole toy can later be dropped into the portfolio site as one function call.

---

## 5. The physics (what Sonnet implements and CONCEPTS.md explains)

State: two `Float32Array`s of size `cols × rows`, `prev` and `curr`, holding vertical displacement per grid cell (0 = calm).

Per step, for each interior cell:

```
next[i] = ( (curr[left] + curr[right] + curr[up] + curr[down]) / 2  -  prev[i] ) * DAMPING
```

Then swap: `prev ↔ curr` (swap the *references*, never copy arrays). Edge cells stay at 0 (fixed boundary — waves reflect off walls, which looks good in a "tank").

Why this works, in one paragraph (expand in CONCEPTS.md): the neighbor average pulls each cell toward its surroundings (that's the spatial curvature term of the wave equation), and subtracting the previous value gives the cell "memory" of its velocity, so displacement overshoots the rest position and oscillates — a wave. `DAMPING` slightly below 1 bleeds energy so the surface eventually calms.

**Disturbances.** `disturb(gx, gy, radius, strength)` subtracts a smooth bump (cosine falloff, not a hard-edged circle — hard edges spray ugly high-frequency noise) from `curr` around the target cell. Click = one large bump. Drag = small bumps stamped along the segment between the previous and current pointer position (interpolate — pointer events arrive slower than dots pass under a fast cursor), with `strength` scaled by pointer speed and clamped.

**Starter constants for `config.ts`** (these are known-good ballparks; tune in Phase 5, timeboxed):

```ts
DOT_SPACING_PX = 14      // grid resolution ≈ viewport / spacing
DAMPING        = 0.985   // 0.99 = long-lived waves, 0.95 = syrupy
CLICK_RADIUS   = 5       // in cells
CLICK_STRENGTH = 220
DRAG_RADIUS    = 2.5
DRAG_STRENGTH_PER_PX_OF_SPEED = 3   // clamp total at ~120
SIM_STEPS_PER_FRAME = 1
```

---

## 6. Rendering

- One tiny circle texture, generated once at startup (draw a filled circle with `Graphics`, extract to a texture). Every dot is an instance of that texture — this is what lets Pixi batch thousands of dots into few draw calls.
- Dots live at fixed grid positions (`col * spacing`, `row * spacing`). They do not move in v1; only color changes. (Optional 2-line polish in Phase 5: add `height * tiny_factor` to y-position for a subtle shimmer. Cut it if frame budget is tight.)
- Per frame: for each dot, map its cell's height to a LUT index and assign the precomputed tint. No allocation inside the frame loop — reuse everything.

**Color mapping (`palette.ts`).** Precompute a 256-entry `Uint32Array` LUT at startup by interpolating between palette stops. Height is clamped to `[-H_MAX, +H_MAX]` and mapped to `[0, 255]`. Interpolate in a perceptually gentle way (per-channel lerp between hand-picked stops is fine at this scale; note in CONCEPTS.md that fancier spaces like OKLab exist).

**Palette stops** (deep → calm → crest), chosen to sit comfortably inside a soft-blue / dark-green visual world so the toy can later live on the portfolio site without a costume change:

```
#0B3D33  deep trough   (dark pine green)
#14555C  falling       (deep teal)
#2B7A8C  calm / zero   (muted ocean blue)
#7FB8C9  rising        (soft blue)
#EAF6F4  crest         (foam white, hint of mint)
```

Background: near-black green `#06120F` so calm water reads as a quiet field of muted blue dots, and ripples bloom bright against it. The **signature visual moment** is the drag-wake: a comet of foam-white dots collapsing back through teal into dark green. Tune toward making *that* look great; everything else is quiet.

---

## 7. Input

`PointerInput.ts` listens on the canvas for `pointerdown` / `pointermove` / `pointerup` / `pointercancel` (Pointer Events cover mouse + touch uniformly; call `setPointerCapture` on down). It converts client coordinates → grid coordinates (divide by `DOT_SPACING_PX`) and calls `sim.disturb(...)`. It tracks the last pointer position + timestamp to compute drag speed and to interpolate stamps along fast drags.

**Mobile-correctness checklist** (these three make touch actually work, not just theoretically):
- `touch-action: none` on the canvas so mobile browsers don't hijack drags for scrolling/zoom.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` in `index.html`.
- Pass `resolution: window.devicePixelRatio` (with `autoDensity: true`) to the Pixi app so dots render crisply on high-DPI screens. Note: dot *count* is derived from CSS pixels, so phones naturally get ~2k dots vs. ~10k on a laptop — smaller devices automatically run a lighter sim.

---

## 8. Build phases

Each phase is a self-contained working session: state the goal to Sonnet, build, verify the acceptance criteria, **commit**. Do not start a phase until the previous one's criteria pass — this is the anti-scope-creep mechanism that gets this done in a day.

**Phase 0 — Scaffold (~30 min).**
Vite + TS project, PixiJS pinned, Vitest configured, folder skeleton from §4, `config.ts` populated with §5 constants, empty module stubs with their interfaces from `types.ts`. GitHub repo created; Pages workflow file added (§11) even though there's nothing to see yet — deploy plumbing goes in first, not last.
✅ *Done when:* `npm run dev` shows a blank Pixi canvas filling the window; `npm test` runs (0 tests); pushing to `main` publishes the blank page to the Pages URL.

**Phase 1 — Simulation core (~1 hr).**
`Simulation.ts`: constructor(cols, rows), `step()`, `disturb()`, `readonly heights` accessor. Plus unit tests: (a) a disturbance changes heights near the target and not far away, (b) a disturbed field's total energy decays toward calm over many steps, (c) edges remain 0. No rendering yet.
✅ *Done when:* tests pass; the sim file has zero imports from Pixi or the DOM.

**Phase 2 — Static dot field (~45 min).**
`Renderer.ts` + `palette.ts`: build the grid of dots sized to the viewport, all tinted with the calm color. Debounced resize rebuild.
✅ *Done when:* a full-screen field of evenly spaced dots renders at 60 fps and survives window resizing.

**Phase 3 — Connect sim to renderer (~45 min).**
Wire the frame loop in `main.ts`: `sim.step()` → renderer maps heights to tints. Trigger one hardcoded `disturb()` at startup to verify.
✅ *Done when:* the startup ripple visibly expands, reflects off edges, and fades; frame rate holds.

**Phase 4 — Interaction (~1 hr).**
`PointerInput.ts` per §7: click drops, drag wakes with speed scaling and segment interpolation, touch working.
✅ *Done when:* clicking and dragging both feel responsive; a fast circular drag leaves a continuous (not dotted) wake; works on a phone via the dev-server LAN URL.

**Phase 5 — Feel & polish (timeboxed: 1.5 hr, hard stop).**
Tune `config.ts` constants and palette against the signature moment (§6). Optional shimmer offset if budget allows. This phase is deliberately a fenced playground: constants only — no new features, no refactors.
✅ *Done when:* the timer runs out or you're delighted, whichever comes first.

**Phase 6 — Documentation & ship (~1.5 hr).**
Write `CONCEPTS.md` (§10) and `README.md`; JSDoc pass over public APIs; confirm the deployed URL matches local; check every box in §2.
✅ *Done when:* §2 is fully checked. The project is **finished**. Post the link somewhere.

Total: ~6.5–7 hours of collaboration — a day with margin for the inevitable Pixi API surprise.

---

## 9. Performance budget & risks

**Budget:** at `DOT_SPACING_PX = 14` on a 1920×1080 window → ~137 × 77 ≈ **10.5k dots** and the same number of sim cells. The sim step is ~10.5k float ops (trivial); the risk is per-dot tint updates on the render side. Target 60 fps; if profiling shows less:
1. Raise spacing to 16–18 px (quadratic savings, barely visible).
2. Skip tint writes for cells whose LUT index didn't change since last frame.
3. (v2 only) Move color mapping into a custom shader.

**Risks, ranked:**
1. *Pixi v8 API drift vs. Sonnet's training data.* Mitigation: pin the version; read installed types before Phase 3; Sprite-pool fallback (§3).
2. *Tuning black hole.* Water "feel" can eat hours. Mitigation: §5 starter constants + Phase 5 hard timebox.
3. *Scope creep.* Mitigation: §2 non-goals list + §12 backlog as the pressure valve — every mid-build idea gets written down there instead of built.

---

## 10. Documentation deliverables

Documentation is a **two-stage, two-model** effort:

- **Stage 1 (Day 1, Sonnet, Phase 6):** a lean `CONCEPTS.md` — accurate raw material, not polished pedagogy. Correct math, honest explanations, file/line pointers. This is the *input* to Stage 2, so favor completeness over prose quality.
- **Stage 2 (separate session, Opus):** transform `CONCEPTS.md` + the finished codebase into an interactive `concepts.html`, added as a second Vite entry page deployed alongside the toy. Because `Simulation.ts` is pure TS with no Pixi imports, the concepts page imports the *real* simulation module for live figures: a pokeable 1D wave strip, a `DAMPING` slider showing waves die faster, the actual palette LUT rendered as a labeled gradient bar, an animated double-buffer swap. Stage 2 has its own budget (~half a day) and its own done-state; it does not count against Day 1.

**`CONCEPTS.md` outline** — written for a strong engineer with no graphics background; each section ≤ ~300 words, with pointers into the actual source files:

1. The frame loop: why everything recomputes 60×/second, and `requestAnimationFrame`.
2. The heightfield: simulating a surface with a grid of numbers instead of particles — and why that's a legitimate (and classic) trick.
3. The wave equation, informally: neighbor-average as curvature, prev-subtraction as velocity/memory, damping as friction. Annotated walkthrough of the §5 update rule.
4. Double buffering: why two arrays, why swapping references beats copying.
5. Color LUTs: trading memory for per-frame math; how height becomes a color.
6. Why the GPU is fast at this: batching, textures, and what PixiJS abstracts away.
7. Map of the code: which pattern lives where, and where to start reading (answer: `main.ts`).

**Inline documentation rules:** JSDoc on every exported symbol; a header comment on each file stating its single responsibility and what it deliberately does *not* know about; comments explain *why*, never narrate *what*.

**`README.md`:** one-paragraph pitch + screenshot/GIF, quickstart (`npm i && npm run dev`), deploy instructions, structure map, link to CONCEPTS.md, v2 backlog.

---

## 11. Deployment

- `vite.config.ts`: `base: '/<repo-name>/'` (required for project-scoped GitHub Pages).
- `.github/workflows/deploy.yml`: on push to `main` → `npm ci && npm run build` → upload `dist/` → `actions/deploy-pages`. Use GitHub's standard Vite→Pages workflow template.
- Enable Pages (source: GitHub Actions) in repo settings during Phase 0.

---

## 12. v2 backlog (parking lot — nothing here enters v1)

- **Interactive `concepts.html`** (already scheduled — see §10 Stage 2; listed here so it isn't forgotten)
- Rain mode (random ambient drops on a timer)
- Obstacles: cells masked out of the sim so waves bend around them
- Palette switcher / prefers-color-scheme support
- Shader-based renderer (height texture + fullscreen quad) — the natural "learn real WebGL" sequel
- Subtle audio on disturbances
- Portfolio embed via the `createFluidSim()` facade — including the pixel cat sitting at the pond's edge, if the mood strikes
- `prefers-reduced-motion`: start calm, reduce ambient effects

---

## 13. How to run this plan with Sonnet (for the human)

Open each session with: the phase number, this document (or §§4–7 at minimum), and the current state of the repo. Ask Sonnet to restate the phase's acceptance criteria before writing code. Verify criteria yourself before moving on, and commit at every green checkpoint. If Sonnet proposes something not in this plan, the default answer is "backlog it" — §12 exists so good ideas survive without derailing the day.
