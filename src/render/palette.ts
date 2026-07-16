import { config } from '../config';

/**
 * Height → color lookup table. Precomputed once at startup so per-frame
 * tinting is an array index, not a color computation (see CONCEPTS.md §5).
 */

/** Number of entries in the height→color LUT. */
export const PALETTE_LUT_SIZE = 256;

interface Stop {
  /** Position along the gradient, in [0, 1]. */
  t: number;
  r: number;
  g: number;
  b: number;
}

function hexToStop(t: number, hex: number): Stop {
  return { t, r: (hex >> 16) & 0xff, g: (hex >> 8) & 0xff, b: hex & 0xff };
}

/** §6 palette stops: deep trough → calm → crest. */
const STOPS: readonly Stop[] = [
  hexToStop(0, 0x0b3d33), // deep trough (dark pine green)
  hexToStop(0.25, 0x14555c), // falling (deep teal)
  hexToStop(0.5, 0x2b7a8c), // calm / zero (muted ocean blue)
  hexToStop(0.75, 0x7fb8c9), // rising (soft blue)
  hexToStop(1, 0xeaf6f4), // crest (foam white, hint of mint)
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Builds the 256-entry tint LUT by interpolating between the §6 palette stops. */
export function buildPaletteLUT(): Uint32Array {
  const lut = new Uint32Array(PALETTE_LUT_SIZE);

  for (let i = 0; i < PALETTE_LUT_SIZE; i++) {
    const t = i / (PALETTE_LUT_SIZE - 1);

    let lo = STOPS[0];
    let hi = STOPS[STOPS.length - 1];
    for (let s = 0; s < STOPS.length - 1; s++) {
      if (t >= STOPS[s].t && t <= STOPS[s + 1].t) {
        lo = STOPS[s];
        hi = STOPS[s + 1];
        break;
      }
    }

    const localT = (t - lo.t) / (hi.t - lo.t);
    const r = Math.round(lerp(lo.r, hi.r, localT));
    const g = Math.round(lerp(lo.g, hi.g, localT));
    const b = Math.round(lerp(lo.b, hi.b, localT));

    lut[i] = (r << 16) | (g << 8) | b;
  }

  return lut;
}

/** Maps a signed height to a LUT index, clamping to [-heightMax, +heightMax] first. */
export function heightToLutIndex(height: number): number {
  const clamped = Math.max(-config.heightMax, Math.min(config.heightMax, height));
  const t = (clamped + config.heightMax) / (2 * config.heightMax);
  return Math.round(t * (PALETTE_LUT_SIZE - 1));
}
