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

type Position = { x: number; y: number };

type GameContainerProps = {
    onGameOver: () => void;
};

export function GameContainer({ onGameOver }: GameContainerProps) {
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [cellSize, setCellSize] = useState(INITIAL_CELL_SIZE);
  const [cellPosition, setCellPosition] = useState<Position>({ x: 0, y: 0 });
  const [nutrients, setNutrients] = useState<Position[]>([]);
  const [enemies, setEnemies] = useState<Position[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>();
  const mousePositionRef = useRef<Position>({ x: 0, y: 0 });
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
    setCellPosition(initialPosition);
    mousePositionRef.current = initialPosition;
    
    setIsGameOver(false);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
        resetGame();
    }
  }, [resetGame]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mousePositionRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
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

    setCellPosition((currentPos) => {
      const dx = mousePositionRef.current.x - currentPos.x;
      const dy = mousePositionRef.current.y - currentPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = Math.max(1, dist / 20); // Speed is proportional to distance
      
      if (dist < 5) return currentPos;

      return {
        x: currentPos.x + (dx / dist) * speed,
        y: currentPos.y + (dy / dist) * speed,
      };
    });

    setNutrients(currentNutrients => {
      let nutrientsEaten = 0;
      const remaining: Position[] = [];
      const currentCellRadius = cellSize / 2;

      for (const nutrient of currentNutrients) {
        const dx = cellPosition.x - nutrient.x;
        const dy = cellPosition.y - nutrient.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < currentCellRadius) {
          nutrientsEaten++;
        } else {
          remaining.push(nutrient);
        }
      }

      if (nutrientsEaten > 0) {
        setScore(s => s + 10 * nutrientsEaten);
        setCellSize(s => s + 2 * nutrientsEaten);
      }
      return remaining.length > 0 ? remaining : [];
    });
    
    // Using for...of loop for early exit
    for (const enemy of enemies) {
        const enemyRadius = 16;
        const currentCellRadius = cellSize / 2;
        const dx = cellPosition.x - enemy.x;
        const dy = cellPosition.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < currentCellRadius + enemyRadius) {
            setIsGameOver(true);
            break; 
        }
    }
    
    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [isGameOver, cellSize, cellPosition.x, cellPosition.y, enemies]);

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameLoop]);

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-background cursor-none animate-fade-in">
        <BioCell position={cellPosition} size={cellSize} />
        {nutrients.map((pos, i) => <Nutrient key={`n-${i}`} position={pos} />)}
        {enemies.map((pos, i) => <Enemy key={`e-${i}`} position={pos} />)}
        
        <GameUI cellSize={cellSize} score={score} />

        <GameOverDialog score={score} isOpen={isGameOver} onRestart={onGameOver} />
    </div>
  );
}
