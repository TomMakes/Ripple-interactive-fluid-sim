import type { Config } from './types';

/**
 * Every tunable constant for the simulation, rendering, and input layers.
 * Starter values from the build plan (§5) — known-good ballparks, meant to
 * be tuned against the signature drag-wake moment in Phase 5.
 */
export const config: Config = {
  /** Grid resolution in CSS pixels. viewport size / this = dot/cell count per axis. */
  dotSpacingPx: 14,
  /** Per-step energy retention. 0.99 = long-lived waves, 0.95 = syrupy. */
  damping: 0.985,
  /** Click disturbance radius, in grid cells. */
  clickRadius: 5,
  /** Click disturbance peak strength. */
  clickStrength: 220,
  /** Drag-stamp radius, in grid cells — smaller than a click so wakes read as a trail. */
  dragRadius: 2.5,
  /** Drag strength scales with pointer speed (px/frame) by this factor. */
  dragStrengthPerPxOfSpeed: 3,
  /** Hard clamp on drag strength so a fast flick can't blow out the heightfield. */
  dragStrengthMax: 120,
  /** Physics steps per rendered frame. 1 keeps sim and render in lockstep. */
  simStepsPerFrame: 1,
};
