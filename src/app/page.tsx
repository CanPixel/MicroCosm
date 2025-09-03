"use client";

import { useState } from "react";
import { GameContainer } from "@/components/game/GameContainer";
import { StartScreen } from "@/components/game/StartScreen";

export default function Home() {
  const [gameState, setGameState] = useState<"start" | "playing">("start");

  return (
    <main className="relative min-h-screen w-full bg-background text-foreground">
      {gameState === 'start' ? (
        <StartScreen onStart={() => setGameState("playing")} />
      ) : (
        <GameContainer onGameOver={() => setGameState("start")} />
      )}
    </main>
  );
}
