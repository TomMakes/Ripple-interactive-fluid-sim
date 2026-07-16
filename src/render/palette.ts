/**
 * Height → color lookup table. Precomputed once at startup so per-frame
 * tinting is an array index, not a color computation (see CONCEPTS.md §5).
 *
 * Phase 0: shape only. Implemented in Phase 2 alongside the static dot field.
 */

/** Number of entries in the height→color LUT. */
export const PALETTE_LUT_SIZE = 256;

/** Builds the 256-entry tint LUT by interpolating between the §6 palette stops. */
export function buildPaletteLUT(): Uint32Array {
  // TODO(Phase 2): per-channel lerp between the deep/falling/calm/rising/crest stops.
  return new Uint32Array(PALETTE_LUT_SIZE);
}
