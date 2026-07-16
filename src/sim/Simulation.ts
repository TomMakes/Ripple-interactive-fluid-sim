import { config } from '../config';
import type { DisturbOptions, SimulationState } from '../types';

/**
 * Pure TS heightfield simulation. No Pixi imports, no DOM imports — this
 * file must be testable and runnable in plain Node.
 *
 * Cells are indexed row-major: index = row * cols + col. Border cells
 * (row/col 0 or cols-1/rows-1) are a fixed 0 boundary — step() never writes
 * them, so waves reflect off the "tank" walls.
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

  /**
   * Advances the heightfield by one step (see §5): each interior cell moves
   * toward the average of its neighbors (curvature), minus its own previous
   * value (velocity/memory), scaled by DAMPING (friction).
   *
   * The new value for cell i is written into `prev[i]` — safe in place,
   * since prev[i] is only ever read by cell i's own update, never by a
   * neighbor's — then `prev`/`curr` are reference-swapped (no copying).
   */
  step(): void {
    const { cols, rows, curr, prev } = this;

    for (let row = 1; row < rows - 1; row++) {
      const rowOffset = row * cols;
      for (let col = 1; col < cols - 1; col++) {
        const i = rowOffset + col;
        const neighborSum = curr[i - 1] + curr[i + 1] + curr[i - cols] + curr[i + cols];
        prev[i] = (neighborSum * 0.5 - prev[i]) * config.damping;
      }
    }

    this.curr = prev;
    this.prev = curr;
  }

  /**
   * Stamps a smooth disturbance into the heightfield: a cosine-falloff bump
   * (not a hard-edged circle — hard edges spray ugly high-frequency noise)
   * subtracted from `curr`, centered at the (possibly fractional) grid
   * coordinate (gx, gy). Clamped to interior cells so the fixed-0 boundary
   * invariant always holds.
   */
  disturb({ gx, gy, radius, strength }: DisturbOptions): void {
    if (radius <= 0) return;

    const minCol = Math.max(1, Math.floor(gx - radius));
    const maxCol = Math.min(this.cols - 2, Math.ceil(gx + radius));
    const minRow = Math.max(1, Math.floor(gy - radius));
    const maxRow = Math.min(this.rows - 2, Math.ceil(gy + radius));

    for (let row = minRow; row <= maxRow; row++) {
      const rowOffset = row * this.cols;
      for (let col = minCol; col <= maxCol; col++) {
        const dx = col - gx;
        const dy = row - gy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const falloff = 0.5 * (1 + Math.cos((Math.PI * dist) / radius));
        this.curr[rowOffset + col] -= strength * falloff;
      }
    }
  }
}
