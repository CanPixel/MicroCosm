
"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useMemo } from 'react';

type Point = { x: number; y: number };

const INITIAL_SIZE = 50;

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

type Particle = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  type: 'solid' | 'outline' | 'transparent';
  color: 'primary' | 'foreground' | 'accent';
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
  const viewboxCenter = useMemo(() => svgSize / 2, [svgSize]);
  
  const initialBaseRadius = useMemo(() => INITIAL_SIZE / 2, []);


  // Points for the cell wall, with some randomness
  const pointsRef = useRef<Array<{ angle: number; radius: number; targetRadius: number }>>([]);
  
  // Internal particles
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    // Initialize points for the cell wall
    pointsRef.current = Array.from({ length: numPoints }, (_, i) => {
      const angle = (i / numPoints) * 2 * Math.PI;
      const initialRadiusVal = (size/2) * (0.8 + Math.random() * 0.2);
      return { angle, radius: initialRadiusVal, targetRadius: initialRadiusVal };
    });

    // Initialize internal particles with more variety
    particlesRef.current = Array.from({ length: 20 }).map(() => {
      const rand = Math.random();
      let type: Particle['type'];
      let color: Particle['color'];
      
      if (rand < 0.4) {
        type = 'solid';
        color = 'primary';
      } else if (rand < 0.7) {
        type = 'solid';
        color = 'foreground';
      } else if (rand < 0.9) {
        type = 'outline';
        color = 'foreground';
      } else {
        type = 'transparent';
        color = 'primary';
      }

      return {
        x: (Math.random() * 0.8 - 0.4),
        y: (Math.random() * 0.8 - 0.4),
        r: Math.random() * 0.06 + 0.02, // radius relative to cell size
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.02,
        type,
        color,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPoints]);

  useEffect(() => {
    let animationFrameId: number;
    const path = svgRef.current?.querySelector('path');
    const particleElements = svgRef.current?.querySelectorAll('.internal-particle');
    const nucleusGroup = svgRef.current?.querySelector('.nucleus-group') as SVGGElement | null;
    const nucleus = nucleusGroup?.querySelector('.nucleus') as SVGCircleElement | null;

    if (!path || !particleElements || !nucleus || !nucleusGroup) return;

    const animate = (time: number) => {
      const currentSize = sizeRef.current;
      const { vx, vy } = velocityRef.current;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const movementAngle = Math.atan2(vy, vx);

      const currentBaseRadius = currentSize / 2;
      const currentViewboxCenter = (currentSize * 2.5) / 2;
      
      const inertiaOffsetX = -vx * 0.5;
      const inertiaOffsetY = -vy * 0.5;

      // Animate nucleus
      const nucleusScale = 1 + Math.sin(time / 500) * 0.1;
      nucleus.setAttribute('r', `${INITIAL_SIZE * 0.15 * nucleusScale}`);
      (nucleus.nextElementSibling as SVGCircleElement)?.setAttribute('r', `${INITIAL_SIZE * 0.1 * nucleusScale}`);
      nucleusGroup.setAttribute('transform', `translate(${inertiaOffsetX}, ${inertiaOffsetY})`);


      // Animate particles
      particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -0.4 || p.x > 0.4) p.vx *= -1;
        if (p.y < -0.4 || p.y > 0.4) p.vy *= -1;
        
        const particleEl = particleElements[i] as SVGCircleElement;
        if (particleEl) {
            particleEl.setAttribute('cx', `${currentViewboxCenter + p.x * initialBaseRadius + inertiaOffsetX}`);
            particleEl.setAttribute('cy', `${currentViewboxCenter + p.y * initialBaseRadius + inertiaOffsetY}`);
        }
      });

      // Wobble factor decreases as the cell gets bigger
      const wobbleFactor = Math.max(0.2, 1 - (currentSize - INITIAL_SIZE) / 500);

      const newPoints = pointsRef.current.map(point => {
        // Smoothly move radius towards target
        point.radius += (point.targetRadius - point.radius) * 0.1;

        // Occasionally set a new target radius
        if (Math.random() < 0.02 * wobbleFactor) { // Chance decreases as it grows
          const randomFactor = (0.7 + Math.random() * 0.6 * wobbleFactor); // Range of change decreases
          point.targetRadius = currentBaseRadius * randomFactor;
        }
        
        const pointAngle = point.angle + time / (5000 + (currentSize - INITIAL_SIZE) * 10); // Rotation slows down
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
        <g className="nucleus-group">
            <circle className="nucleus" cx={viewboxCenter} cy={viewboxCenter} r={INITIAL_SIZE * 0.15} fill="hsl(var(--accent))" opacity="0.8" />
            <circle cx={viewboxCenter} cy={viewboxCenter} r={INITIAL_SIZE * 0.1} fill="hsl(var(--accent) / 0.5)" />
        </g>

        {/* Internal Particles */}
        {particlesRef.current.map((p, i) => {
            let fill = 'none';
            let stroke = 'none';
            let strokeWidth = '0';
            let opacity = 1;

            if (p.type === 'solid') {
                fill = `hsl(var(--${p.color}))`;
                opacity = p.color === 'primary' ? 0.3 : 0.9;
            } else if (p.type === 'outline') {
                fill = 'transparent';
                stroke = `hsl(var(--${p.color}))`;
                strokeWidth = '1';
                opacity = 0.9;
            } else if (p.type === 'transparent') {
                fill = `hsl(var(--${p.color}))`;
                opacity = 0.1;
            }

            return (
                <circle
                    key={i}
                    className="internal-particle"
                    cx={viewboxCenter + p.x * initialBaseRadius}
                    cy={viewboxCenter + p.y * initialBaseRadius}
                    r={p.r * initialBaseRadius}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                />
            )
        })}
      </svg>
    </div>
  );
});

BioCell.displayName = 'BioCell';
