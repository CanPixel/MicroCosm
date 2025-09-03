
"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useMemo } from 'react';

type Point = { x: number; y: number };

// Helper function to create a smooth path from points (Catmull-Rom spline)
function catmullRomSpline(points: Point[], k: number = 1): string {
  if (points.length < 3) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * k;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * k;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * k;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * k;
    
    d += `C${cp1x},${cp1y},${cp2x},${cp2y},${p2.x},${p2.y}`;
  }
  return d;
}

type BioCellProps = {
  size: number;
};

export const BioCell = forwardRef<HTMLDivElement, BioCellProps>(({ size }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const localRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => localRef.current as HTMLDivElement);
  
  const numPoints = 12; // Number of points defining the cell shape
  const baseRadius = useMemo(() => size / 2, [size]);

  // Points for the cell wall, with some randomness
  const pointsRef = useRef<Array<{ angle: number; radius: number; targetRadius: number }>>([]);
  
  // Internal particles
  const particles = useMemo(() => {
    return Array.from({ length: 10 }).map(() => ({
      x: Math.random() * 0.6 - 0.3, // range -0.3 to 0.3
      y: Math.random() * 0.6 - 0.3, // range -0.3 to 0.3
      r: Math.random() * 0.05 + 0.02, // radius relative to cell size
    }));
  }, []);

  useEffect(() => {
    // Initialize points
    pointsRef.current = Array.from({ length: numPoints }, (_, i) => {
      const angle = (i / numPoints) * 2 * Math.PI;
      const initialRadius = baseRadius * (0.8 + Math.random() * 0.2);
      return { angle, radius: initialRadius, targetRadius: initialRadius };
    });
  }, [baseRadius, numPoints]);

  useEffect(() => {
    let animationFrameId: number;
    const path = svgRef.current?.querySelector('path');
    if (!path) return;

    const animate = (time: number) => {
      const newPoints = pointsRef.current.map(point => {
        // Smoothly move radius towards target
        point.radius += (point.targetRadius - point.radius) * 0.1;

        // Occasionally set a new target radius
        if (Math.random() < 0.01) {
          point.targetRadius = baseRadius * (0.7 + Math.random() * 0.4);
        }

        const x = baseRadius + point.radius * Math.cos(point.angle + time / 5000);
        const y = baseRadius + point.radius * Math.sin(point.angle + time / 5000);
        return { x, y };
      });
      
      const svgPath = catmullRomSpline(newPoints);
      path.setAttribute('d', svgPath);
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [baseRadius]);

  const svgSize = size * 1.2;
  const viewboxCenter = svgSize / 2;

  const cellStyle: React.CSSProperties = {
    width: `${svgSize}px`,
    height: `${svgSize}px`,
    transition: 'width 0.5s ease-out, height 0.5s ease-out',
    filter: 'drop-shadow(0 0 10px hsl(var(--primary) / 0.8))'
  };

  return (
    <div ref={localRef} style={cellStyle} className="absolute">
      <svg ref={svgRef} width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        {/* Cell Body */}
        <path
          fill="hsl(var(--primary) / 0.2)"
          stroke="hsl(var(--foreground))"
          strokeWidth="3"
        />

        {/* Nucleus */}
        <circle cx={viewboxCenter} cy={viewboxCenter} r={size * 0.15} fill="hsl(var(--accent))" opacity="0.8" />
        <circle cx={viewboxCenter} cy={viewboxCenter} r={size * 0.1} fill="hsl(var(--accent) / 0.5)" />

        {/* Internal Particles */}
        {particles.map((p, i) => (
          <circle
            key={i}
            cx={viewboxCenter + p.x * baseRadius}
            cy={viewboxCenter + p.y * baseRadius}
            r={p.r * baseRadius}
            fill="hsl(var(--primary) / 0.3)"
          />
        ))}
      </svg>
    </div>
  );
});

BioCell.displayName = 'BioCell';
