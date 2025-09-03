
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dna, Gauge, Shield, Zap } from "lucide-react";
import { Logo } from "./Logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "../ui/label";

type GameUIProps = {
    cellSize: number;
    score: number;
    energy: number;
    font: string;
    onFontChange: (font: string) => void;
};

export function GameUI({ cellSize, score, energy, font, onFontChange }: GameUIProps) {
  const fonts = [
    { value: 'font-headline', label: 'Space Grotesk' },
    { value: 'font-kablammo', label: 'Kablammo' },
    { value: 'font-zcool-qingke', label: 'ZCOOL QingKe' },
    { value: 'font-zcool-kuaile', label: 'ZCOOL KuaiLe' },
    { value: 'font-vibes', label: 'Vibes' },
  ];

  return (
    <>
      <div className="fixed top-4 left-4 w-64 text-foreground z-20">
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20 mt-2">
          <CardHeader>
            <Logo font={font} />
            <CardTitle className="flex items-center gap-2 text-lg text-primary font-headline pt-2">
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
                    <span className={cn(energy < 20 && "text-red-500")}>{energy.toFixed(0)}%</span>
                </div>
                <Progress value={energy} className="h-2 [&>div]:bg-primary" />
            </div>
             <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Title Font</Label>
              <Select value={font} onValueChange={onFontChange}>
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {fonts.map((f) => (
                    <SelectItem key={f.value} value={f.value} className={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
