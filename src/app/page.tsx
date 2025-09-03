"use client";

import { useState } from "react";
import { GameContainer } from "@/components/game/GameContainer";
import { StartScreen } from "@/components/game/StartScreen";

export default function Home() {
  const [gameState, setGameState] = useState<"start" | "playing">("start");

  return (
    <main className="relative min-h-screen bg-background text-foreground overflow-hidden">
      {/* Conditionally render GameContainer to mount/unmount and trigger useEffects correctly */}
      {gameState === 'playing' && <GameContainer onGameOver={() => setGameState("start")} />}

      {/* The start screen is always there but hidden when playing */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${
          gameState === 'start' ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <StartScreen onStart={() => setGameState("playing")} />
      </div>
    </main>
  );
}
