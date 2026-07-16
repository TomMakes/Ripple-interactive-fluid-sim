import type { Config, DisturbOptions } from '../types';

/** Called whenever pointer activity should stamp a disturbance into the sim. */
export type DisturbCallback = (options: DisturbOptions) => void;

/**
 * Pointer Events → sim.disturb() translation. No Pixi imports, no rendering.
 * Mouse and single-finger touch are unified by the Pointer Events API;
 * multi-touch is out of scope (§2 non-goal).
 */
export class PointerInput {
  private readonly canvas: HTMLCanvasElement;
  private readonly config: Config;
  private readonly onDisturb: DisturbCallback;

  private dragging = false;
  private lastGx = 0;
  private lastGy = 0;
  private lastTimeMs = 0;

  constructor(canvas: HTMLCanvasElement, config: Config, onDisturb: DisturbCallback) {
    this.canvas = canvas;
    this.config = config;
    this.onDisturb = onDisturb;

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
  }

  /** Client (CSS pixel) coordinates → fractional grid coordinates. */
  private toGrid(clientX: number, clientY: number): { gx: number; gy: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      gx: (clientX - rect.left) / this.config.dotSpacingPx,
      gy: (clientY - rect.top) / this.config.dotSpacingPx,
    };
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.canvas.setPointerCapture(event.pointerId);
    this.dragging = true;

    const { gx, gy } = this.toGrid(event.clientX, event.clientY);
    this.lastGx = gx;
    this.lastGy = gy;
    this.lastTimeMs = event.timeStamp;

    // Click = one large bump.
    this.onDisturb({
      gx,
      gy,
      radius: this.config.clickRadius,
      strength: this.config.clickStrength,
    });
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.dragging) return;

    const { gx, gy } = this.toGrid(event.clientX, event.clientY);
    const dgx = gx - this.lastGx;
    const dgy = gy - this.lastGy;
    const distCells = Math.hypot(dgx, dgy);

    const elapsedMs = Math.max(1, event.timeStamp - this.lastTimeMs);
    const elapsedFrames = elapsedMs / (1000 / 60); // normalize to 60fps "frames"
    const speedPxPerFrame = (distCells * this.config.dotSpacingPx) / elapsedFrames;
    const strength = Math.min(
      this.config.dragStrengthMax,
      speedPxPerFrame * this.config.dragStrengthPerPxOfSpeed,
    );

    // Pointer events arrive slower than dots pass under a fast cursor:
    // stamp several bumps along the segment so the wake reads as continuous,
    // not dotted.
    const stampSpacingCells = this.config.dragRadius * 0.5;
    const steps = Math.max(1, Math.ceil(distCells / stampSpacingCells));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.onDisturb({
        gx: this.lastGx + dgx * t,
        gy: this.lastGy + dgy * t,
        radius: this.config.dragRadius,
        strength,
      });
    }

    this.lastGx = gx;
    this.lastGy = gy;
    this.lastTimeMs = event.timeStamp;
  };

  private handlePointerUp = (event: PointerEvent): void => {
    this.dragging = false;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };
}
