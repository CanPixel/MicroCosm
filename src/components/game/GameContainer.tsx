
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { BioCell, BioCellHandle } from "./BioCell";
import { GameUI } from "./GameUI";
import { GameOverDialog } from "./GameOverDialog";
import { Sugar } from "./Sugar";
import { Background } from "./Background";
import { Debris, DebrisItem } from "./Debris";
import { THEME_CALM, THEME_VIBRANT } from "@/lib/theme";
import { Autonomous } from "./Autonomous";

const INITIAL_CELL_SIZE = 50;
const MAX_CELL_SCORE = 600;
const MAX_SPEED = 8;
const LERP_FACTOR = 0.08;
const CAMERA_LERP_FACTOR = 0.05;
const ZOOM_LERP_FACTOR = 0.05;
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
const MAX_SUGAR = 200;
const SUGAR_SPAWN_INTERVAL = 1000; // ms
const MAX_THEME_SIZE = 300;
const COLLISION_PENALTY_FACTOR = 0.5; // Lose 50% of size difference
const ENERGY_PENALTY_FACTOR = 1; // Lose energy equal to size difference
const STARVATION_SIZE_DRAIN = 0.5; // Points per frame

type Position = { x: number; y: number };
type SugarParticle = Position & { size: number };


type GameContainerProps = {
    onGameOver: () => void;
};

// Helper to interpolate between two HSL colors
const lerpHSL = (
  [h1, s1, l1]: [number, number, number],
  [h2, s2, l2]: [number, number, number],
  t: number
): [number, number, number] => {
  return [
    h1 + (h2 - h1) * t,
    s1 + (s2 - s1) * t,
    l1 + (l2 - l1) * t,
  ];
};

