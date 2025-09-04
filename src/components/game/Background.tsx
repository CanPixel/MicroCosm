"use client";

import { useEffect, useMemo, useRef } from 'react';
import { Delaunay } from 'd3-delaunay';

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
const NUM_POINTS = 200;

type MovingPoint = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type BackgroundProps = {
  cameraPosition: { x: number; y: number };
};

export function Background({ cameraPosition }: BackgroundProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointsRef = useRef<MovingPoint[]>([]);

  const parallaxFactor = 0.05;

  useEffect(() => {
    // Initialize points with random velocities for movement
    pointsRef.current = Array.from({ length: NUM_POINTS }, (_, i) => ({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.1,
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

  useEffect(() => {
    if (svgRef.current) {
      const offsetX = -cameraPosition.x * parallaxFactor;
      const offsetY = -cameraPosition.y * parallaxFactor;
      svgRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }
  }, [cameraPosition]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <svg
        ref={svgRef}
        width={WORLD_WIDTH}
        height={WORLD_HEIGHT}
        viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
        className="absolute top-0 left-0"
        style={{ willChange: 'transform' }}
      >
        <defs>
            <radialGradient id="vignetteGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              {/* Center of the vignette - mostly transparent */}
              <stop offset="0%" stopColor="black" stopOpacity="0" />
              {/* Mid-point - starts to become visible */}
              <stop offset="50%" stopColor="black" stopOpacity="0" />
              {/* Edge of the vignette - more opaque */}
              <stop offset="100%" stopColor="black" stopOpacity="0.4" /> {/* Adjust opacity for strength */}
            </radialGradient>
          </defs>
        <path
          ref={pathRef}
          stroke="hsla(152, 49.80%, 50.00%, 0.1)"
          strokeWidth="2"
        />
        <rect
          x="0"
          y="0"
          width={WORLD_WIDTH}
          height={WORLD_HEIGHT}
          fill="url(#vignetteGradient)"
          style={{ pointerEvents: 'none' }}
        />
      </svg>
    </div>
  );
}
