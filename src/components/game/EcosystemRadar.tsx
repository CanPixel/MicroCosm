import { useEffect, useRef } from 'react';
import type { Simulation } from '@/lib/game/sim';

/** A local sensor, showing actual streamed entities rather than a decorative map. */
export function EcosystemRadar({ sim, paused }: { sim: Simulation; paused: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const draw = () => {
      const { player, organisms, sugars, antivirals, camera } = sim.state;
      const scale = 90 / 1100;
      ctx.clearRect(0, 0, 200, 200);
      ctx.save();
      ctx.beginPath(); ctx.arc(100, 100, 92, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#071a24'; ctx.fillRect(0, 0, 200, 200);
      ctx.strokeStyle = '#24505a'; ctx.lineWidth = 0.6;
      for (const r of [30, 60, 90]) { ctx.beginPath(); ctx.arc(100, 100, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, 100); ctx.lineTo(200, 100); ctx.moveTo(100, 0); ctx.lineTo(100, 200); ctx.stroke();
      const dot = (x: number, y: number, color: string, r: number, diamond = false) => {
        const dx = (x - player.pos.x) * scale, dy = (y - player.pos.y) * scale;
        if (Math.hypot(dx, dy) > 89) return;
        ctx.fillStyle = color; ctx.beginPath();
        if (diamond) { ctx.moveTo(100 + dx, 96 + dy); ctx.lineTo(104 + dx, 100 + dy); ctx.lineTo(100 + dx, 104 + dy); ctx.lineTo(96 + dx, 100 + dy); ctx.closePath(); }
        else ctx.arc(100 + dx, 100 + dy, r, 0, Math.PI * 2);
        ctx.fill();
      };
      for (const s of sugars) dot(s.x, s.y, '#bfde7c', 1.5);
      for (const o of organisms) dot(o.pos.x, o.pos.y, o.kind === 'organelle' ? '#f5c47d' : o.harmful ? '#ff747e' : '#3d737c', o.harmful ? 2.6 : 2, o.kind === 'organelle');
      for (const a of antivirals) dot(a.x, a.y, '#aab4ff', 3);
      const target = sim.objectiveTarget();
      if (target) {
        const angle = Math.atan2(target.y - player.pos.y, target.x - player.pos.x);
        const distance = Math.min(85, Math.hypot(target.x - player.pos.x, target.y - player.pos.y) * scale);
        ctx.strokeStyle = '#fff2c4'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(100 + Math.cos(angle) * distance, 100 + Math.sin(angle) * distance, 6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = '#7bc7cf44';
      const w = Math.min(130, 70 / camera.zoom), h = w * .65;
      ctx.strokeRect(100 - w / 2, 100 - h / 2, w, h);
      ctx.translate(100, 100);
      ctx.rotate(Math.atan2(player.vel.y, player.vel.x) + Math.PI / 2);
      ctx.fillStyle = '#edfff4'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(0, 3); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    draw();
    if (paused) return;
    const timer = window.setInterval(draw, 100);
    return () => window.clearInterval(timer);
  }, [sim, paused]);
  return <section className="ecosystem-radar hud-panel" aria-label="Live ecosystem radar">
    <header><span className="eyebrow">LOCAL BIOSPHERE</span><span className="radar-live">{paused ? 'HELD' : 'LIVE'}</span></header>
    <canvas ref={ref} width={200} height={200} role="img" aria-label="Radar showing nearby nutrients, threats, organelles and the next objective" />
    <div className="radar-legend"><span><i />Glucose</span><span><i />Systems</span><span><i />Threats</span></div>
    <footer>1,100 μm sensor radius</footer>
  </section>;
}
