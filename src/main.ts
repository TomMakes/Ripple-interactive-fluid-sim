import { Renderer } from './render/Renderer';

/**
 * Composition root. The only file that knows about every module; everything
 * else receives its dependencies via constructor (see §4).
 *
 * Phase 0: proves the toolchain end-to-end with a blank, full-viewport Pixi
 * canvas. Simulation and PointerInput are constructed here and wired into
 * the frame loop starting in Phase 3.
 */
async function bootstrap(): Promise<void> {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('#app container not found in index.html');
  }

  await Renderer.create(container);
}

bootstrap();
