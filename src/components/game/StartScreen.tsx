"use client";

import { Button } from "@/components/ui/button";
import { Leaderboard } from "./Leaderboard";
import { Play } from "lucide-react";

type StartScreenProps = {
  onStart: () => void;
};

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="relative z-10 p-8 flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-background/50 to-background">
      <h1
        className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-primary font-headline text-center"
        style={{ filter: `drop-shadow(0 0 15px hsl(var(--primary)))` }}
      >
        MicroCosm
      </h1>
      <p className="mt-4 text-lg text-center max-w-2xl text-foreground/80">
        Navigate the primordial soup. Consume nutrients to grow, evade hostile viruses, and evolve your cell to dominate the microcosm.
      </p>
      <Button 
        onClick={onStart} 
        size="lg" 
        className="mt-8 bg-primary/90 text-primary-foreground hover:bg-primary text-lg font-bold py-6 px-10 shadow-lg" 
        style={{filter: `drop-shadow(0 0 10px hsl(var(--primary)))`}}
      >
          <Play className="mr-2 h-5 w-5"/> Start Simulation
      </Button>
      <div className="mt-12 w-full">
        <Leaderboard />
      </div>
    </div>
  );
}
