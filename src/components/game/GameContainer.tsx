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
  const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 });
  const [cellPosition, setCellPosition] = useState<Position>({ x: 0, y: 0 });
  const [cellSize, setCellSize] = useState(INITIAL_CELL_SIZE);
  const [score, setScore] = useState(0);

  const [nutrients, setNutrients] = useState<Position[]>([]);
  const [enemies, setEnemies] = useState<Position[]>([]);

  const [isGameOver, setIsGameOver] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>();

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
    setCellPosition({ x: width / 2, y: height / 2 });
    setMousePosition({ x: width / 2, y: height / 2 });
    setIsGameOver(false);
  }, []);

  useEffect(() => {
    const handleInitialSetup = () => {
      if (containerRef.current) {
        setMousePosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        resetGame();
      }
    };
    handleInitialSetup();
  }, [resetGame]);
  
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const gameLoop = useCallback(() => {
    if (isGameOver) {
        if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        return;
    };

    setCellPosition((pos) => {
        const dx = mousePosition.x - pos.x;
        const dy = mousePosition.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = Math.max(1, dist / 20);
        if (dist < 5) return pos;
        return {
            x: pos.x + (dx / dist) * speed,
            y: pos.y + (dy / dist) * speed,
        };
    });

    const cellRadius = cellSize / 2;

    setNutrients(currentNutrients => {
        const remaining: Position[] = [];
        let nutrientsEaten = 0;
        for (const nutrient of currentNutrients) {
            const dx = cellPosition.x - nutrient.x;
            const dy = cellPosition.y - nutrient.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < cellRadius) {
                nutrientsEaten++;
            } else {
                remaining.push(nutrient);
            }
        }
        if (nutrientsEaten > 0) {
            setScore(s => s + 10 * nutrientsEaten);
            setCellSize(s => s + 2 * nutrientsEaten);
        }
        return remaining;
    });

    for (const enemy of enemies) {
        const enemyRadius = 16;
        const dx = cellPosition.x - enemy.x;
        const dy = cellPosition.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cellRadius + enemyRadius) {
            setIsGameOver(true);
            break;
        }
    }

    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [cellPosition.x, cellPosition.y, cellSize, enemies, isGameOver, mousePosition.x, mousePosition.y]);

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
