"use client";

import { useEffect, useMemo, useRef } from 'react';
import { Delaunay } from 'd3-delaunay';

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
const NUM_POINTS = 200; // Increased from 50 to "zoom out"

type MovingPoint = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export function Background() {
  const pathRef = useRef<SVGPathElement>(null);
  const pointsRef = useRef<MovingPoint[]>([]);

  useEffect(() => {
    // Initialize points with random velocities for movement
    pointsRef.current = Array.from({ length: NUM_POINTS }, (_, i) => ({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      vx: (Math.random() - 0.5) * 0.2, // Slow horizontal velocity
      vy: (Math.random() - 0.5) * 0.2, // Slow vertical velocity
    }));

    let animationFrameId: number;

    const animate = () => {
      if (!pathRef.current) return;

      // Update point positions
      const currentPoints: [number, number][] = pointsRef.current.map(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off the walls
        if (p.x < 0 || p.x > WORLD_WIDTH) p.vx *= -1;
        if (p.y < 0 || p.y > WORLD_HEIGHT) p.vy *= -1;
        
        return [p.x, p.y];
      });
      
      // Recalculate Voronoi diagram on each frame
      const delaunay = Delaunay.from(currentPoints);
      const voronoi = delaunay.voronoi([0, 0, WORLD_WIDTH, WORLD_HEIGHT]);
      
      pathRef.current.setAttribute('d', voronoi.render());
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <svg
        width={WORLD_WIDTH}
        height={WORLD_HEIGHT}
        viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
        className="absolute top-0 left-0"
      >
        <path
          ref={pathRef}
          fill="none"
          stroke="hsl(var(--foreground) / 0.1)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
