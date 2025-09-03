
"use client";

import { useMemo } from 'react';
import { Delaunay } from 'd3-delaunay';

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
const NUM_POINTS = 50;

export function Background() {
  const voronoiPath = useMemo(() => {
    // Generate static points. Using a seeded random would also work.
    const points: [number, number][] = Array.from({ length: NUM_POINTS }, (_, i) => {
        // Simple pseudo-randomness to keep points static across renders
        const x = (Math.sin(i * 0.3) + 1) * (WORLD_WIDTH / 2);
        const y = (Math.cos(i * 0.7) + 1) * (WORLD_HEIGHT / 2);
        return [x, y];
    });

    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, WORLD_WIDTH, WORLD_HEIGHT]);
    
    return voronoi.render();
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
          d={voronoiPath}
          fill="none"
          stroke="hsl(var(--foreground) / 0.1)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
