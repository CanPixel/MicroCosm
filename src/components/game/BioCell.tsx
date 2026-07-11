
"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useMemo, useState, useCallback } from 'react';
import { InnerMitochondrion } from './InnerMitochondrion';
import { InnerGolgiApparatus } from './InnerGolgiApparatus';
import { InnerCellNucleus } from './InnerCellNucleus';
import { Bacteriophage } from './Bacteriophage';
import { cn } from '@/lib/utils';
import { convexHull, hullRadiusAtAngle, Pt } from '@/lib/game/hull';

type Point = { x: number; y: number };

const INITIAL_SIZE = 50;
const EVOLUTION_SCORE_THRESHOLD = 100;
const EVOLUTION_SIZE_MULTIPLIER = 1.4;

// Membrane: a springy cytoskeleton ring whose convex hull (together with the
// internal organelles) forms the cell wall, resampled at fixed angles.
const NUM_NODES = 16;
const MEMBRANE_SAMPLES = 30;

// A structural node in the cytoskeleton ring.
type MembraneNode = {
  angle: number; // fixed rest angle
  restR: number; // rest radius as a fraction of the cell's base radius
  r: number; // current radius (px), spring-animated
  vr: number; // radial velocity (px/frame)
};

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
  isInfected: boolean;
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
    size: number;
};

// Mutable per-organelle drift state, animated imperatively so the drift never
// triggers a React re-render.
type OrganelleMotion = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
};

const organelleMap: { [key: string]: React.FC<any> } = {
  mitochondrion: InnerMitochondrion,
  golgi: InnerGolgiApparatus,
  nucleus: InnerCellNucleus,
};


