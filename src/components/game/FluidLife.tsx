import { useEffect, useRef } from 'react';
import type { Simulation } from '@/lib/game/sim';

type Particle = { x: number; y: number; vx: number; vy: number; born: number; life: number; size: number; feeding: boolean };

/** World-space wakes and feeding sparks. Bounded to 120 particles, independent of React. */
export function FluidLife({ sim, paused }: { sim: Simulation; paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0, previous = sim.state.time, emitted = previous, eaten = sim.state.player.sugarsEaten;
    const draw = () => {
      const { player: p, camera: c, time } = sim.state;
      const dt = Math.max(0, time - previous); previous = time;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const feeding = p.sugarsEaten > eaten;
      if ((time - emitted > .045 && Math.hypot(p.vel.x, p.vel.y) > 30) || feeding) {
        const amount = feeding ? 12 : 2;
        for (let i = 0; i < amount; i++) {
          const a = Math.random() * Math.PI * 2, radius = p.size * .45;
          particles.current.push({ x: p.pos.x + Math.cos(a) * radius, y: p.pos.y + Math.sin(a) * radius,
            vx: feeding ? Math.cos(a) * 30 : -p.vel.x * .12, vy: feeding ? Math.sin(a) * 30 : -p.vel.y * .12,
            born: time, life: feeding ? .9 : 1.5, size: feeding ? 1.5 : .7 + Math.random(), feeding });
        }
        emitted = time;
      }
      eaten = p.sugarsEaten;
      particles.current = particles.current.filter(particle => time - particle.born < particle.life).slice(-120);
      ctx.globalCompositeOperation = 'lighter';
      for (const particle of particles.current) {
        particle.x += particle.vx * dt; particle.y += particle.vy * dt;
        const age = (time - particle.born) / particle.life;
        ctx.globalAlpha = (1 - age) * (particle.feeding ? .85 : .3);
        ctx.fillStyle = particle.feeding ? '#d5ee90' : '#9cd8d6';
        ctx.beginPath(); ctx.arc((particle.x - c.pos.x) * c.zoom + w / 2, (particle.y - c.pos.y) * c.zoom + h / 2, particle.size * c.zoom * (1 - age * .5), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [sim, paused]);
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[32] h-full w-full" aria-hidden="true" />;
}
