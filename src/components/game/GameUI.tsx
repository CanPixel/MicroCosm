"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dna, Gauge, Shield, Zap } from "lucide-react";

type GameUIProps = {
    cellSize: number;
    score: number;
};

export function GameUI({ cellSize, score }: GameUIProps) {
  const energy = Math.min(100, (cellSize - 40) / 2);

  return (
    <>
      <div className="fixed top-4 left-4 w-72 text-foreground font-headline z-20">
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <Dna />
                <span>BioCell Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><Gauge className="w-4 h-4 text-foreground/70"/> Size</span>
                <span>{score}μm</span>
            </div>
            <div className="space-y-1">
                 <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-foreground/70"/> Energy</span>
                    <span>{energy.toFixed(0)}%</span>
                </div>
                <Progress value={energy} className="h-2 [&>div]:bg-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
            <CardContent className="p-2">
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" className="text-primary hover:bg-primary/10 hover:text-primary">
                        <Shield />
                        <span className="ml-2 hidden md:inline">Evolve Shield</span>
                    </Button>
                     <Button variant="ghost" className="text-primary hover:bg-primary/10 hover:text-primary">
                        <Zap />
                        <span className="ml-2 hidden md:inline">Boost Speed</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