export const BioCell = forwardRef<BioCellHandle, BioCellProps>(({ size, score, isDying, collectedOrganelles, isInfected }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const sizeRef = useRef(size);
  const collectedOrganellesRef = useRef(collectedOrganelles);

  sizeRef.current = size;
  collectedOrganellesRef.current = collectedOrganelles;

  const [hasEvolved, setHasEvolved] = useState(false);
  const [damageParticles, setDamageParticles] = useState<DamageParticle[]>([]);
  const [internalOrganelles, setInternalOrganelles] = useState<InternalOrganelle[]>([]);
  const organelleMotionRef = useRef<Map<string, OrganelleMotion>>(new Map());
  const organelleElsRef = useRef<Map<string, SVGGElement>>(new Map());
  const evolutionFactorRef = useRef(1);
  const damageAnimationRef = useRef(0);
  const deathAnimationRef = useRef(0);
  const [attachmentAngle, setAttachmentAngle] = useState(0);
  const prevIsInfected = useRef(false);

  useEffect(() => {
    if (isInfected && !prevIsInfected.current) {
        setAttachmentAngle(Math.random() * Math.PI * 2);
    }
    prevIsInfected.current = isInfected;
  }, [isInfected]);


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
  
  const svgSize = useMemo(() => size * 2.5, [size]);
  const viewboxCenter = useMemo(() => svgSize / 2, [svgSize]);

  const initialBaseRadius = useMemo(() => INITIAL_SIZE / 2, []);


  // Cytoskeleton nodes and the smoothed per-angle membrane radii (px).
  const membraneNodesRef = useRef<MembraneNode[]>([]);
  const membraneSamplesRef = useRef<number[]>([]);

  // Internal particles
  const particlesRef = useRef<Particle[]>([]);
  
  // Add new organelles when collected
  useEffect(() => {
    const existingTypes = new Set(internalOrganelles.map(o => o.type));
    const newOrganelles: InternalOrganelle[] = [];
    
    collectedOrganelles.forEach(type => {
        if (!existingTypes.has(type) && organelleMap[type]) {
            const id = `${type}-${Date.now()}`;
            organelleMotionRef.current.set(id, {
                x: (Math.random() * 0.6 - 0.3), // Start away from center
                y: (Math.random() * 0.6 - 0.3),
                vx: (Math.random() - 0.5) * 0.015,
                vy: (Math.random() - 0.5) * 0.015,
                rotation: Math.random() * 360,
            });
            newOrganelles.push({
                id,
                type: type,
                Component: organelleMap[type],
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
    }
  }, [score, hasEvolved]);


  useEffect(() => {
    // Initialize the springy cytoskeleton ring that seeds the membrane hull.
    const base = INITIAL_SIZE / 2;
    membraneNodesRef.current = Array.from({ length: NUM_NODES }, (_, i) => {
      const restR = 0.82 + Math.random() * 0.1;
      return {
        angle: (i / NUM_NODES) * 2 * Math.PI,
        restR,
        r: base * restR,
        vr: 0,
      };
    });
    membraneSamplesRef.current = Array.from({ length: MEMBRANE_SAMPLES }, () => base);

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
  }, []);

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

      // Organelles drift through the cytoplasm and scale with the cell. Their
      // positions (in px, relative to center) feed the membrane hull below, so
      // an organelle near the wall visibly bulges the membrane outward.
      const orgScale = Math.min(3.2, Math.max(0.7, currentBaseRadius / 55));
      organelleMotionRef.current.forEach((motion, id) => {
          motion.x += motion.vx;
          motion.y += motion.vy;

          // Keep organelles just inside the structural ring.
          if (motion.x < -0.78 || motion.x > 0.78) motion.vx *= -1;
          if (motion.y < -0.78 || motion.y > 0.78) motion.vy *= -1;
          motion.x = Math.max(-0.78, Math.min(0.78, motion.x));
          motion.y = Math.max(-0.78, Math.min(0.78, motion.y));
          motion.rotation += 0.5;

          const el = organelleElsRef.current.get(id);
          if (el) {
              const px = currentViewboxCenter + motion.x * currentBaseRadius + inertiaOffsetX;
              const py = currentViewboxCenter + motion.y * currentBaseRadius + inertiaOffsetY;
              el.setAttribute('transform', `translate(${px}, ${py}) scale(${orgScale}) rotate(${motion.rotation})`);
          }
      });


      // Animate particles
      particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        
        const boundary = 0.35;
        if (p.x < -boundary || p.x > boundary) p.vx *= -1;
        if (p.y < -boundary || p.y > boundary) p.vy *= -1;
        
        const particleEl = particleElements[i] as SVGCircleElement;
        if (particleEl) {
            particleEl.setAttribute('cx', `${currentViewboxCenter + p.x * initialBaseRadius + inertiaOffsetX}`);
            particleEl.setAttribute('cy', `${currentViewboxCenter + p.y * initialBaseRadius + inertiaOffsetY}`);
        }
      });
      
      // Skip the state update entirely while there are no live particles, so
      // the burst only costs re-renders for the moment it is visible.
      setDamageParticles(prev => {
        if (prev.length === 0) return prev;
        return prev.map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            opacity: p.opacity - 0.02,
        })).filter(p => p.opacity > 0);
      });

      // --- Deformable membrane: node physics -> convex hull -> resample ---
      // Movement stretches the cell along its travel axis; the springy nodes
      // give it jelly-like overshoot; the convex hull of nodes + organelles
      // produces organelle-driven bulges and can never dent inward.
      const stretchFactor = speed > 0.1 ? Math.min(speed / 10, 0.4) : 0;
      const wobbleFactor = Math.max(0.2, 1 - (currentSize - INITIAL_SIZE) / 500);
      const ringRotation = time / (5000 + (currentSize - INITIAL_SIZE) * 10);

      // 1. Advance the cytoskeleton nodes and collect the hull point cloud.
      const cloud: Pt[] = [];
      for (const node of membraneNodesRef.current) {
        // Occasionally retarget the rest radius for a slow organic wobble.
        if (Math.random() < 0.02 * wobbleFactor) {
          node.restR = 0.82 + Math.random() * 0.12 * wobbleFactor;
        }
        const a = node.angle + ringRotation;
        let targetR = node.restR * currentBaseRadius * damageScale;
        if (stretchFactor > 0) {
          const angleDiff = Math.cos(a - movementAngle);
          targetR += angleDiff * currentBaseRadius * stretchFactor; // elongate along motion
          targetR -= (1 - Math.abs(angleDiff)) * currentBaseRadius * stretchFactor * 0.5; // squash sides
        }
        // Critically-damped-ish spring for a lively but stable membrane.
        node.vr += (targetR - node.r) * 0.18;
        node.vr *= 0.72;
        node.r += node.vr;
        cloud.push({ x: node.r * Math.cos(a), y: node.r * Math.sin(a) });
      }

      // 2. Organelles push the hull outward where they orbit near the wall.
      const orgPush = currentBaseRadius * 0.16;
      organelleMotionRef.current.forEach((motion) => {
        const ox = motion.x * currentBaseRadius;
        const oy = motion.y * currentBaseRadius;
        const dist = Math.hypot(ox, oy) || 1;
        cloud.push({ x: ox + (ox / dist) * orgPush, y: oy + (oy / dist) * orgPush });
      });

      // 3. Convex hull, resampled to fixed angles and temporally smoothed.
      const hull = convexHull(cloud);
      const samples = membraneSamplesRef.current;
      animatedWallPoints = samples.map((prevR, i) => {
        const ang = (i / MEMBRANE_SAMPLES) * 2 * Math.PI;
        let r = hullRadiusAtAngle(hull, ang);
        if (!(r > 0)) r = currentBaseRadius;
        r = Math.max(minCellRadius, r);
        const smoothed = prevR + (r - prevR) * 0.35;
        samples[i] = smoothed;
        return {
          x: currentViewboxCenter + smoothed * Math.cos(ang),
          y: currentViewboxCenter + smoothed * Math.sin(ang),
        };
      });

      const innerSvgPath = catmullRomSpline(animatedWallPoints);
      innerPath.setAttribute('d', innerSvgPath);
      innerPath.setAttribute('fill-opacity', `${Math.max(0, 1 - deathProgress)}`);
      innerPath.setAttribute('stroke-width', `${Math.max(0, (hasEvolved ? 0 : 3) * (1 - deathProgress))}`);

      if (hasEvolved && outerPath) {
        const evo = evolutionFactorRef.current;
        animatedOuterWallPoints = samples.map((r, i) => {
          const ang = (i / MEMBRANE_SAMPLES) * 2 * Math.PI;
          const rr = r * evo;
          return {
            x: currentViewboxCenter + rr * Math.cos(ang),
            y: currentViewboxCenter + rr * Math.sin(ang),
          };
        });
        outerPath.setAttribute('d', catmullRomSpline(animatedOuterWallPoints));
        outerPath.setAttribute('stroke-width', `${Math.max(0, 3 * (1 - deathProgress))}`);
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEvolved, isDying]);

  const containerSize = svgSize * 1.5; // Make container larger than SVG to prevent clipping

  const cellStyle: React.CSSProperties = {
    width: `${containerSize}px`,
    height: `${containerSize}px`,
    filter: `drop-shadow(0 0 10px hsl(var(--primary) / ${0.8 * (1 - deathAnimationRef.current)}))`
  };
  
  const currentViewboxSize = size * 2.5;
  const currentCenter = currentViewboxSize / 2;

  const phageSize = Math.max(30, size * 0.2); // Attached phage size
  const phageAttachmentRadius = size * 0.8;
  const phageAttachmentX = currentCenter + phageAttachmentRadius * Math.cos(attachmentAngle);
  const phageAttachmentY = currentCenter + phageAttachmentRadius * Math.sin(attachmentAngle);
  const phageRotation = attachmentAngle * (180 / Math.PI) - 90; // Align with radius, pointing legs in

  const phagePositionStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${phageAttachmentY - phageSize / 2}px`,
    left: `${phageAttachmentX - phageSize / 2}px`,
    width: `${phageSize}px`,
    height: `${phageSize}px`,
    transformOrigin: '50% 50%',
    transform: `rotate(${phageRotation}deg)`
  };


  return (
    <div style={cellStyle} className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
       {isInfected && !isDying && (
         <div style={phagePositionStyle}>
            {/* Wobble on an inner wrapper: animating transform on the outer
                div would clobber its positioning rotate(). */}
            <div className="animate-wobble w-full h-full">
                <Bacteriophage
                    position={{x: 0, y: 0}}
                    size={phageSize}
                    duration={5}
                    delay={0}
                    opacity={1}
                />
            </div>
         </div>
       )}
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
          fill="url(#mc-cytoplasm)"
          stroke="hsl(var(--foreground))"
          strokeWidth={hasEvolved ? "0" : "3"}
        />

        {/* Collected Organelles */}
        <g opacity={1 - deathAnimationRef.current}>
            {internalOrganelles.map(({ id, Component, size }) => {
                const motion = organelleMotionRef.current.get(id);
                return (
                    <g
                        key={id}
                        ref={(el) => {
                            if (el) organelleElsRef.current.set(id, el);
                            else organelleElsRef.current.delete(id);
                        }}
                        transform={`translate(${currentCenter + (motion?.x ?? 0) * initialBaseRadius}, ${currentCenter + (motion?.y ?? 0) * initialBaseRadius}) rotate(${motion?.rotation ?? 0})`}
                        style={{ filter: 'url(#organelle-glow)' }}
                    >
                        <Component size={size} />
                    </g>
                );
            })}
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

    
    