"use client";

import { useEffect, useMemo, useRef } from 'react';
import { CameraState } from '@/lib/game/sim';

// Out-of-focus foreground motes that drift across the field with parallax,
// echoing the blurred bokeh dots in the reference art. Pure presentation:
// positioned imperatively from the live camera, never re-rendered by React.

type Mote = {
  x: number; // screen fraction 0..1
  y: number;
  size: number;
  depth: number; // parallax factor (bigger = closer = moves more)
  hue: number;
  opacity: number;
};

const COUNT = 16;

export function Bokeh({ camera }: { camera: CameraState }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const elsRef = useRef<HTMLDivElement[]>([]);

  const motes = useMemo<Mote[]>(() => {
    const palette = [198, 263, 328, 36];
    return Array.from({ length: COUNT }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      size: 40 + Math.random() * 140,
      depth: 0.08 + Math.random() * 0.22,
      hue: palette[i % palette.length],
      opacity: 0.05 + Math.random() * 0.12,
    }));
  }, []);

  useEffect(() => {
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const w = window.innerWidth;
      const h = window.innerHeight;
      motes.forEach((m, i) => {
        const el = elsRef.current[i];
        if (!el) return;
        // Wrap parallax offset within the viewport so motes never scroll away.
        const ox = ((-camera.pos.x * m.depth) % (w + m.size)) - m.size / 2;
        const oy = ((-camera.pos.y * m.depth) % (h + m.size)) - m.size / 2;
        el.style.transform = `translate(${m.x * w + ox}px, ${m.y * h + oy}px)`;
      });
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [camera, motes]);

  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {motes.map((m, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) elsRef.current[i] = el;
          }}
          className="absolute top-0 left-0 rounded-full will-change-transform"
          style={{
            width: m.size,
            height: m.size,
            background: `radial-gradient(circle, hsl(${m.hue} 90% 65% / ${m.opacity}) 0%, transparent 70%)`,
            filter: 'blur(6px)',
          }}
        />
      ))}
    </div>
  );
}
