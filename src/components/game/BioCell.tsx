
"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useMemo } from 'react';

type Point = { x: number; y: number };

// Helper function to create a smooth path from points (Catmull-Rom spline)
function catmullRomSpline(points: Point[], k: number = 1): string {
  if (points.length < 3) return '';
  
  const pathData = [];
  const loopedPoints = [...points, points[0], points[1], points[2]];

  pathData.push(`M${loopedPoints[1].x},${loopedPoints[1].y}`);

  for (let i = 1; i < loopedPoints.length - 2; i++) {
    const p0 = loopedPoints[i-1];
    const p1 = loopedPoints[i];
    const p2 = loopedPoints[i+1];
    const p3 = loopedPoints[i+2];

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * k;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * k;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * k;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * k;
    
    pathData.push(`C${cp1x},${cp1y},${cp2x},${cp2y},${p2.x},${p2.y}`);
  }
  return pathData.join('');
}

export type BioCellHandle = {
  updateVelocity: (vx: number, vy: number) => void;
};

type BioCellProps = {
  size: number;
};

export const BioCell = forwardRef<BioCellHandle, BioCellProps>(({ size }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const velocityRef = useRef({ vx: 0, vy: 0 });

  useImperativeHandle(ref, () => ({
    updateVelocity: (vx, vy) => {
      velocityRef.current = { vx, vy };
    }
  }));
  
  const numPoints = 12; // Number of points defining the cell shape
  
  const svgSize = useMemo(() => size * 2.5, [size]);
  const baseRadius = useMemo(() => size / 2, [size]);
  const viewboxCenter = useMemo(() => svgSize / 2, [svgSize]);

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
      const { vx, vy } = velocityRef.current;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const movementAngle = Math.atan2(vy, vx);

      const newPoints = pointsRef.current.map(point => {
        // Smoothly move radius towards target
        point.radius += (point.targetRadius - point.radius) * 0.1;

        // Occasionally set a new target radius
        if (Math.random() < 0.01) {
          point.targetRadius = baseRadius * (0.8 + Math.random() * 0.3);
        }
        
        const pointAngle = point.angle + time / 5000;
        let currentRadius = point.radius;

        // Physics-based stretch
        if (speed > 0.1) {
            const angleDiff = Math.cos(pointAngle - movementAngle);
            const stretchFactor = Math.min(speed / 10, 0.4); // max stretch
            currentRadius += angleDiff * baseRadius * stretchFactor; // Stretch in direction of movement
            currentRadius -= (1 - Math.abs(angleDiff)) * baseRadius * stretchFactor * 0.5; // Squash perpendicular to movement
        }

        const x = viewboxCenter + currentRadius * Math.cos(pointAngle);
        const y = viewboxCenter + currentRadius * Math.sin(pointAngle);
        return { x, y };
      });
      
      const svgPath = catmullRomSpline(newPoints);
      path.setAttribute('d', svgPath);
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [baseRadius, viewboxCenter]);

  const cellStyle: React.CSSProperties = {
    width: `${svgSize}px`,
    height: `${svgSize}px`,
    transition: 'width 0.2s ease-out, height 0.2s ease-out',
    filter: 'drop-shadow(0 0 10px hsl(var(--primary) / 0.8))'
  };

  return (
    <div style={cellStyle} className="absolute">
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
