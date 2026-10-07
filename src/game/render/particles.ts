import { circle, place, type DrawCtx } from './draw/util';

// Cosmetic particles: sparks (emissive), goo and bubbles (scene), and rings.
// Pure render-side state, never read by the simulation.

export type ParticleKind = 'spark' | 'goo' | 'bubble' | 'ring' | 'shard';

type Particle = {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  grow: number;
  drag: number;
  color: string;
  spin: number;
  angle: number;
};

const CAP = 1100;

export type BurstOpts = {
  count: number;
  kind?: ParticleKind;
  color: string;
  speed?: [number, number];
  size?: [number, number];
  life?: [number, number];
  spread?: number; // radius of spawn area
  angle?: number; // emission direction
  cone?: number; // half-angle of the cone, default full circle
  drag?: number;
  grow?: number;
  inherit?: [number, number];
};

export class Particles {
  private list: Particle[] = [];
  reduced = false;

  burst(x: number, y: number, o: BurstOpts) {
    const count = this.reduced ? Math.ceil(o.count * 0.35) : o.count;
    for (let i = 0; i < count; i++) {
      if (this.list.length >= CAP) this.list.shift();
      const a = o.cone !== undefined ? (o.angle ?? 0) + (Math.random() * 2 - 1) * o.cone : Math.random() * Math.PI * 2;
      const sp = o.speed ? o.speed[0] + Math.random() * (o.speed[1] - o.speed[0]) : 60;
      const r = o.spread ? Math.sqrt(Math.random()) * o.spread : 0;
      const ra = Math.random() * Math.PI * 2;
      const life = o.life ? o.life[0] + Math.random() * (o.life[1] - o.life[0]) : 0.6;
      this.list.push({
        kind: o.kind ?? 'spark',
        x: x + Math.cos(ra) * r,
        y: y + Math.sin(ra) * r,
        vx: Math.cos(a) * sp + (o.inherit?.[0] ?? 0),
        vy: Math.sin(a) * sp + (o.inherit?.[1] ?? 0),
        life,
        max: life,
        size: o.size ? o.size[0] + Math.random() * (o.size[1] - o.size[0]) : 2,
        grow: o.grow ?? 0,
        drag: o.drag ?? 2.2,
        color: o.color,
        spin: (Math.random() - 0.5) * 6,
        angle: Math.random() * Math.PI * 2,
      });
    }
  }

  ring(x: number, y: number, radius: number, color: string, life = 0.5, width = 2) {
    if (this.list.length >= CAP) this.list.shift();
    this.list.push({ kind: 'ring', x, y, vx: 0, vy: 0, life, max: life, size: width, grow: radius, drag: 0, color, spin: 0, angle: 0 });
  }

  update(dt: number) {
    for (const p of this.list) {
      p.life -= dt;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (p.kind !== 'ring') p.size = Math.max(0, p.size + p.grow * dt);
    }
    if (this.list.some((p) => p.life <= 0)) this.list = this.list.filter((p) => p.life > 0);
  }

  draw(dc: DrawCtx) {
    const { ctx, ectx } = dc;
    for (const p of this.list) {
      const f = p.life / p.max;
      switch (p.kind) {
        case 'spark': {
          place(ectx, dc.exf, p.x, p.y, 0);
          ectx.globalAlpha = f;
          ectx.fillStyle = p.color;
          ectx.beginPath();
          circle(ectx, 0, 0, p.size * (0.5 + f * 0.5));
          ectx.fill();
          place(ctx, dc.xf, p.x, p.y, 0);
          ctx.globalAlpha = f * 0.9;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          circle(ctx, 0, 0, p.size * 0.45 * f);
          ctx.fill();
          break;
        }
        case 'goo': {
          place(ctx, dc.xf, p.x, p.y, p.angle);
          ctx.globalAlpha = Math.min(1, f * 1.6);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.72, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'bubble': {
          place(ctx, dc.xf, p.x, p.y, 0);
          ctx.globalAlpha = f * 0.8;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(0.6 / dc.ppu, p.size * 0.18);
          ctx.beginPath();
          circle(ctx, 0, 0, p.size);
          ctx.stroke();
          break;
        }
        case 'shard': {
          place(ctx, dc.xf, p.x, p.y, p.angle);
          ctx.globalAlpha = f;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(p.size, 0);
          ctx.lineTo(-p.size * 0.6, p.size * 0.5);
          ctx.lineTo(-p.size * 0.6, -p.size * 0.5);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'ring': {
          const r = p.grow * (1 - f * f);
          place(ectx, dc.exf, p.x, p.y, 0);
          ectx.globalAlpha = f * 0.8;
          ectx.strokeStyle = p.color;
          ectx.lineWidth = p.size * (0.5 + f);
          ectx.beginPath();
          circle(ectx, 0, 0, r);
          ectx.stroke();
          place(ctx, dc.xf, p.x, p.y, 0);
          ctx.globalAlpha = f * 0.6;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.5 * f;
          ctx.beginPath();
          circle(ctx, 0, 0, r);
          ctx.stroke();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
    ectx.globalAlpha = 1;
  }

  clear() {
    this.list = [];
  }
}
