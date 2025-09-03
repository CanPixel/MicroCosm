
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
  const sizeRef = useRef(size);
  sizeRef.current = size;

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
  const particlesRef = useRef(Array.from({ length: 10 }).map(() => ({
      x: Math.random() * 0.6 - 0.3, // range -0.3 to 0.3
      y: Math.random() * 0.6 - 0.3, // range -0.3 to 0.3
      r: Math.random() * 0.05 + 0.02, // radius relative to cell size
      vx: (Math.random() - 0.5) * 0.001,
      vy: (Math.random() - 0.5) * 0.001,
  })));

  useEffect(() => {
    // Initialize points
    pointsRef.current = Array.from({ length: numPoints }, (_, i) => {
      const angle = (i / numPoints) * 2 * Math.PI;
      const initialRadius = (size/2) * (0.8 + Math.random() * 0.2);
      return { angle, radius: initialRadius, targetRadius: initialRadius };
    });
  }, [size, numPoints]);

  useEffect(() => {
    let animationFrameId: number;
    const path = svgRef.current?.querySelector('path');
    const particleElements = svgRef.current?.querySelectorAll('.internal-particle');
    const nucleus = svgRef.current?.querySelector('.nucleus') as SVGCircleElement | null;
    if (!path || !particleElements || !nucleus) return;

    const animate = (time: number) => {
      const currentSize = sizeRef.current;
      const { vx, vy } = velocityRef.current;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const movementAngle = Math.atan2(vy, vx);

      const currentBaseRadius = currentSize / 2;
      const currentViewboxCenter = (currentSize * 2.5) / 2;
      
      // Animate nucleus
      const nucleusScale = 1 + Math.sin(time / 1000) * 0.05;
      nucleus.setAttribute('r', `${currentSize * 0.15 * nucleusScale}`);
      (nucleus.nextElementSibling as SVGCircleElement)?.setAttribute('r', `${currentSize * 0.1 * nucleusScale}`);

      // Animate particles
      particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -0.3 || p.x > 0.3) p.vx *= -1;
        if (p.y < -0.3 || p.y > 0.3) p.vy *= -1;
        
        const particleEl = particleElements[i] as SVGCircleElement;
        if (particleEl) {
            particleEl.setAttribute('cx', `${currentViewboxCenter + p.x * currentBaseRadius}`);
            particleEl.setAttribute('cy', `${currentViewboxCenter + p.y * currentBaseRadius}`);
        }
      });


      const newPoints = pointsRef.current.map(point => {
        // Smoothly move radius towards target
        point.radius += (point.targetRadius - point.radius) * 0.1;

        // Occasionally set a new target radius
        if (Math.random() < 0.01) {
          point.targetRadius = currentBaseRadius * (0.8 + Math.random() * 0.3);
        }
        
        const pointAngle = point.angle + time / 5000;
        let currentRadius = point.radius;

        // Physics-based stretch
        if (speed > 0.1) {
            const angleDiff = Math.cos(pointAngle - movementAngle);
            const stretchFactor = Math.min(speed / 10, 0.4); // max stretch
            currentRadius += angleDiff * currentBaseRadius * stretchFactor; // Stretch in direction of movement
            currentRadius -= (1 - Math.abs(angleDiff)) * currentBaseRadius * stretchFactor * 0.5; // Squash perpendicular to movement
        }

        const x = currentViewboxCenter + currentRadius * Math.cos(pointAngle);
        const y = currentViewboxCenter + currentRadius * Math.sin(pointAngle);
        return { x, y };
      });
      
      const svgPath = catmullRomSpline(newPoints);
      path.setAttribute('d', svgPath);
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cellStyle: React.CSSProperties = {
    width: `${svgSize}px`,
    height: `${svgSize}px`,
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
        <circle className="nucleus" cx={viewboxCenter} cy={viewboxCenter} r={size * 0.15} fill="hsl(var(--accent))" opacity="0.8" />
        <circle cx={viewboxCenter} cy={viewboxCenter} r={size * 0.1} fill="hsl(var(--accent) / 0.5)" />

        {/* Internal Particles */}
        {particlesRef.current.map((p, i) => (
          <circle
            key={i}
            className="internal-particle"
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
