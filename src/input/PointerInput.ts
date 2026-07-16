import type { Config, DisturbOptions } from '../types';

/** Called whenever pointer activity should stamp a disturbance into the sim. */
export type DisturbCallback = (options: DisturbOptions) => void;

/**
 * Pointer Events → sim.disturb() translation. No Pixi imports, no rendering.
 *
 * Phase 0: shape only. Implemented in Phase 4: click drops, drag wakes with
 * speed scaling and segment interpolation, touch support (see §7).
 */
export class PointerInput {
  private readonly canvas: HTMLCanvasElement;
  private readonly config: Config;
  private readonly onDisturb: DisturbCallback;

  constructor(canvas: HTMLCanvasElement, config: Config, onDisturb: DisturbCallback) {
    this.canvas = canvas;
    this.config = config;
    this.onDisturb = onDisturb;
    // TODO(Phase 4): pointerdown/pointermove/pointerup/pointercancel listeners,
    // setPointerCapture, client→grid coordinate conversion, drag interpolation.
  }
}
