
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
const MIN_CELL_SIZE_FROM_DAMAGE = 11;
const MAX_SPEED = 8;
const LERP_FACTOR = 0.08;
const CAMERA_LERP_FACTOR = 0.05;
const ZOOM_LERP_FACTOR = 0.05;
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
const MAX_SUGAR = 100;
const BASE_SUGAR_SPAWN_INTERVAL = 2000; // ms
const SUGAR_LIFETIME = 20000; // 20 seconds
const MAX_THEME_SIZE = 300;
const COLLISION_PENALTY_FACTOR = 0.1; // Lose 10% of size difference
const ENERGY_PENALTY_FACTOR = 1; // Lose energy equal to size difference
const STARVATION_SIZE_DRAIN = 0.5; // Points per frame
const DAMAGE_COOLDOWN = 1000; // 1 second invulnerability
const RENDER_PADDING = 300; // The buffer around the viewport to render entities

type Position = { x: number; y: number };
type SugarParticle = Position & { id: string; size: number, createdAt: number };
type OrganismState = {
    position: Position;
    size: number;
    collisionSize: number;
};
type OrganismStateMap = { [id: string]: OrganismState };


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
  const [isInvulnerable, setIsInvulnerable] = useState(false);

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
  const lastDamageTimeRef = useRef(0);
  
  const [sugars, setSugars] = useState<SugarParticle[]>([]);
  const [debris, setDebris] = useState<DebrisItem[]>([]);
  const [organismStates, setOrganismStates] = useState<OrganismStateMap>({});
  const [collectedOrganelles, setCollectedOrganelles] = useState<Set<string>>(new Set());
  const [eligibleOrganelles, setEligibleOrganelles] = useState<Set<string>>(new Set());
  const [cameraForParallax, setCameraForParallax] = useState({ x: 0, y: 0 });

  // State for entities within the render buffer
  const [renderedSugars, setRenderedSugars] = useState<SugarParticle[]>([]);
  const [renderedDebris, setRenderedDebris] = useState<DebrisItem[]>([]);

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
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        const camX = cameraPositionRef.current.x;
        const camY = cameraPositionRef.current.y;
        
        let x, y;
        
        // Spawn randomly just off-screen in a circle
        const angle = Math.random() * 2 * Math.PI;
        const spawnRadius = immediate ? 
            Math.random() * Math.min(width, height) * 0.7 :
            Math.max(width, height) / (2 * zoomRef.current) + spawnPadding;

        x = camX + Math.cos(angle) * spawnRadius;
        y = camY + Math.sin(angle) * spawnRadius;
        
        const size = Math.round(Math.random() * 8 + 4); // size between 4px and 12px

        newSugars.push({ 
            id: `sugar-${now}-${i}`,
            x: Math.max(0, Math.min(WORLD_WIDTH, x)), 
            y: Math.max(0, Math.min(WORLD_HEIGHT, y)),
            size,
            createdAt: now,
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
        const halfSvgSize = (INITIAL_CELL_SIZE * 2.5 * 1.5) / 2;
        cellWrapperRef.current.style.transform = `translate(${initialPosition.x - halfSvgSize}px, ${initialPosition.y - halfSvgSize}px)`;
    }
    keysPressedRef.current = {};
    
    // Initial sugar spawn
    setSugars([]);
    spawnSugars(30, true); 
    
    // Set initial debris
    const initialDebris = Debris();
    setDebris(initialDebris);
    
    const initialOrganismStates: OrganismStateMap = {};
    initialDebris.forEach(d => {
        initialOrganismStates[d.id] = {
            position: d.initialPosition,
            size: d.props.size,
            collisionSize: d.collisionSize,
        };
    });
    setOrganismStates(initialOrganismStates);

    setCollectedOrganelles(new Set());
    setEligibleOrganelles(new Set());
    setIsInvulnerable(false);
    lastDamageTimeRef.current = 0;

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

  const handleOrganismPositionChange = useCallback((id: string, newPosition: Position) => {
    setOrganismStates(prev => ({
        ...prev,
        [id]: { ...prev[id], position: newPosition },
    }));
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (isGameOver || !containerRef.current || !worldRef.current) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      return;
    }

    const elapsed = timestamp - lastUpdateTimeRef.current;
    const now = Date.now();

    if (elapsed < updateInterval) {
        animationFrameId.current = requestAnimationFrame(gameLoop);
        return;
    }
    lastUpdateTimeRef.current = timestamp;

    const { width, height } = containerRef.current.getBoundingClientRect();
    const currentZoom = zoomRef.current;
    
    // --- Determine Render Area ---
    const renderWidth = (width / currentZoom) + RENDER_PADDING * 2;
    const renderHeight = (height / currentZoom) + RENDER_PADDING * 2;
    const viewLeft = cameraPositionRef.current.x - renderWidth / 2;
    const viewRight = cameraPositionRef.current.x + renderWidth / 2;
    const viewTop = cameraPositionRef.current.y - renderHeight / 2;
    const viewBottom = cameraPositionRef.current.y + renderHeight / 2;

    // --- Filter entities to only those in the render area ---
    const localDebris = debris.filter(d => {
        const state = organismStates[d.id];
        if (!state) return false;
        return state.position.x > viewLeft && state.position.x < viewRight && state.position.y > viewTop && state.position.y < viewBottom;
    });
    setRenderedDebris(localDebris);

    const localSugars = sugars.filter(s => {
        return s.x > viewLeft && s.x < viewRight && s.y > viewTop && s.y < viewBottom;
    });
    setRenderedSugars(localSugars);

    // --- Sugar Spawning & Despawning ---
    const growthFactor = Math.max(1, (cellSize - INITIAL_CELL_SIZE) / 100);
    const dynamicSpawnInterval = BASE_SUGAR_SPAWN_INTERVAL * growthFactor;

    if (timestamp - lastSugarSpawnTimeRef.current > dynamicSpawnInterval) {
        if (sugars.length < MAX_SUGAR) {
            spawnSugars(5);
        }
        lastSugarSpawnTimeRef.current = timestamp;
    }

    setSugars(currentSugars => currentSugars.filter(sugar => {
        const isOutsideRender = sugar.x < viewLeft || sugar.x > viewRight || sugar.y < viewTop || sugar.y < viewBottom;
        if (isOutsideRender && (now - sugar.createdAt > SUGAR_LIFETIME)) {
            return false; // Despawn only if off-screen and expired
        }
        return true;
    }));

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

    const halfSvgContainerSize = (cellSize * 2.5 * 1.5) / 2;
    if (cellWrapperRef.current) {
      cellWrapperRef.current.style.transform = `translate(${cellPositionRef.current.x - halfSvgContainerSize}px, ${cellPositionRef.current.y - halfSvgContainerSize}px)`;
    }

    // --- Camera and Zoom ---
    const zoomOutFactor = 0.02;
    const initialZoom = 2.0;
    const sizeForZoom = Math.max(MIN_CELL_SIZE_FROM_DAMAGE, cellSize);
    const targetZoom = Math.max(0.4, initialZoom / (1 + (sizeForZoom - INITIAL_CELL_SIZE) * zoomOutFactor));

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

    // Sugars (Player) - check against only local sugars
    let totalScoreGained = 0;
    let totalEnergyGained = 0;
    let totalSizeGained = 0;
    let eatenSugarIds = new Set<string>();

    for (const sugar of localSugars) {
        const dx = cellPositionRef.current.x - sugar.x;
        const dy = cellPositionRef.current.y - sugar.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < currentCellRadius) {
            const sizeMultiplier = sugar.size / 8;
            totalScoreGained += 10 * sizeMultiplier;
            totalEnergyGained += 5 * sizeMultiplier;
            totalSizeGained += 4 * sizeMultiplier;
            eatenSugarIds.add(sugar.id);
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
    }

    // Sugars (Debris) - check against only local sugars
    let organismSizeChanges: {[id: string]: number} = {};

    for (const sugar of localSugars) {
        if (eatenSugarIds.has(sugar.id)) continue;

        // Only check against local autonomous debris
        for (const d of localDebris) {
            if (d.isAutonomous) {
                const organismState = organismStates[d.id];
                if (!organismState) continue;

                const dx = organismState.position.x - sugar.x;
                const dy = organismState.position.y - sugar.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const collisionThreshold = organismState.size / 2;

                if (dist < collisionThreshold) {
                    const sizeMultiplier = sugar.size / 8;
                    organismSizeChanges[d.id] = (organismSizeChanges[d.id] || 0) + (1 * sizeMultiplier);
                    eatenSugarIds.add(sugar.id);
                    break; 
                }
            }
        }
    }
    
    if (eatenSugarIds.size > 0) {
        setSugars(currentSugars => currentSugars.filter(s => !eatenSugarIds.has(s.id)));
    }


    if (Object.keys(organismSizeChanges).length > 0) {
        setOrganismStates(prev => {
            const newStates = { ...prev };
            for (const id in organismSizeChanges) {
                if (newStates[id]) {
                    newStates[id] = { ...newStates[id], size: newStates[id].size + organismSizeChanges[id] };
                }
            }
            return newStates;
        });
    }
    
    
    // Organelles & Harmful Collisions - check against only local debris
    const newEligibleOrganelles = new Set<string>();
    const collectedOrganelleTypesThisFrame = new Set<string>();
    const collectedDebrisIds = new Set<string>();

    for (const d of localDebris) {
        const organismState = organismStates[d.id];
        if (!organismState) continue;
        const componentType = d.Component as any;

        // Check for organelle collection eligibility
        if (componentType.isOrganelle) {
            const isEligible = cellSize > organismState.size;
            if (isEligible) {
                newEligibleOrganelles.add(d.id);
                const dx = cellPositionRef.current.x - organismState.position.x;
                const dy = cellPositionRef.current.y - organismState.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const collisionThreshold = currentCellRadius;

                if (dist < collisionThreshold) {
                    collectedOrganelleTypesThisFrame.add(componentType.type);
                    collectedDebrisIds.add(d.id);
                }
            }
        }
    }
    
    // Harmful collisions check
    if (now - lastDamageTimeRef.current > DAMAGE_COOLDOWN) {
        if (isInvulnerable) setIsInvulnerable(false);

        for (const d of localDebris) {
            const componentType = d.Component as any;
            if (componentType.isHarmful) {
                const organismState = organismStates[d.id];
                if (!organismState) continue;

                const dx = cellPositionRef.current.x - organismState.position.x;
                const dy = cellPositionRef.current.y - organismState.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const collisionThreshold = currentCellRadius + organismState.collisionSize / 2;
                
                if (dist < collisionThreshold && cellSize < organismState.size) {
                    const sizeDifference = organismState.size - cellSize;
                    const sizePenalty = sizeDifference * COLLISION_PENALTY_FACTOR;
                    const energyPenalty = sizeDifference * ENERGY_PENALTY_FACTOR;

                    setCellSize(cs => Math.max(MIN_CELL_SIZE_FROM_DAMAGE, cs - sizePenalty));
                    setScore(s => Math.max(MIN_CELL_SIZE_FROM_DAMAGE, s - sizePenalty));
                    setEnergy(e => Math.max(0, e - energyPenalty));
                    
                    const bounceFactor = 15;
                    velocityRef.current.x = -(dx / dist) * bounceFactor;
                    velocityRef.current.y = -(dy / dist) * bounceFactor;

                    if (cellApiRef.current) {
                        cellApiRef.current.takeDamage();
                    }

                    lastDamageTimeRef.current = now;
                    setIsInvulnerable(true);
                    break; // Only handle one collision per frame
                }
            }
        }
    }
    
    // Update state based on collections
    if (collectedDebrisIds.size > 0) {
      setDebris(currentDebris => currentDebris.filter(d => !collectedDebrisIds.has(d.id)));
      setCollectedOrganelles(prev => new Set([...prev, ...collectedOrganelleTypesThisFrame]));
    }
    
    if (newEligibleOrganelles.size !== eligibleOrganelles.size || ![...newEligibleOrganelles].every(id => eligibleOrganelles.has(id))) {
        setEligibleOrganelles(newEligibleOrganelles);
    }


    // --- Energy Drain & Starvation Logic ---
    let currentEnergy = energy;
    let currentScore = score;
    let currentCellSize = cellSize;

    if (isStarving) {
      currentScore = Math.max(0, score - STARVATION_SIZE_DRAIN);
      currentCellSize = Math.max(0, cellSize - STARVATION_SIZE_DRAIN);
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
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }

    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [isGameOver, isStarving, cellSize, score, energy, sugars, debris, spawnSugars, eligibleOrganelles, organismStates, handleOrganismPositionChange, isInvulnerable]);

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameLoop]);
  
  // Separate debris into background and interactive for rendering
  const backgroundDebris = renderedDebris.filter(d => {
    const componentType = d.Component as any;
    return !componentType.isOrganelle && !componentType.isHarmful;
  });

  const interactiveDebris = renderedDebris.filter(d => {
    const componentType = d.Component as any;
    return componentType.isOrganelle || componentType.isHarmful;
  });

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-background">
        <Background cameraPosition={cameraForParallax} />

        <div ref={worldRef} className="absolute top-0 left-0" style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT, transformOrigin: '0 0' }}>

            {/* Layer for ambient, non-interactive organisms */}
            <div className="absolute inset-0 z-10">
                {backgroundDebris.map(d => {
                     const organismState = organismStates[d.id];
                     if (!organismState) return null;

                     if (d.isAutonomous) {
                        return (
                             <Autonomous 
                                key={d.id} 
                                initialPosition={d.initialPosition}
                                onPositionChange={(newPos) => handleOrganismPositionChange(d.id, newPos)}
                                size={organismState.size}
                             >
                                <d.Component {...d.props} />
                            </Autonomous>
                        )
                    }
                    return <d.Component key={d.id} {...d.props} position={organismState.position} size={organismState.size}/>;
                })}
            </div>

            {/* Layer for Sugar, Harmful Organisms, and Eligible Organelles */}
            <div className="absolute inset-0 z-20">
                {renderedSugars.map((sugar) => <Sugar key={sugar.id} position={sugar} size={sugar.size} />)}

                {interactiveDebris.map(d => {
                    const organismState = organismStates[d.id];
                    if (!organismState) return null;
                    const componentType = d.Component as any;

                    // Don't render organelles unless they are eligible for collection
                    if (componentType.isOrganelle && !eligibleOrganelles.has(d.id)) {
                        return null;
                    }
                    
                    const glowStyle: React.CSSProperties = {
                       filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.7))',
                       position: 'absolute',
                       top: organismState.position.y,
                       left: organismState.position.x,
                       width: organismState.size,
                       height: organismState.size,
                     };
                     
                     const componentToRender = d.isAutonomous ? (
                        <Autonomous 
                            key={d.id} 
                            initialPosition={d.initialPosition}
                            onPositionChange={(newPos) => handleOrganismPositionChange(d.id, newPos)}
                            size={organismState.size}
                         >
                            <d.Component {...d.props} opacity={1} position={{x:0, y:0}}/>
                        </Autonomous>
                     ) : (
                        <d.Component key={d.id} {...d.props} opacity={1} position={organismState.position} size={organismState.size}/>
                     );
                     
                     // Add glow effect only to eligible organelles
                     if (componentType.isOrganelle && eligibleOrganelles.has(d.id)) {
                        return <div key={d.id} style={glowStyle}>{componentToRender}</div>
                     }
                     
                     return componentToRender;
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
