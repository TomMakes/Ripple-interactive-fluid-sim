import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { config } from '../config';
import type { SimulationState } from '../types';
import { buildPaletteLUT, heightToLutIndex } from './palette';

/** Radius of the shared dot texture, in CSS pixels. */
const DOT_RADIUS_PX = 3;

/** How long to wait after the last resize event before rebuilding the grid. */
const RESIZE_DEBOUNCE_MS = 200;

/**
 * Owns the Pixi app and the dot pool. Reads sim state, writes pixels — never
 * the reverse. Knows nothing about the wave equation.
 *
 * Uses a plain Container of Sprites sharing one generated circle texture
 * (§3's sanctioned fallback) rather than the experimental v8
 * ParticleContainer/Particle API — plenty fast at our dot count and far
 * more stable to build a tutorial around.
 */
export class Renderer {
  readonly app: Application;

  private readonly dotTexture: Texture;
  private readonly dotLayer: Container;
  private readonly paletteLut: Uint32Array;

  private dots: Sprite[] = [];
  private resizeTimer: ReturnType<typeof setTimeout> | undefined;

  /** Current grid dimensions, read-only from the outside. */
  cols = 0;
  rows = 0;

  /**
   * Fired after buildGrid() rebuilds the dot pool (initial build and every
   * debounced resize). The composition root uses this to keep the
   * Simulation's dimensions in sync — Renderer itself knows nothing about
   * Simulation, per §4.
   */
  onResize?: (cols: number, rows: number) => void;

  private constructor(app: Application) {
    this.app = app;
    this.paletteLut = buildPaletteLUT();
    this.dotTexture = this.createDotTexture();
    this.dotLayer = new Container();
    this.app.stage.addChild(this.dotLayer);

    this.app.renderer.on('resize', () => this.scheduleGridRebuild());
  }

  static async create(container: HTMLElement): Promise<Renderer> {
    const app = new Application();
    await app.init({
      resizeTo: container,
      backgroundColor: 0x1E5444, // 0x06120f, // §6: near-black green
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    container.appendChild(app.canvas);

    const renderer = new Renderer(app);
    renderer.buildGrid();
    return renderer;
  }

  /** Draws a filled circle once and extracts it to a texture; every dot is an instance of it (§6). */
  private createDotTexture(): Texture {
    const graphics = new Graphics().circle(0, 0, DOT_RADIUS_PX).fill({ color: 0xffffff });
    const texture = this.app.renderer.generateTexture(graphics);
    graphics.destroy();
    return texture;
  }

  private scheduleGridRebuild(): void {
    if (this.resizeTimer !== undefined) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => this.buildGrid(), RESIZE_DEBOUNCE_MS);
  }

  /**
   * (Re)builds the dot grid to fit the current viewport. Dots sit at fixed
   * positions (col * spacing, row * spacing, per §6) and are tinted to the
   * calm color; only tint changes per frame once sim is wired in (Phase 3).
   */
  buildGrid(): void {
    const { width, height } = this.app.screen;
    this.cols = Math.max(1, Math.floor(width / config.dotSpacingPx));
    this.rows = Math.max(1, Math.floor(height / config.dotSpacingPx));

    this.dotLayer.removeChildren();
    for (const dot of this.dots) {
      dot.destroy();
    }

    const calmTint = this.paletteLut[heightToLutIndex(0)];
    this.dots = new Array(this.cols * this.rows);

    // Offset by half a cell so every dot's center — and thus its full circle
    // — lands inside the canvas, instead of the first row/column sitting
    // exactly on the edge and getting clipped in half.
    const offset = config.dotSpacingPx / 2;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const dot = new Sprite({ texture: this.dotTexture, anchor: 0.5 });
        dot.x = col * config.dotSpacingPx + offset;
        dot.y = row * config.dotSpacingPx + offset;
        dot.tint = calmTint;
        this.dots[row * this.cols + col] = dot;
        this.dotLayer.addChild(dot);
      }
    }

    this.onResize?.(this.cols, this.rows);
  }

  /**
   * Reads sim heights and writes per-dot tints, one LUT lookup per dot, no
   * allocation. Bounds the loop to the shorter of the two arrays so a stale
   * frame during the resize-rebuild window can't index out of range.
   */
  render(state: SimulationState): void {
    const count = Math.min(this.dots.length, state.heights.length);
    for (let i = 0; i < count; i++) {
      this.dots[i].tint = this.paletteLut[heightToLutIndex(state.heights[i])];
    }
  }
}
