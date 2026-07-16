import { describe, expect, it } from 'vitest';
import { Simulation } from './Simulation';

function totalEnergy(heights: Float32Array): number {
  let energy = 0;
  for (let i = 0; i < heights.length; i++) {
    energy += heights[i] * heights[i];
  }
  return energy;
}

describe('Simulation', () => {
  it('disturbs cells near the target and leaves distant cells untouched', () => {
    const sim = new Simulation(32, 32);
    sim.disturb({ gx: 16, gy: 16, radius: 5, strength: 220 });

    const centerIndex = 16 * 32 + 16;
    expect(sim.heights[centerIndex]).not.toBe(0);

    const farIndex = 2 * 32 + 2;
    expect(sim.heights[farIndex]).toBe(0);
  });

  it('decays total energy toward calm over many steps', () => {
    const sim = new Simulation(32, 32);
    sim.disturb({ gx: 16, gy: 16, radius: 5, strength: 220 });

    for (let i = 0; i < 20; i++) sim.step();
    const earlyEnergy = totalEnergy(sim.heights);

    for (let i = 0; i < 480; i++) sim.step();
    const lateEnergy = totalEnergy(sim.heights);

    expect(lateEnergy).toBeLessThan(earlyEnergy * 0.5);
  });

  it('keeps edge cells fixed at 0', () => {
    const cols = 20;
    const rows = 16;
    const sim = new Simulation(cols, rows);

    // Disturb near every edge, plus dead center, then run several steps.
    sim.disturb({ gx: 0, gy: rows / 2, radius: 5, strength: 220 });
    sim.disturb({ gx: cols - 1, gy: rows / 2, radius: 5, strength: 220 });
    sim.disturb({ gx: cols / 2, gy: 0, radius: 5, strength: 220 });
    sim.disturb({ gx: cols / 2, gy: rows - 1, radius: 5, strength: 220 });
    sim.disturb({ gx: cols / 2, gy: rows / 2, radius: 5, strength: 220 });

    for (let i = 0; i < 50; i++) sim.step();

    for (let col = 0; col < cols; col++) {
      expect(sim.heights[col]).toBe(0); // top row
      expect(sim.heights[(rows - 1) * cols + col]).toBe(0); // bottom row
    }
    for (let row = 0; row < rows; row++) {
      expect(sim.heights[row * cols]).toBe(0); // left column
      expect(sim.heights[row * cols + (cols - 1)]).toBe(0); // right column
    }
  });
});
