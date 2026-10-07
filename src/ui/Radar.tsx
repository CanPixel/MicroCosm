import { useEffect, useRef } from 'react';
import type { GameEngine } from '@/game/engine';
import { BIOME_PALETTES } from '@/game/render/palette';
import { objectiveNavTarget } from '@/game/sim/director';
import { SPECIES } from '@/game/sim/species';
import type { BiomeId } from '@/game/sim/types';

const SIZE = 168;
const RANGE = 1200;

// A local chemosensory map of what is actually streamed around the cell.
export function Radar({ engine, biome }: { engine: GameEngine; biome: BiomeId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const biomeRef = useRef(biome);
  biomeRef.current = biome;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    const draw = () => {
      const s = engine.state;
      const p = s.player;
      const prime = p.units[0];
      const sense = Math.min(RANGE, p.traits.senseRadius);
      const scale = (SIZE / 2 - 8) / RANGE;
      const c = SIZE / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.arc(c, c, c - 2, 0, Math.PI * 2);
      ctx.clip();
      const pal = BIOME_PALETTES[biomeRef.current];
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, pal[1]);
      g.addColorStop(1, pal[0]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (const r of [0.33, 0.66, 1]) {
        ctx.beginPath();
        ctx.arc(c, c, (c - 8) * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Sensory falloff beyond the cell's sense radius.
      if (sense < RANGE) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.arc(c, c, c, 0, Math.PI * 2);
        ctx.arc(c, c, sense * scale, 0, Math.PI * 2, true);
        ctx.fill('evenodd');
      }
      const dot = (x: number, y: number, color: string, r: number) => {
        const dx = (x - prime.x) * scale;
        const dy = (y - prime.y) * scale;
        if (dx * dx + dy * dy > (c - 6) * (c - 6)) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(c + dx, c + dy, r, 0, Math.PI * 2);
        ctx.fill();
      };
      const hiddenVisible = s.lightMode !== 'bright';
      for (const e of s.entities) {
        if (e.dead) continue;
        const d2 = (e.x - prime.x) ** 2 + (e.y - prime.y) ** 2;
        if (d2 > sense * sense) continue;
        const def = SPECIES[e.species];
        if (def.hidden && !hiddenVisible) continue;
        if (e.species === 'glucose') dot(e.x, e.y, '#c4f53a', 1.2);
        else if (e.species === 'dna') dot(e.x, e.y, '#c9a8ff', 1.8);
        else if (e.species === 'proteo') dot(e.x, e.y, '#d58bff', 2.4);
        else if (e.species === 'cyano') dot(e.x, e.y, '#7be04a', 2.4);
        else if (def.group === 'resource') continue;
        else if (def.threat >= 2) dot(e.x, e.y, '#ff3b5c', Math.min(5, 2 + e.radius * 0.03));
        else if (def.group === 'agent') dot(e.x, e.y, '#b9a6ff', 1.4);
        else dot(e.x, e.y, '#5fd0ff', Math.min(4, 1.4 + e.radius * 0.03));
      }
      for (const u of p.units) if (!u.dead) dot(u.x, u.y, '#ffffff', Math.max(2.5, u.radius * scale));
      const nav = objectiveNavTarget(s);
      if (nav) {
        const a = Math.atan2(nav.y - prime.y, nav.x - prime.x);
        const d = Math.min(c - 10, Math.hypot(nav.x - prime.x, nav.y - prime.y) * scale);
        ctx.strokeStyle = '#fff2a8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c, c, c - 2, 0, Math.PI * 2);
      ctx.stroke();
      // Heading marker.
      const h = prime.heading;
      ctx.fillStyle = '#7be0c0';
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(h) * (c - 2), c + Math.sin(h) * (c - 2));
      ctx.lineTo(c + Math.cos(h + 0.12) * (c - 12), c + Math.sin(h + 0.12) * (c - 12));
      ctx.lineTo(c + Math.cos(h - 0.12) * (c - 12), c + Math.sin(h - 0.12) * (c - 12));
      ctx.fill();
    };
    draw();
    const id = window.setInterval(draw, 100);
    return () => window.clearInterval(id);
  }, [engine]);

  return (
    <div className="radar" title="Chemosensory map: glucose, prey, threats and your objective">
      <canvas ref={ref} style={{ width: SIZE, height: SIZE }} />
      <div className="radar-legend">
        <span style={{ color: '#c4f53a' }}>● food</span>
        <span style={{ color: '#5fd0ff' }}>● prey</span>
        <span style={{ color: '#ff3b5c' }}>● threat</span>
      </div>
    </div>
  );
}
