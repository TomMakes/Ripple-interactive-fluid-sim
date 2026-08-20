import { config } from './config';
import { PointerInput } from './input/PointerInput';
import { Renderer } from './render/Renderer';
import { Simulation } from './sim/Simulation';
import type { Config } from './types';

/**
 * Facade for embedding (§4): boots the whole toy into `container` with one
 * call. `configOverrides` are merged onto the shared tunables in config.ts
 * before anything is constructed, so a host page can, say, drop the dot
 * spacing without touching this file.
 */
export function createFluidSim(container: HTMLElement, configOverrides?: Partial<Config>): void {
  Object.assign(config, configOverrides);
  void bootstrap(container);
}

/**
 * Composition root (§4): builds the simulation, renderer, and input, then
 * runs the frame loop. The only function that knows about every module;
 * everything else receives its dependencies via constructor.
 */
async function bootstrap(container: HTMLElement): Promise<void> {
  const renderer = await Renderer.create(container);

  let sim = new Simulation(renderer.cols, renderer.rows);

  // The dot grid and the heightfield must share dimensions; when the grid
  // is rebuilt on resize, start a fresh calm sim to match.
  renderer.onResize = (cols, rows) => {
    sim = new Simulation(cols, rows);
  };

  new PointerInput(renderer.app.canvas, config, (options) => sim.disturb(options));

  renderer.app.ticker.add(() => {
    for (let i = 0; i < config.simStepsPerFrame; i++) {
      sim.step();
    }
    renderer.render(sim);
  });
}

const container = document.getElementById('app');
if (!container) {
  throw new Error('#app container not found in index.html');
}
createFluidSim(container);
