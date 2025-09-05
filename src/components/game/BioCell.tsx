
"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useMemo, useState, useCallback } from 'react';
import { InnerMitochondrion } from './InnerMitochondrion';
import { InnerGolgiApparatus } from './InnerGolgiApparatus';
import { InnerCellNucleus } from './InnerCellNucleus';

type Point = { x: number; y: number };

const INITIAL_SIZE = 50;
const EVOLUTION_SCORE_THRESHOLD = 100;
const EVOLUTION_SIZE_MULTIPLIER = 1.4;

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
  takeDamage: () => void;
};

type BioCellProps = {
  size: number;
  score: number;
  isDying: boolean;
  collectedOrganelles: Set<string>;
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

type DamageParticle = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    opacity: number;
    size: number;
}

type InternalOrganelle = {
    id: string;
    type: string;
    Component: React.FC<any>;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    size: number;
};

const organelleMap: { [key: string]: React.FC<any> } = {
  mitochondrion: InnerMitochondrion,
  golgi: InnerGolgiApparatus,
  nucleus: InnerCellNucleus,
};


export const BioCell = forwardRef<BioCellHandle, BioCellProps>(({ size, score, isDying, collectedOrganelles }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const [hasEvolved, setHasEvolved] = useState(false);
  const [damageParticles, setDamageParticles] = useState<DamageParticle[]>([]);
  const [internalOrganelles, setInternalOrganelles] = useState<InternalOrganelle[]>([]);
  const evolutionFactorRef = useRef(1);
  const damageAnimationRef = useRef(0);
  const deathAnimationRef = useRef(0);

  const takeDamage = useCallback(() => {
    damageAnimationRef.current = 1; // Start the damage animation
    
    const newParticles: DamageParticle[] = [];
    const numParticles = 3 + Math.floor(Math.random() * 3); // Reduced particles
    for (let i = 0; i < numParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        newParticles.push({
            id: Math.random(),
            x: 0, // start at center
            y: 0,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            opacity: 1,
            size: Math.random() * 4 + 2,
        });
    }
    setDamageParticles(d => [...d, ...newParticles]);

  }, []);

  useImperativeHandle(ref, () => ({
    updateVelocity: (vx, vy) => {
      velocityRef.current = { vx, vy };
    },
    takeDamage,
  }));
  
  const numPoints = 12; // Number of points defining the cell shape
  
  const svgSize = useMemo(() => size * 2.5, [size]);
  const viewboxCenter = useMemo(() => svgSize / 2, [svgSize]);
  
  const initialBaseRadius = useMemo(() => INITIAL_SIZE / 2, []);


  // Points for the cell wall, with some randomness
  const pointsRef = useRef<Array<{ angle: number; radius: number; targetRadius: number }>>([]);
  const outerPointsRef = useRef<Array<{ angle: number; radius: number; targetRadius: number }>>([]);
  
  // Internal particles
  const particlesRef = useRef<Particle[]>([]);
  
  // Add new organelles when collected
  useEffect(() => {
    const existingTypes = new Set(internalOrganelles.map(o => o.type));
    const newOrganelles: InternalOrganelle[] = [];
    
    collectedOrganelles.forEach(type => {
        if (!existingTypes.has(type) && organelleMap[type]) {
            newOrganelles.push({
                id: `${type}-${Date.now()}`,
                type: type,
                Component: organelleMap[type],
                x: (Math.random() * 0.6 - 0.3), // Start away from center
                y: (Math.random() * 0.6 - 0.3),
                vx: (Math.random() - 0.5) * 0.015,
                vy: (Math.random() - 0.5) * 0.015,
                rotation: Math.random() * 360,
                size: initialBaseRadius * 0.5,
            });
        }
    });

    if (newOrganelles.length > 0) {
        setInternalOrganelles(prev => [...prev, ...newOrganelles]);
    }
  }, [collectedOrganelles, internalOrganelles, initialBaseRadius]);


  useEffect(() => {
    if (score >= EVOLUTION_SCORE_THRESHOLD && !hasEvolved) {
      setHasEvolved(true);
      
      // Initialize points for the new outer wall
      outerPointsRef.current = pointsRef.current.map(p => ({ ...p }));
    }
  }, [score, hasEvolved]);


  useEffect(() => {
    // Initialize points for the cell wall
    pointsRef.current = Array.from({ length: numPoints }, (_, i) => {
      const angle = (i / numPoints) * 2 * Math.PI;
      const initialRadiusVal = (size/2) * (0.8 + Math.random() * 0.2);
      return { angle, radius: initialRadiusVal, targetRadius: initialRadiusVal };
    });

    // Initialize internal particles with more variety
    particlesRef.current = Array.from({ length: 10 }).map(() => {
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
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const innerPath = svgEl.querySelector('.inner-wall') as SVGPathElement | null;
    const outerPath = svgEl.querySelector('.outer-wall') as SVGPathElement | null;
    const particleElements = svgEl.querySelectorAll('.internal-particle');
    const nucleusGroup = svgEl.querySelector('.nucleus-group') as SVGGElement | null;
    const nucleus = nucleusGroup?.querySelector('.nucleus') as SVGCircleElement | null;
    const radiatingCircle1 = nucleusGroup?.querySelector('.radiating-circle-1') as SVGCircleElement | null;
    const radiatingCircle2 = nucleusGroup?.querySelector('.radiating-circle-2') as SVGCircleElement | null;

    if (!innerPath || !particleElements || !nucleus || !nucleusGroup || !radiatingCircle1 || !radiatingCircle2) return;
    if (hasEvolved && !outerPath) return;

    let animatedWallPoints: Point[] = [];
    let animatedOuterWallPoints: Point[] = [];
    let radiationTime1 = 0;
    let radiationTime2 = 1.5; // Stagger the second circle

    const animate = (time: number) => {
      const currentSize = sizeRef.current;
      const { vx, vy } = velocityRef.current;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const movementAngle = Math.atan2(vy, vx);
      
      const nucleusBaseRadius = INITIAL_SIZE * 0.15;
      const minCellRadius = nucleusBaseRadius * 1.5; // Ensure wall is always outside nucleus
      
      const baseRadiusFromSize = currentSize / 2;
      const currentBaseRadius = Math.max(minCellRadius, baseRadiusFromSize);
      
      const currentSvgSize = currentSize * 2.5;
      const currentViewboxCenter = currentSvgSize / 2;

      svgEl.setAttribute('width', `${currentSvgSize}`);
      svgEl.setAttribute('height', `${currentSvgSize}`);
      svgEl.setAttribute('viewBox', `0 0 ${currentSvgSize} ${currentSvgSize}`);
      
      const inertiaOffsetX = -vx * 0.5;
      const inertiaOffsetY = -vy * 0.5;

      // Death animation
      if (isDying && deathAnimationRef.current < 1) {
          deathAnimationRef.current += 0.005; // speed of death animation
      }
      const deathProgress = deathAnimationRef.current;

      // Evolution animation
      if (hasEvolved && evolutionFactorRef.current < EVOLUTION_SIZE_MULTIPLIER) {
        evolutionFactorRef.current += (EVOLUTION_SIZE_MULTIPLIER - evolutionFactorRef.current) * 0.05;
      }
      
      // Damage animation
      let damageScale = 1;
      if (damageAnimationRef.current > 0) {
          // A sine wave makes a nice deflate/reinflate effect
          damageScale = 1 - Math.sin(damageAnimationRef.current * Math.PI) * 0.3;
          damageAnimationRef.current -= 0.05; // speed of animation
      } else {
          damageAnimationRef.current = 0;
      }

      // Animate nucleus
      const nucleusScale = isDying ? 1 : 1 + Math.sin(time / 500) * 0.1;
      const nucleusColor = `hsl(var(--accent-hsl), ${1 - deathProgress})`; // Fade to black
      nucleus.setAttribute('r', `${nucleusBaseRadius * nucleusScale}`);
      nucleus.setAttribute('fill', nucleusColor);
      (nucleus.nextElementSibling as SVGCircleElement)?.setAttribute('r', `${INITIAL_SIZE * 0.1 * nucleusScale}`);
      nucleusGroup.setAttribute('transform', `translate(${currentViewboxCenter + inertiaOffsetX}, ${currentViewboxCenter + inertiaOffsetY})`);

      // Animate radiating circles
      const animateRadiation = (circle: SVGCircleElement, rTime: number) => {
          const maxRadius = nucleusBaseRadius * 3;
          const currentRadius = (rTime % 3) / 3 * maxRadius;
          const opacity = Math.max(0, 1 - (currentRadius / maxRadius) - deathProgress);

          circle.setAttribute('r', `${currentRadius}`);
          circle.setAttribute('opacity', `${opacity}`);
          return rTime + 0.02;
      };

      radiationTime1 = animateRadiation(radiatingCircle1, radiationTime1);
      radiationTime2 = animateRadiation(radiatingCircle2, radiationTime2);

      setInternalOrganelles(prev => prev.map(o => {
          let newX = o.x + o.vx;
          let newY = o.y + o.vy;
          let newVx = o.vx;
          let newVy = o.vy;

          // Bounce off cell walls (approximate)
          if (newX < -0.4 || newX > 0.4) newVx *= -1;
          if (newY < -0.4 || newY > 0.4) newVy *= -1;

          return { ...o, x: newX, y: newY, vx: newVx, vy: newVy, rotation: o.rotation + 0.5 };
      }));


      // Animate particles
      particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -0.4 || p.y > 0.4) p.vx *= -1;
        if (p.y < -0.4 || p.y > 0.4) p.vy *= -1;
        
        const particleEl = particleElements[i] as SVGCircleElement;
        if (particleEl) {
            particleEl.setAttribute('cx', `${currentViewboxCenter + p.x * initialBaseRadius + inertiaOffsetX}`);
            particleEl.setAttribute('cy', `${currentViewboxCenter + p.y * initialBaseRadius + inertiaOffsetY}`);
        }
      });
      
      setDamageParticles(prev => 
        prev.map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            opacity: p.opacity - 0.02,
        })).filter(p => p.opacity > 0)
      );

      // Physics-based stretch logic
      const stretchFactor = speed > 0.1 ? Math.min(speed / 10, 0.4) : 0;
      
      // Wobble factor decreases as the cell gets bigger
      const wobbleFactor = Math.max(0.2, 1 - (currentSize - INITIAL_SIZE) / 500);

      const updateWallPoints = (points: typeof pointsRef.current, radiusMultiplier: number) => {
        return points.map(point => {
          // Smoothly move radius towards target
          point.radius += (point.targetRadius - point.radius) * 0.1;
  
          // Occasionally set a new target radius
          if (Math.random() < 0.02 * wobbleFactor) { // Chance decreases as it grows
            const randomFactor = (0.7 + Math.random() * 0.6 * wobbleFactor); // Range of change decreases
            point.targetRadius = currentBaseRadius * randomFactor;
          }
          
          const pointAngle = point.angle + time / (5000 + (currentSize - INITIAL_SIZE) * 10); // Rotation slows down
          let currentRadius = point.radius * radiusMultiplier * damageScale;
  
          // Apply physics-based stretch
          if (stretchFactor > 0) {
              const angleDiff = Math.cos(pointAngle - movementAngle);
              currentRadius += angleDiff * currentBaseRadius * stretchFactor * radiusMultiplier; // Stretch in direction of movement
              currentRadius -= (1 - Math.abs(angleDiff)) * currentBaseRadius * stretchFactor * 0.5 * radiusMultiplier; // Squash perpendicular to movement
          }
  
          const x = currentViewboxCenter + currentRadius * Math.cos(pointAngle);
          const y = currentViewboxCenter + currentRadius * Math.sin(pointAngle);
          return { x, y };
        });
      };
      
      animatedWallPoints = updateWallPoints(pointsRef.current, 1);
      const innerSvgPath = catmullRomSpline(animatedWallPoints);
      innerPath.setAttribute('d', innerSvgPath);
      innerPath.setAttribute('fill-opacity', `${Math.max(0, 0.2 - deathProgress * 0.2)}`);
      innerPath.setAttribute('stroke-width', `${Math.max(0, (hasEvolved ? 0 : 3) * (1 - deathProgress))}`);


      if(hasEvolved && outerPath) {
        animatedOuterWallPoints = updateWallPoints(outerPointsRef.current, evolutionFactorRef.current);
        const outerSvgPath = catmullRomSpline(animatedOuterWallPoints);
        outerPath.setAttribute('d', outerSvgPath);
        outerPath.setAttribute('stroke-width', `${Math.max(0, 3 * (1 - deathProgress))}`);
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEvolved, collectedOrganelles, isDying]);

  const containerSize = svgSize * 1.5; // Make container larger than SVG to prevent clipping

  const cellStyle: React.CSSProperties = {
    width: `${containerSize}px`,
    height: `${containerSize}px`,
    filter: `drop-shadow(0 0 10px hsl(var(--primary) / ${0.8 * (1 - deathAnimationRef.current)}))`
  };
  
  const currentViewboxSize = size * 2.5;
  const currentCenter = currentViewboxSize / 2;

  return (
    <div style={cellStyle} className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
      <svg ref={svgRef} width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        <defs>
            <filter id="organelle-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {hasEvolved && (
            <path
                className="outer-wall"
                fill="hsl(var(--foreground) / 0.05)"
                stroke="hsl(var(--foreground))"
                strokeWidth="3"
            />
        )}
        <path
          className="inner-wall"
          fill="hsl(var(--primary) / 0.2)"
          stroke="hsl(var(--foreground))"
          strokeWidth={hasEvolved ? "0" : "3"}
        />

        {/* Collected Organelles */}
        <g opacity={1 - deathAnimationRef.current}>
            {internalOrganelles.map(({ id, Component, x, y, rotation, size }) => (
                <g 
                    key={id} 
                    transform={`translate(${currentCenter + x * initialBaseRadius}, ${currentCenter + y * initialBaseRadius}) rotate(${rotation})`}
                    style={{ filter: 'url(#organelle-glow)' }}
                >
                    <Component size={size} />
                </g>
            ))}
        </g>
        
        {/* Nucleus */}
        <g className="nucleus-group" transform={`translate(${viewboxCenter}, ${viewboxCenter})`}>
            <circle className="nucleus" cx={0} cy={0} r={INITIAL_SIZE * 0.15} fill="hsl(var(--accent))" opacity="0.8" />
            <circle cx={0} cy={0} r={INITIAL_SIZE * 0.1} fill="hsl(var(--accent) / 0.5)" opacity={1-deathAnimationRef.current}/>
            <circle className="radiating-circle-1" cx={0} cy={0} r={0} fill="none" stroke="hsl(var(--accent))" strokeWidth="1" />
            <circle className="radiating-circle-2" cx={0} cy={0} r={0} fill="none" stroke="hsl(var(--accent))" strokeWidth="1" />
        </g>

        {/* Internal Particles */}
        <g opacity={1 - deathAnimationRef.current}>
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
        </g>
        
        {/* Damage Particles */}
        {damageParticles.map(p => (
            <rect 
                key={p.id}
                x={viewboxCenter + p.x}
                y={viewboxCenter + p.y}
                width={p.size}
                height={p.size}
                fill="hsl(var(--destructive))"
                opacity={p.opacity}
            />
        ))}

      </svg>
    </div>
  );
});

BioCell.displayName = 'BioCell';
