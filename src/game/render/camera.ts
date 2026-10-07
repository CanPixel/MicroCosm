import { approach, clamp } from '../sim/math';
import type { ViewRect } from '../sim/state';

export class Camera {
  x = 0;
  y = 0;
  zoom = 1.6; // CSS pixels per world unit
  userZoom = 1;
  trauma = 0;
  shakeX = 0;
  shakeY = 0;
  viewW = 1280;
  viewH = 800;
  private t = 0;

  addTrauma(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  setUserZoom(v: number) {
    this.userZoom = clamp(v, 0.55, 2.6);
  }

  update(
    dt: number, focusX: number, focusY: number, vx: number, vy: number, colonyR: number, primeR: number,
    architect: number, reducedMotion: boolean, intro = 1,
  ) {
    this.t += dt;
    const minDim = Math.min(this.viewW, this.viewH);
    const base = minDim / 500;
    const sizeFactor = Math.pow(30 / Math.max(24, colonyR), 0.62);
    // Opening shot: start on a close-up of the cell and slowly pull back.
    const e = intro * intro * (3 - 2 * intro);
    const play = base * this.userZoom * sizeFactor * (1 + 2.4 * (1 - e));
    // In the architect view, frame the cell in the space the build panel leaves
    // free: right of it on wide screens, above the bottom sheet on narrow ones.
    const side = this.viewW > 760;
    const panel = side ? 422 : 0;
    const freeH = side ? this.viewH : this.viewH * 0.54;
    const inspect = (Math.min(this.viewW - panel, freeH) * 0.32) / Math.max(10, primeR);
    const targetZoom = play + (inspect - play) * architect;
    if (intro < 1) this.zoom = targetZoom;
    else this.zoom += (targetZoom - this.zoom) * approach(architect > 0.01 ? 5 : 2.6, dt);

    const look = (1 - architect) * 0.24;
    const tx = focusX + vx * look + (architect * panel) / 2 / this.zoom;
    const ty = focusY + vy * look + (architect * (this.viewH - freeH)) / 2 / this.zoom;
    const k = approach(architect > 0.01 ? 8 : 3.4, dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;

    this.trauma = Math.max(0, this.trauma - dt * 1.7);
    const shake = reducedMotion ? 0 : this.trauma * this.trauma * 16;
    this.shakeX = (Math.sin(this.t * 47.3) + Math.sin(this.t * 31.1) * 0.5) * shake;
    this.shakeY = (Math.cos(this.t * 43.7) + Math.cos(this.t * 27.9) * 0.5) * shake;
  }

  // World-space rect the simulation streams around.
  view(): ViewRect {
    return { x: this.x, y: this.y, halfW: this.viewW / 2 / this.zoom, halfH: this.viewH / 2 / this.zoom };
  }

  worldToScreen(x: number, y: number) {
    return {
      x: (x - this.x) * this.zoom + this.viewW / 2 + this.shakeX,
      y: (y - this.y) * this.zoom + this.viewH / 2 + this.shakeY,
    };
  }

  screenToWorld(x: number, y: number) {
    return {
      x: (x - this.viewW / 2 - this.shakeX) / this.zoom + this.x,
      y: (y - this.viewH / 2 - this.shakeY) / this.zoom + this.y,
    };
  }
}
