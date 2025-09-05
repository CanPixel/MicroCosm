
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
import { SpikyVirus } from "./SpikyVirus";
import { FungiWall } from "./FungiWall";
import { cn } from "@/lib/utils";

const INITIAL_CELL_SIZE = 50;
const MAX_CELL_SCORE = 600;
const MIN_CELL_SIZE_FOR_DEATH = 5;
const MAX_SPEED = 6;
const LERP_FACTOR = 0.08;
const CAMERA_LERP_FACTOR = 0.05;
const ZOOM_LERP_FACTOR = 0.05;
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
const MAX_SUGAR = 70;
const BASE_SUGAR_SPAWN_INTERVAL = 3000; // ms
const SUGAR_LIFETIME = 20000; // 20 seconds
const MAX_THEME_SIZE = 300;
const COLLISION_PENALTY_FACTOR = 1.5; 
const ENERGY_PENALTY_FACTOR = 2.5;
const STARVATION_SIZE_DRAIN = 0.02; // Points per frame
const DAMAGE_COOLDOWN = 3000; // 3 second solid invulnerability
const FLICKER_DURATION = 2000; // 2 second flicker period
const TOTAL_INVINCIBILITY_DURATION = DAMAGE_COOLDOWN + FLICKER_DURATION;
const DEATH_ANIMATION_DURATION = 2000; // ms
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
  const [isDying, setIsDying] = useState(false);
  const [isStarving, setIsStarving] = useState(false);
  const [score, setScore] = useState(INITIAL_CELL_SIZE);
  const [energy, setEnergy] = useState(100);
  const [isInvulnerable, setIsInvulnerable] = useState(false);
  const [isFlickering, setIsFlickering] = useState(false);
  const [showOrganismNames, setShowOrganismNames] = useState(false);

  const [cellSize, setCellSize] = useState(INITIAL_CELL_SIZE);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cellWrapperRef = useRef<HTMLDivElement>(null);
  const cellApiRef = useRef<BioCellHandle>(null);

  const keysPressedRef = useRef<{[key: string]: boolean}>({});
  const isPointerDownRef = useRef(false);
  const pointerPositionRef = useRef({ x: 0, y: 0 });
  const cellPositionRef = useRef<Position>({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 });
  const cameraPositionRef = useRef<Position>({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 });
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
        const baseRadius = immediate ? 
            Math.min(width, height) * 0.7 :
            Math.max(width, height) / (2 * zoomRef.current) + spawnPadding;
            
        // Add randomness to radius to break patterns
        const spawnRadius = baseRadius * (0.8 + Math.random() * 0.4);

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
    setScore(INITIAL_CELL_SIZE);
    setEnergy(100);
    setIsStarving(false);
    
    const initialPosition = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
    cellPositionRef.current = initialPosition;
    cameraPositionRef.current = initialPosition;
    setCameraForParallax(initialPosition);

    velocityRef.current = { x: 0, y: 0 };
    if (cellWrapperRef.current) {
        cellWrapperRef.current.style.transform = `translate(${initialPosition.x}px, ${initialPosition.y}px)`;
    }
    keysPressedRef.current = {};
    
    // Initial sugar spawn
    setSugars([]);
    spawnSugars(20, true); 
    
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
    setIsFlickering(false);
    lastDamageTimeRef.current = 0;

    setIsDying(false);
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
      if (event.key.toLowerCase() === 'e') {
        setShowOrganismNames(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressedRef.current[event.key.toLowerCase()] = false;
      if (event.key.toLowerCase() === 'e') {
        setShowOrganismNames(false);
      }
    };

    const getPointerPosition = (event: PointerEvent) => {
        return { x: event.clientX, y: event.clientY };
    }

    const handlePointerDown = (event: PointerEvent) => {
        isPointerDownRef.current = true;
        pointerPositionRef.current = getPointerPosition(event);
    };

    const handlePointerMove = (event: PointerEvent) => {
        if (isPointerDownRef.current) {
            pointerPositionRef.current = getPointerPosition(event);
        }
    };

    const handlePointerUp = () => {
        isPointerDownRef.current = false;
    };


    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    const gameContainer = containerRef.current;
    if (gameContainer) {
        gameContainer.addEventListener('pointerdown', handlePointerDown);
        gameContainer.addEventListener('pointermove', handlePointerMove);
        gameContainer.addEventListener('pointerup', handlePointerUp);
        gameContainer.addEventListener('pointerleave', handlePointerUp);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (gameContainer) {
        gameContainer.removeEventListener('pointerdown', handlePointerDown);
        gameContainer.removeEventListener('pointermove', handlePointerMove);
        gameContainer.removeEventListener('pointerup', handlePointerUp);
        gameContainer.removeEventListener('pointerleave', handlePointerUp);
      }
    };
  }, []);

  const handleOrganismPositionChange = useCallback((id: string, newPosition: Position) => {
    setOrganismStates(prev => {
        if (!prev[id]) return prev;
        return {
            ...prev,
            [id]: { ...prev[id], position: newPosition },
        }
    });
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (isGameOver || isDying ||!containerRef.current || !worldRef.current) {
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

    // --- Invulnerability/Flicker Check ---
    if (isInvulnerable) {
        const timeSinceDamage = now - lastDamageTimeRef.current;
        if (timeSinceDamage > TOTAL_INVINCIBILITY_DURATION) {
            setIsInvulnerable(false);
            setIsFlickering(false);
        } else if (timeSinceDamage > DAMAGE_COOLDOWN) {
            setIsFlickering(true);
        }
    }


    // --- Sugar Spawning & Despawning ---
    const growthFactor = Math.max(1, (cellSize - INITIAL_CELL_SIZE) / 100);
    const dynamicSpawnInterval = BASE_SUGAR_SPAWN_INTERVAL * growthFactor;

    if (timestamp - lastSugarSpawnTimeRef.current > dynamicSpawnInterval) {
        if (sugars.length < MAX_SUGAR) {
            spawnSugars(3);
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

    if (isPointerDownRef.current) {
        const screenCenterX = width / 2;
        const screenCenterY = height / 2;
        const dx = pointerPositionRef.current.x - screenCenterX;
        const dy = pointerPositionRef.current.y - screenCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 10) { // a small deadzone
            targetVx = (dx / dist) * currentMaxSpeed;
            targetVy = (dy / dist) * currentMaxSpeed;
        }
    } else {
        if (keysPressedRef.current['w'] || keysPressedRef.current['arrowup']) targetVy -= currentMaxSpeed;
        if (keysPressedRef.current['s'] || keysPressedRef.current['arrowdown']) targetVy += currentMaxSpeed;
        if (keysPressedRef.current['a'] || keysPressedRef.current['arrowleft']) targetVx -= currentMaxSpeed;
        if (keysPressedRef.current['d'] || keysPressedRef.current['arrowright']) targetVx += currentMaxSpeed;
    }

    velocityRef.current.x += (targetVx - velocityRef.current.x) * LERP_FACTOR;
    velocityRef.current.y += (targetVy - velocityRef.current.y) * LERP_FACTOR;
    
    cellPositionRef.current.x = Math.max(0, Math.min(WORLD_WIDTH, cellPositionRef.current.x + velocityRef.current.x));
    cellPositionRef.current.y = Math.max(0, Math.min(WORLD_HEIGHT, cellPositionRef.current.y + velocityRef.current.y));
    
    if (cellApiRef.current) {
        cellApiRef.current.updateVelocity(velocityRef.current.x, velocityRef.current.y);
    }

    if (cellWrapperRef.current) {
      cellWrapperRef.current.style.transform = `translate(${cellPositionRef.current.x}px, ${cellPositionRef.current.y}px)`;
    }

    // --- Camera and Zoom ---
    const zoomOutFactor = 0.02;
    const initialZoom = 2.0;
    const sizeForZoom = Math.max(MIN_CELL_SIZE_FOR_DEATH, cellSize);
    const targetZoom = Math.max(0.8, initialZoom / (1 + (sizeForZoom - INITIAL_CELL_SIZE) * zoomOutFactor));

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
    let energyFromSugar = 0;
    let totalSizeGained = 0;
    let eatenSugarIds = new Set<string>();

    for (const sugar of localSugars) {
        const dx = cellPositionRef.current.x - sugar.x;
        const dy = cellPositionRef.current.y - sugar.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < currentCellRadius) {
            const sizeMultiplier = sugar.size / 8;
            totalScoreGained += 3.5 * sizeMultiplier;
            energyFromSugar += 3 * sizeMultiplier;
            totalSizeGained += 1 * sizeMultiplier;
            eatenSugarIds.add(sugar.id);
        }
    }
    
    if (eatenSugarIds.size > 0) {
        setSugars(currentSugars => currentSugars.filter(s => !eatenSugarIds.has(s.id)));
    }
    
    // Debris Collisions (Harmful, Devour, Organelles)
    const newEligibleOrganelles = new Set<string>();
    const collectedOrganelleTypesThisFrame = new Set<string>();
    const collectedDebrisIds = new Set<string>();
    
    let energyFromDevouring = 0;

    const handleCollision = (d: DebrisItem) => {
        const organismState = organismStates[d.id];
        if (!organismState || isInvulnerable) return;

        const dx = cellPositionRef.current.x - organismState.position.x;
        const dy = cellPositionRef.current.y - organismState.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const collisionThreshold = currentCellRadius + organismState.collisionSize / 2;
        const componentType = d.Component as any;

        if (dist > collisionThreshold) return; // No collision

        // --- Organelle Collection ---
        if (componentType.isOrganelle) {
            if (cellSize > organismState.size) { // Can collect
                collectedOrganelleTypesThisFrame.add(componentType.type);
                collectedDebrisIds.add(d.id);
            }
            return;
        }

        const isPermanentlyHostile = componentType.isHarmful === true;

        // --- Organism Interaction (Harmful or Devour) ---
        if (componentType.isHarmful) {
             if (cellSize > organismState.size) {
                // Devour smaller, hostile organism
                const sizeBonus = organismState.size * 0.2;
                totalScoreGained += sizeBonus;
                totalSizeGained += sizeBonus / 5;
                energyFromDevouring += sizeBonus / 2;
                collectedDebrisIds.add(d.id);
            } else {
                // Take damage from larger or permanently hostile organism
                setIsInvulnerable(true);
                lastDamageTimeRef.current = now;

                const basePenalty = isPermanentlyHostile ? organismState.size * 0.2 : 0;
                const sizeDifference = Math.max(0, organismState.size - cellSize);
                let sizePenalty = basePenalty + (sizeDifference * COLLISION_PENALTY_FACTOR);
                
                // Safeguard: Never lose more size than you have, down to the minimum.
                sizePenalty = Math.min(sizePenalty, cellSize - MIN_CELL_SIZE_FOR_DEATH);
                
                const newSize = Math.max(MIN_CELL_SIZE_FOR_DEATH, cellSize - sizePenalty);
                setCellSize(newSize);
                setScore(newSize);

                if (cellApiRef.current) {
                    cellApiRef.current.takeDamage();
                }
            }
        }
    };
    
    // Loop through interactive debris to check for collisions
    const interactiveDebris = localDebris.filter(d => {
        const componentType = d.Component as any;
        return componentType.isOrganelle || componentType.isHarmful;
    });

    interactiveDebris.forEach(handleCollision);
    
    // Check for organelle collection eligibility (visuals only)
    localDebris.forEach(d => {
        const componentType = d.Component as any;
        if (componentType.isOrganelle) {
            const organismState = organismStates[d.id];
            if (organismState && cellSize > organismState.size) {
                newEligibleOrganelles.add(d.id);
            }
        }
    });
    
    // Update score and size from all sources
    if (totalScoreGained > 0 && score < MAX_CELL_SCORE) {
        const newScore = Math.min(MAX_CELL_SCORE, score + totalScoreGained);
        const newSize = Math.min(INITIAL_CELL_SIZE + (MAX_CELL_SCORE - INITIAL_CELL_SIZE), cellSize + totalSizeGained);
        setScore(Math.round(newScore));
        setCellSize(newSize);
    }
    
    // Update state based on collections
    if (collectedDebrisIds.size > 0) {
        setDebris(currentDebris => currentDebris.filter(d => !collectedDebrisIds.has(d.id)));
        setOrganismStates(prevStates => {
            const newStates = { ...prevStates };
            collectedDebrisIds.forEach(id => delete newStates[id]);
            return newStates;
        });
        setCollectedOrganelles(prev => new Set([...prev, ...collectedOrganelleTypesThisFrame]));
    }
    
    if (newEligibleOrganelles.size !== eligibleOrganelles.size || ![...newEligibleOrganelles].every(id => eligibleOrganelles.has(id))) {
        setEligibleOrganelles(newEligibleOrganelles);
    }


    // --- Energy Drain & Starvation Logic ---
    const speed = Math.sqrt(velocityRef.current.x**2 + velocityRef.current.y**2);
    const movementEnergyDrain = (speed / MAX_SPEED) * 0.08;
    const sizeDrainFactor = 1 + (cellSize - INITIAL_CELL_SIZE) / 200;
    const baseEnergyDrain = 0.02 * sizeDrainFactor;
    const energyGain = energyFromSugar + energyFromDevouring;
    const energyDrain = baseEnergyDrain + movementEnergyDrain;
    
    if (isStarving) {
      if (energyGain > 0) {
        // Just ate, no longer starving!
        setIsStarving(false);
        setEnergy(energyGain); // Reset energy with the gain
      } else {
        const newSize = Math.max(0, cellSize - STARVATION_SIZE_DRAIN);
        setCellSize(newSize);
        setScore(newSize);
      }
    } else {
      const newEnergy = Math.min(100, Math.max(0, energy + energyGain - energyDrain));
      setEnergy(newEnergy);
      if (newEnergy <= 0) {
          setIsStarving(true);
      }
    }
    
    // --- Game State Checks (Game Over) ---
    if (cellSize <= MIN_CELL_SIZE_FOR_DEATH && !isDying) {
        setIsDying(true);
        setTimeout(() => {
            setIsGameOver(true);
        }, DEATH_ANIMATION_DURATION);
    }

    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [isGameOver, isDying, isStarving, isInvulnerable, cellSize, score, energy, sugars, debris, spawnSugars, eligibleOrganelles, organismStates, handleOrganismPositionChange]);

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
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-background select-none">
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
                                <d.Component {...d.props} showName={showOrganismNames} />
                            </Autonomous>
                        )
                    }
                    return <d.Component key={d.id} {...d.props} position={organismState.position} size={organismState.size} showName={showOrganismNames} />;
                })}
            </div>

            {/* Layer for Sugar, Harmful Organisms, and Eligible Organelles */}
            <div className="absolute inset-0 z-20">
                {renderedSugars.map((sugar) => <Sugar key={sugar.id} position={sugar} size={sugar.size} />)}

                {interactiveDebris.map(d => {
                    const organismState = organismStates[d.id];
                    if (!organismState) return null;
                    const componentType = d.Component as any;
                    const isEligible = eligibleOrganelles.has(d.id);
                    const isOrganelle = componentType.isOrganelle;
                    
                    // Organelles are visible, but half-opacity if you can't collect them yet
                    let opacity = d.props.opacity;
                    if (isOrganelle && !isEligible) {
                        opacity = 0.5;
                    }

                    const glowStyle: React.CSSProperties = {
                       filter: isEligible && isOrganelle ? 'drop-shadow(0 0 8px hsl(var(--primary) / 0.7))' : 'none',
                       transition: 'filter 0.3s ease-in-out',
                       position: 'absolute',
                       top: 0,
                       left: 0,
                       width: '100%',
                       height: '100%',
                     };
                     
                     const componentToRender = d.isAutonomous ? (
                        <Autonomous 
                            key={d.id} 
                            initialPosition={d.initialPosition}
                            onPositionChange={(newPos) => handleOrganismPositionChange(d.id, newPos)}
                            size={organismState.size}
                         >
                            <d.Component {...d.props} opacity={opacity} position={{x:0, y:0}} showName={showOrganismNames} />
                        </Autonomous>
                     ) : (
                        <d.Component key={d.id} {...d.props} opacity={opacity} position={organismState.position} size={organismState.size} showName={showOrganismNames} />
                     );
                     
                     return (
                        <div key={d.id} style={glowStyle}>
                            {componentToRender}
                        </div>
                     )
                })}
            </div>

            <div 
                ref={cellWrapperRef} 
                className={cn(
                    "absolute z-30 transition-opacity duration-100",
                    isInvulnerable && !isFlickering && "opacity-50",
                    isFlickering && "animate-flicker"
                )}
            >
                <BioCell ref={cellApiRef} size={cellSize} score={score} isDying={isDying} collectedOrganelles={collectedOrganelles} />
            </div>
        </div>
        
        <div className={cn(
            "fixed inset-0 bg-black z-40 transition-opacity duration-1000",
            isDying ? "opacity-100" : "opacity-0 pointer-events-none"
        )} />

        <GameUI
            cellSize={cellSize}
            score={score}
            energy={energy}
            isStarving={isStarving}
            collectedOrganelles={collectedOrganelles}
        />

        <GameOverDialog score={score} isOpen={isGameOver} onRestart={onGameOver} />
    </div>
  );
}
