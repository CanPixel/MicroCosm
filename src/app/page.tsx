"use client";

import { GameContainer } from "@/components/game/GameContainer";

export default function Home() {

  return (
    <main className="relative min-h-screen w-full bg-background text-foreground">
      <GameContainer onGameOver={() => window.location.reload()} />
    </main>
  );
}
