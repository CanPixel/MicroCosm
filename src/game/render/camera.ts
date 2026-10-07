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
    architect: number, reducedMotion: boolean,
  ) {
    this.t += dt;
    const minDim = Math.min(this.viewW, this.viewH);
    const base = minDim / 500;
    const sizeFactor = Math.pow(30 / Math.max(24, colonyR), 0.62);
    const play = base * this.userZoom * sizeFactor;
    const inspect = (minDim * 0.3) / Math.max(10, primeR);
    const targetZoom = play + (inspect - play) * architect;
    this.zoom += (targetZoom - this.zoom) * approach(architect > 0.01 ? 5 : 2.6, dt);

    const look = (1 - architect) * 0.24;
    // In the architect view, keep the cell left of the build panel.
    const offset = architect * (this.viewW * 0.12) / this.zoom;
    const tx = focusX + vx * look + offset;
    const ty = focusY + vy * look;
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
