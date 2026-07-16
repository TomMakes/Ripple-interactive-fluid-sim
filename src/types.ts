/**
 * Shared interfaces between sim, renderer, and input.
 * Deliberately has no imports from Pixi or the DOM — this file is the
 * contract all three modules agree to (see §4 of the build plan).
 */

/** Read-only view of the simulation's current state, exposed to the renderer. */
export interface SimulationState {
  readonly cols: number;
  readonly rows: number;
  /** Displacement per cell, row-major, length cols * rows. 0 = calm. */
  readonly heights: Float32Array;
}

/** Parameters for a single disturbance stamped into the heightfield. */
export interface DisturbOptions {
  /** Grid x coordinate of the disturbance center (fractional allowed). */
  gx: number;
  /** Grid y coordinate of the disturbance center (fractional allowed). */
  gy: number;
  /** Radius of the cosine-falloff bump, in grid cells. */
  radius: number;
  /** Peak magnitude subtracted from curr at the center. */
  strength: number;
}

/** Every tunable constant for the simulation, rendering, and input layers. See config.ts. */
export interface Config {
  dotSpacingPx: number;
  damping: number;
  clickRadius: number;
  clickStrength: number;
  dragRadius: number;
  dragStrengthPerPxOfSpeed: number;
  dragStrengthMax: number;
  simStepsPerFrame: number;
  /** Height magnitude that maps to the extreme end of the palette LUT (trough/crest). */
  heightMax: number;
  /** Optional Phase 5 polish: px of y-shift per unit of height, for a subtle shimmer. 0 disables it. */
  shimmerPxPerHeight: number;
}
