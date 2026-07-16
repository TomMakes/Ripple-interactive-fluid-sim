import type { Config } from './types';

/**
 * Every tunable constant for the simulation, rendering, and input layers.
 * Starter values from the build plan (§5) — known-good ballparks, meant to
 * be tuned against the signature drag-wake moment in Phase 5.
 */
export const config: Config = {
  /** Grid resolution in CSS pixels. viewport size / this = dot/cell count per axis. Default: 14 */
  dotSpacingPx: 10,
  /** Per-step energy retention. 0.99 = long-lived waves, 0.95 = syrupy. Default: 0.985 */
  damping: 0.983,
  /** Click disturbance radius, in grid cells. Default: 5 */
  clickRadius: 5,
  /** Click disturbance peak strength. Default: 220 */
  clickStrength: 100,
  /** Drag-stamp radius, in grid cells — smaller than a click so wakes read as a trail. Default: 2.5 */
  dragRadius: 1,
  /** Drag strength scales with pointer speed (px/frame) by this factor. Default: 3 */
  dragStrengthPerPxOfSpeed: 3,
  /** Hard clamp on drag strength so a fast flick can't blow out the heightfield. Default: 120 */
  dragStrengthMax: 400,
  /** Physics steps per rendered frame. 1 keeps sim and render in lockstep. Default: 1 */
  simStepsPerFrame: 1,
  /**
   * Height magnitude mapped to the palette's trough/crest extremes (§6). Not
   * one of the plan's §5 starter constants — a Phase 2 judgment call, ballparked
   * against CLICK_STRENGTH; retune in Phase 5 once real waves are on screen.
   * Default: 80
   */
  heightMax: 160,
  /**
   * Optional shimmer (§6 Phase 5 polish): px of y-shift per unit of height.
   * Default: 0.03
   * Set to 0 to cut it instantly if frame budget gets tight — no code change needed.
   */
  shimmerPxPerHeight: 0.08,
};