export function GameContainer({ onGameOver }: GameContainerProps) {
  const [isGameOver, setIsGameOver] = useState(false);
  const [isStarving, setIsStarving] = useState(false);
  const [score, setScore] = useState(0);
  const [energy, setEnergy] = useState(100);

  const [cellSize, setCellSize] = useState(INITIAL_CELL_SIZE);
  const [font, setFont] = useState("font-zcool-kuaile");
  
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cellWrapperRef = useRef<HTMLDivElement>(null);
  const cellApiRef = useRef<BioCellHandle>(null);

  const keysPressedRef = useRef<{[key: string]: boolean}>({});
  const cellPositionRef = useRef<Position>({ x: 0, y: 0 });
  const cameraPositionRef = useRef<Position>({ x: 0, y: 0 });
  const velocityRef = useRef<Position>({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  
  const [sugars, setSugars] = useState<SugarParticle[]>([]);
  const [debris, setDebris] = useState<DebrisItem[]>([]);
  const [collectedOrganelles, setCollectedOrganelles] = useState<Set<string>>(new Set());
  const [eligibleOrganelles, setEligibleOrganelles] = useState<Set<string>>(new Set());
  const [cameraForParallax, setCameraForParallax] = useState({ x: 0, y: 0 });

  const animationFrameId = useRef<number>();
  const lastUpdateTimeRef = useRef(0);
  const lastSugarSpawnTimeRef = useRef(0);
  const updateInterval = 1000 / 60; // 60 FPS

  // Theme transition effect
  useEffect(() => {
    const progress = Math.min((cellSize - INITIAL_CELL_SIZE) / (MAX_THEME_SIZE - INITIAL_CELL_SIZE), 1);
    
    if (progress < 0) return;

    const newBg = lerpHSL(THEME_CALM.background, THEME_VIBRANT.background, progress);
    const newPrimary = lerpHSL(THEME_CALM.primary, THEME_VIBRANT.primary, progress);
    const newAccent = lerpHSL(THEME_CALM.accent, THEME_VIBRANT.accent, progress);

    const root = document.documentElement;
    root.style.setProperty('--background', `${newBg[0]} ${newBg[1]}% ${newBg[2]}%`);
    root.style.setProperty('--primary', `${newPrimary[0]} ${newPrimary[1]}% ${newPrimary[2]}%`);
    root.style.setProperty('--accent', `${newAccent[0]} ${newAccent[1]}% ${newAccent[2]}%`);
    
  }, [cellSize]);


  const spawnSugars = useCallback((count: number, immediate = false) => {
    if (!containerRef.current) return;
    const newSugars: SugarParticle[] = [];
    const { width, height } = containerRef.current.getBoundingClientRect();
    const spawnPadding = 100;

    for (let i = 0; i < count; i++) {
        const camX = cameraPositionRef.current.x;
        const camY = cameraPositionRef.current.y;
        
        let x, y;

        if (immediate) {
             // Spawn within a radius of the screen center for the initial set
             const angle = Math.random() * 2 * Math.PI;
             const radius = Math.random() * Math.min(width, height) * 0.7;
             x = camX + Math.cos(angle) * radius;
             y = camY + Math.sin(angle) * radius;
        } else {
            // Spawn randomly just off-screen
            const angle = Math.random() * 2 * Math.PI;
            const spawnRadius = Math.max(width, height) / (2 * zoomRef.current) + spawnPadding;
            x = camX + Math.cos(angle) * spawnRadius;
            y = camY + Math.sin(angle) * spawnRadius;
        }
        
        const size = Math.round(Math.random() * 8 + 4); // size between 4px and 12px

        newSugars.push({ 
            x: Math.max(0, Math.min(WORLD_WIDTH, x)), 
            y: Math.max(0, Math.min(WORLD_HEIGHT, y)),
            size,
        });
    }

    setSugars(prev => [...prev, ...newSugars]);
  }, []);

  const resetGame = useCallback(() => {
    if (!containerRef.current) return;
    
    setCellSize(INITIAL_CELL_SIZE);
    setScore(0);
    setEnergy(100);
    setIsStarving(false);
    
    const initialPosition = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
    cellPositionRef.current = initialPosition;
    cameraPositionRef.current = initialPosition;
    setCameraForParallax(initialPosition);

    velocityRef.current = { x: 0, y: 0 };
    if (cellWrapperRef.current) {
        const halfSvgSize = (INITIAL_CELL_SIZE * 2.5) / 2;
        cellWrapperRef.current.style.transform = `translate(${initialPosition.x - halfSvgSize}px, ${initialPosition.y - halfSvgSize}px)`;
    }
    keysPressedRef.current = {};
    
    // Initial sugar spawn
    setSugars([]);
    spawnSugars(30, true); 
    
    // Set initial debris
    setDebris(Debris());
    setCollectedOrganelles(new Set());
    setEligibleOrganelles(new Set());

    setIsGameOver(false);
  }, [spawnSugars]);

  useEffect(() => {
    if (containerRef.current) {
        resetGame();
    }
  }, [resetGame]);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressedRef.current[event.key.toLowerCase()] = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressedRef.current[event.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (isGameOver || !containerRef.current || !worldRef.current) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      return;
    }

    const elapsed = timestamp - lastUpdateTimeRef.current;

    if (elapsed < updateInterval) {
        animationFrameId.current = requestAnimationFrame(gameLoop);
        return;
    }
    lastUpdateTimeRef.current = timestamp;

    // --- Sugar Spawning ---
    if (timestamp - lastSugarSpawnTimeRef.current > SUGAR_SPAWN_INTERVAL) {
        if (sugars.length < MAX_SUGAR) {
            spawnSugars(5); // Spawn 5 new sugars
        }
        lastSugarSpawnTimeRef.current = timestamp;
    }

    // --- Player Movement ---
    const currentMaxSpeed = isStarving ? MAX_SPEED * 0.1 : MAX_SPEED;
    let targetVx = 0;
    let targetVy = 0;
    if (keysPressedRef.current['w'] || keysPressedRef.current['arrowup']) targetVy -= currentMaxSpeed;
    if (keysPressedRef.current['s'] || keysPressedRef.current['arrowdown']) targetVy += currentMaxSpeed;
    if (keysPressedRef.current['a'] || keysPressedRef.current['arrowleft']) targetVx -= currentMaxSpeed;
    if (keysPressedRef.current['d'] || keysPressedRef.current['arrowright']) targetVx += currentMaxSpeed;

    velocityRef.current.x += (targetVx - velocityRef.current.x) * LERP_FACTOR;
    velocityRef.current.y += (targetVy - velocityRef.current.y) * LERP_FACTOR;
    
    cellPositionRef.current.x = Math.max(0, Math.min(WORLD_WIDTH, cellPositionRef.current.x + velocityRef.current.x));
    cellPositionRef.current.y = Math.max(0, Math.min(WORLD_HEIGHT, cellPositionRef.current.y + velocityRef.current.y));
    
    if (cellApiRef.current) {
        cellApiRef.current.updateVelocity(velocityRef.current.x, velocityRef.current.y);
    }

    const halfSvgSize = (cellSize * 2.5) / 2;
    if (cellWrapperRef.current) {
        cellWrapperRef.current.style.transform = `translate(${cellPositionRef.current.x - halfSvgSize}px, ${cellPositionRef.current.y - halfSvgSize}px)`;
    }

    // --- Camera and Zoom ---
    const { width, height } = containerRef.current.getBoundingClientRect();
    const zoomOutFactor = 0.02;
    const initialZoom = 2.0;
    const targetZoom = Math.max(0.2, initialZoom / (1 + (cellSize - INITIAL_CELL_SIZE) * zoomOutFactor));

    zoomRef.current += (targetZoom - zoomRef.current) * ZOOM_LERP_FACTOR;
    const zoom = zoomRef.current;

    cameraPositionRef.current.x += (cellPositionRef.current.x - cameraPositionRef.current.x) * CAMERA_LERP_FACTOR;
    cameraPositionRef.current.y += (cellPositionRef.current.y - cameraPositionRef.current.y) * CAMERA_LERP_FACTOR;
    
    setCameraForParallax({ x: cameraPositionRef.current.x, y: cameraPositionRef.current.y });

    const camX = -cameraPositionRef.current.x * zoom + width / 2;
    const camY = -cameraPositionRef.current.y * zoom + height / 2;
    
    worldRef.current.style.transform = `translate(${camX}px, ${camY}px) scale(${zoom})`;
    
    // --- Collision & Consumption ---
    const currentCellRadius = cellSize / 2;

    // Sugars
    let totalScoreGained = 0;
    let totalEnergyGained = 0;
    let totalSizeGained = 0;
    const remainingSugars: SugarParticle[] = [];

    for (const sugar of sugars) {
        const dx = cellPositionRef.current.x - sugar.x;
        const dy = cellPositionRef.current.y - sugar.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < currentCellRadius) {
            // Reward is proportional to the sugar's size (base is a 8px size)
            const sizeMultiplier = sugar.size / 8;
            totalScoreGained += 10 * sizeMultiplier;
            totalEnergyGained += 5 * sizeMultiplier;
            totalSizeGained += 4 * sizeMultiplier;
        } else {
            remainingSugars.push(sugar);
        }
    }
    
    if (totalScoreGained > 0 && score < MAX_CELL_SCORE) {
      const newScore = Math.min(MAX_CELL_SCORE, score + totalScoreGained);
      const newSize = Math.min(INITIAL_CELL_SIZE + (MAX_CELL_SCORE - INITIAL_CELL_SIZE), cellSize + totalSizeGained);
      
      setScore(Math.round(newScore));
      setCellSize(newSize);
      const newEnergy = Math.min(100, energy + totalEnergyGained)
      setEnergy(newEnergy);
      if (newEnergy > 0) {
        setIsStarving(false);
      }
      setSugars(remainingSugars);
    }
    
    // Organelles & Harmful Collisions
    const remainingDebris: DebrisItem[] = [];
    let collectedAny = false;
    const newEligibleOrganelles = new Set<string>();

    for(const d of debris) {
        const isOrganelle = (d.Component as any).isOrganelle;
        const organismSize = d.props.size;
        const organismPosition = d.props.position;
        const dx = cellPositionRef.current.x - organismPosition.x;
        const dy = cellPositionRef.current.y - organismPosition.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const collisionThreshold = currentCellRadius + organismSize / 2;

        if (isOrganelle) {
            // Check for eligibility
            if(cellSize > organismSize) {
                newEligibleOrganelles.add(d.id);
            }

            // Check for collection only if eligible in this frame
            if (newEligibleOrganelles.has(d.id) && dist < collisionThreshold) {
                setCollectedOrganelles(prev => new Set(prev).add((d.Component as any).type));
                collectedAny = true;
            } else {
                remainingDebris.push(d);
            }
        } else { // It's another organism, check for harmful collision
            if (dist < collisionThreshold && cellSize < organismSize) {
                const sizeDifference = organismSize - cellSize;
                const sizePenalty = sizeDifference * COLLISION_PENALTY_FACTOR;
                const energyPenalty = sizeDifference * ENERGY_PENALTY_FACTOR;

                setCellSize(cs => Math.max(INITIAL_CELL_SIZE / 2, cs - sizePenalty));
                setScore(s => Math.max(0, s - sizePenalty));
                setEnergy(e => Math.max(0, e - energyPenalty));

                if (cellApiRef.current) {
                    cellApiRef.current.takeDamage();
                }
            }
            remainingDebris.push(d);
        }
    }

    if (collectedAny) {
      setDebris(remainingDebris);
    }

    // Update eligible organelles state if it has changed
    if (newEligibleOrganelles.size !== eligibleOrganelles.size || ![...newEligibleOrganelles].every(id => eligibleOrganelles.has(id))) {
        setEligibleOrganelles(newEligibleOrganelles);
    }


    // --- Energy Drain & Starvation Logic ---
    let currentEnergy = energy;
    let currentScore = score;
    let currentCellSize = cellSize;

    if (isStarving) {
      currentScore = Math.max(0, score - STARVATION_SIZE_DRAIN);
      currentCellSize = Math.max(1, cellSize - STARVATION_SIZE_DRAIN);
      setScore(currentScore);
      setCellSize(currentCellSize);
    } else {
      currentEnergy = Math.max(0, energy - 0.01);
      setEnergy(currentEnergy);
    }
    
    // --- Game State Checks (Starvation, Game Over) ---
    if (currentEnergy <= 0 && !isStarving) {
      setIsStarving(true);
    }

    if (isStarving && currentScore <= 0) {
      setIsGameOver(true);
    }

    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [isGameOver, isStarving, cellSize, score, energy, sugars, debris, spawnSugars, eligibleOrganelles]);

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameLoop]);
  
  const passiveDebris = debris.filter(d => (d.Component as any).isOrganelle);
  const activeDebris = debris.filter(d => !(d.Component as any).isOrganelle);


  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-background">
        <Background cameraPosition={cameraForParallax} />

        <div ref={worldRef} className="absolute top-0 left-0" style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT, transformOrigin: '0 0' }}>

            {/* Layer for Passive/Background Organelles */}
            <div className="absolute inset-0 z-10">
                {passiveDebris.map(d => {
                     if (eligibleOrganelles.has(d.id)) return null; // Render in the foreground layer
                     return <d.Component key={d.id} {...d.props} />;
                })}
            </div>

            {/* Layer for Active Organisms */}
            <div className="absolute inset-0 z-10">
                {activeDebris.map(d => {
                    if (d.isAutonomous) {
                        return (
                             <Autonomous key={d.id} initialPosition={d.initialPosition}>
                                <d.Component {...d.props} />
                            </Autonomous>
                        )
                    }
                    return <d.Component key={d.id} {...d.props} />;
                  })}
            </div>
            
            {/* Layer for Eligible Organelles & Sugar */}
            <div className="absolute inset-0 z-20">
                {sugars.map((sugar, i) => <Sugar key={`s-${i}`} position={sugar} size={sugar.size} />)}
                {passiveDebris.map(d => {
                     if (!eligibleOrganelles.has(d.id)) return null;
                     const glowStyle: React.CSSProperties = {
                       filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.7))',
                       position: 'absolute',
                       top: d.props.position.y,
                       left: d.props.position.x,
                       width: d.props.size,
                       height: d.props.size,
                     };
                     return (
                        <div key={d.id} style={glowStyle}>
                           <d.Component {...d.props} opacity={1} position={{x:0, y:0}}/>
                        </div>
                     )
                })}
            </div>

            <div ref={cellWrapperRef} className="absolute z-30">
                <BioCell ref={cellApiRef} size={cellSize} score={score} />
            </div>
        </div>
        
        <GameUI
            cellSize={cellSize}
            score={score}
            energy={energy}
            isStarving={isStarving}
            font={font}
            onFontChange={(newFont) => {
              if (newFont) setFont(newFont);
            }}
            collectedOrganelles={collectedOrganelles}
        />

        <GameOverDialog score={score} isOpen={isGameOver} onRestart={onGameOver} />
    </div>
  );
}
