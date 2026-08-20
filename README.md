# Ripple

An interactive water toy in the browser. The surface is a dense grid of dots
viewed from directly above; click to drop a ripple, drag to carve a wake, and
watch it spread, bounce off the edges, and settle back to calm. Each dot's
color tracks its current height — dark green-teal in the troughs, pale
foam-white at the crests — so the motion of the underlying physics reads
directly as shifting bands of color.

Under the hood it's a classic 2D heightfield wave simulation (not particle
physics), rendered as ~20,000 independently-tinted dots with PixiJS. See
[CONCEPTS.md](CONCEPTS.md) for how it actually works, section by section, with
pointers into the real source.

**Live:** https://tommakes.github.io/Ripple-interactive-fluid-sim/

<!-- TODO: drop a screenshot or short GIF of the drag-wake moment here. -->

## Quickstart

```bash
npm install
npm run dev
```

Opens a dev server on `localhost` and also prints a `Network:` LAN URL — open
that on a phone on the same WiFi to test touch input.

```bash
npm test    # runs the simulation's unit tests (Vitest)
npm run build   # production build to dist/
```

## Deploying

Pushing to `main` triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml):
install → test → build → deploy `dist/` to GitHub Pages via GitHub Actions.
Requires the repo's **Settings → Pages → Source** set to "GitHub Actions" (a
one-time setup step, not part of the workflow itself). You can also trigger a
deploy manually from the Actions tab (`workflow_dispatch`) without a new push.

## Project structure

```
src/
  main.ts          # composition root + createFluidSim() embedding facade
  config.ts         # every tunable constant, in one place
  types.ts           # shared contract between sim, renderer, and input
  sim/
    Simulation.ts    # the heightfield physics — no Pixi or DOM imports
    Simulation.test.ts
  render/
    Renderer.ts       # owns the Pixi app + dot pool
    palette.ts        # height -> color lookup table
  input/
    PointerInput.ts   # Pointer Events -> sim.disturb()
CONCEPTS.md          # how it works, with file/line pointers
.github/workflows/deploy.yml
```

`Simulation.ts` is intentionally pure TypeScript with zero rendering
dependencies — it's unit-tested on its own (see `npm test`) and could be
reused with a different renderer entirely.

## Embedding

`main.ts` exports a facade for dropping this into another page:

```ts
import { createFluidSim } from './src/main';

createFluidSim(document.getElementById('my-container'), {
  dotSpacingPx: 16, // any subset of config.ts's tunables
});
```

## v2 backlog

Ideas deliberately kept out of v1 scope (see the build plan §12 for the full
rationale):

- Interactive `concepts.html` — a second Vite entry page that turns
  CONCEPTS.md into a pokeable, live-figure tutorial using the real
  `Simulation` module
- Rain mode (random ambient drops on a timer)
- Obstacles: cells masked out of the sim so waves bend around them
- Palette switcher / `prefers-color-scheme` support
- Shader-based renderer (height texture + fullscreen quad)
- Subtle audio on disturbances
- Portfolio embed via `createFluidSim()`, pixel cat included if the mood strikes
- `prefers-reduced-motion`: start calm, reduce ambient effects
