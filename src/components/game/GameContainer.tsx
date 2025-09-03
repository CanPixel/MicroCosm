
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { BioCell } from "./BioCell";
import { Nutrient } from "./Nutrient";
import { Enemy } from "./Enemy";
import { GameUI } from "./GameUI";
import { GameOverDialog } from "./GameOverDialog";

const INITIAL_CELL_SIZE = 50;
const NUTRIENT_COUNT = 30;
const ENEMY_COUNT = 5;
const CELL_SPEED = 4;

type Position = { x: number; y: number };

type GameContainerProps = {
    onGameOver: () => void;
};

export function GameContainer({ onGameOver }: GameContainerProps) {
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [cellSize, setCellSize] = useState(INITIAL_CELL_SIZE);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const cellPositionRef = useRef<Position>({ x: 0, y: 0 });
  
  const [nutrients, setNutrients] = useState<Position[]>([]);
  const [enemies, setEnemies] = useState<Position[]>([]);

  const animationFrameId = useRef<number>();
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const lastUpdateTimeRef = useRef(0);
  const updateInterval = 1000 / 60; // 60 FPS

  const resetGame = useCallback(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    
    setCellSize(INITIAL_CELL_SIZE);
    setScore(0);
    setNutrients(
      Array.from({ length: NUTRIENT_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
      }))
    );
    setEnemies(
      Array.from({ length: ENEMY_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
      }))
    );
    
    const initialPosition = { x: width / 2, y: height / 2 };
    cellPositionRef.current = initialPosition;
    if (cellRef.current) {
        const halfSize = (INITIAL_CELL_SIZE * 1.2) / 2;
        cellRef.current.style.transform = `translate(${initialPosition.x - halfSize}px, ${initialPosition.y - halfSize}px)`;
    }
    keysPressedRef.current = {};
    
    setIsGameOver(false);
  }, []);

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
    if (isGameOver) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      return;
    }

    if (timestamp - lastUpdateTimeRef.current < updateInterval) {
        animationFrameId.current = requestAnimationFrame(gameLoop);
        return;
    }
    lastUpdateTimeRef.current = timestamp;

    let { x, y } = cellPositionRef.current;
    if (keysPressedRef.current['w'] || keysPressedRef.current['arrowup']) y -= CELL_SPEED;
    if (keysPressedRef.current['s'] || keysPressedRef.current['arrowdown']) y += CELL_SPEED;
    if (keysPressedRef.current['a'] || keysPressedRef.current['arrowleft']) x -= CELL_SPEED;
    if (keysPressedRef.current['d'] || keysPressedRef.current['arrowright']) x += CELL_SPEED;

    if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const radius = (cellSize * 1.2) / 2;
        x = Math.max(radius, Math.min(width - radius, x));
        y = Math.max(radius, Math.min(height - radius, y));
    }
    
    cellPositionRef.current = { x, y };
    if (cellRef.current) {
        const halfSize = (cellSize * 1.2) / 2;
        cellRef.current.style.transform = `translate(${x - halfSize}px, ${y - halfSize}px)`;
    }
    
    let nutrientsEaten = 0;
    const remainingNutrients: Position[] = [];
    const currentCellRadius = cellSize / 2;

    for (const nutrient of nutrients) {
        const dx = cellPositionRef.current.x - nutrient.x;
        const dy = cellPositionRef.current.y - nutrient.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < currentCellRadius) {
            nutrientsEaten++;
        } else {
            remainingNutrients.push(nutrient);
        }
    }
    
    if (nutrientsEaten > 0) {
      setScore(s => s + 10 * nutrientsEaten);
      setCellSize(s => s + 2 * nutrientsEaten);
      setNutrients(remainingNutrients);
    }
    
    for (const enemy of enemies) {
        const enemyRadius = 16;
        const dx = cellPositionRef.current.x - enemy.x;
        const dy = cellPositionRef.current.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < currentCellRadius + enemyRadius) {
            setIsGameOver(true);
            break; 
        }
    }
    
    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [isGameOver, cellSize, nutrients, enemies]);

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameLoop]);

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-background animate-fade-in">
        <BioCell ref={cellRef} size={cellSize} />
        {nutrients.map((pos, i) => <Nutrient key={`n-${i}`} position={pos} />)}
        {enemies.map((pos, i) => <Enemy key={`e-${i}`} position={pos} />)}
        
        <GameUI cellSize={cellSize} score={score} />

        <GameOverDialog score={score} isOpen={isGameOver} onRestart={onGameOver} />
    </div>
  );
}
