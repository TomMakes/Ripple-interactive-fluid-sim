import { Application } from 'pixi.js';
import type { SimulationState } from '../types';

/**
 * Owns the Pixi app and the dot pool. Reads sim state, writes pixels — never
 * the reverse. Knows nothing about the wave equation.
 *
 * Phase 0: bootstraps the Application and mounts a blank, full-viewport
 * canvas (the Phase 0 acceptance check). The dot grid is built in Phase 2;
 * height→tint mapping is wired in Phase 3.
 */
export class Renderer {
  readonly app: Application;

  private constructor(app: Application) {
    this.app = app;
  }

  static async create(container: HTMLElement): Promise<Renderer> {
    const app = new Application();
    await app.init({
      resizeTo: container,
      backgroundColor: 0x06120f, // §6: near-black green
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    container.appendChild(app.canvas);
    return new Renderer(app);
  }

  /** (Re)builds the dot grid to fit the current viewport. Implemented in Phase 2. */
  buildGrid(): void {
    // TODO(Phase 2): one circle-texture sprite per cell, tinted to the calm color.
  }

  /** Reads sim heights and writes per-dot tints. Implemented in Phase 3. */
  render(_state: SimulationState): void {
    // TODO(Phase 3): map each cell's height through the palette LUT to a tint.
  }
}
