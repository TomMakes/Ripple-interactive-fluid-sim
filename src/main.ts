import { config } from './config';
import { Renderer } from './render/Renderer';
import { Simulation } from './sim/Simulation';

/**
 * Composition root. The only file that knows about every module; everything
 * else receives its dependencies via constructor (see §4).
 */
async function bootstrap(): Promise<void> {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('#app container not found in index.html');
  }

  const renderer = await Renderer.create(container);

  let sim = new Simulation(renderer.cols, renderer.rows);

  // Phase 3 checkpoint: one hardcoded disturbance at startup proves sim →
  // renderer wiring end-to-end (expands, reflects off edges, fades).
  sim.disturb({
    gx: sim.cols / 2,
    gy: sim.rows / 2,
    radius: config.clickRadius,
    strength: config.clickStrength,
  });

  // The dot grid and the heightfield must share dimensions; when the grid
  // is rebuilt on resize, start a fresh calm sim to match.
  renderer.onResize = (cols, rows) => {
    sim = new Simulation(cols, rows);
  };

  renderer.app.ticker.add(() => {
    for (let i = 0; i < config.simStepsPerFrame; i++) {
      sim.step();
    }
    renderer.render(sim);
  });
}

bootstrap();
