import type { DisturbOptions, SimulationState } from '../types';

/**
 * Pure TS heightfield simulation. No Pixi imports, no DOM imports — this
 * file must be testable and runnable in plain Node.
 *
 * Phase 0: shape only (state allocation + read-only accessor). step() and
 * disturb() are implemented in Phase 1, along with the unit tests that pin
 * down their behavior.
 */
export class Simulation implements SimulationState {
  readonly cols: number;
  readonly rows: number;

  private prev: Float32Array;
  private curr: Float32Array;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.prev = new Float32Array(cols * rows);
    this.curr = new Float32Array(cols * rows);
  }

  get heights(): Float32Array {
    return this.curr;
  }

  /** Advances the heightfield by one step. Implemented in Phase 1. */
  step(): void {
    // TODO(Phase 1): neighbor-average wave update + damping, per §5.
  }

  /** Stamps a smooth disturbance into the current heightfield. Implemented in Phase 1. */
  disturb(_options: DisturbOptions): void {
    // TODO(Phase 1): cosine-falloff bump subtracted from curr, per §5.
  }
}
