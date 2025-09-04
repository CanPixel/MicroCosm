
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
import { useIsMobile } from "@/hooks/use-mobile";

type GameUIProps = {
    cellSize: number;
    score: number;
    energy: number;
    isStarving: boolean;
    font: string;
    onFontChange: (font: string) => void;
    collectedOrganelles: Set<string>;
};

const abilities = [
  { type: 'mitochondrion', icon: Zap, label: 'Boost Speed' },
  { type: 'nucleus', icon: Shield, label: 'Evolve Shield' },
  { type: 'golgi', icon: Dna, label: 'Genetic Code' },
];

export function GameUI({ cellSize, score, energy, isStarving, font, onFontChange, collectedOrganelles }: GameUIProps) {
  const isMobile = useIsMobile();

  const fonts = [
    { value: 'font-zcool-kuaile', label: 'ZCOOL KuaiLe' },
    { value: 'font-headline', label: 'Space Grotesk' },
  ];

  const hasUnlockedAbilities = collectedOrganelles.size > 0;

  if (isMobile) {
    return (
       <>
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-sm p-2 z-20">
             <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                <CardContent className="p-2">
                    <div className="flex justify-around items-center text-xs">
                        <span className="flex items-center gap-2"><Gauge className="w-4 h-4 text-foreground/70"/> Size: {score.toFixed(0)}μm</span>
                        <div className="w-px h-6 bg-border mx-2"></div>
                        <div className="flex flex-col w-24">
                           <span className={cn("text-center", energy < 20 && "text-red-500", isStarving && "text-red-500 font-bold")}>{isStarving ? 'STARVING' : `${energy.toFixed(0)}%`}</span>
                           <Progress value={energy} className={cn("h-1.5 [&>div]:bg-primary", isStarving && "[&>div]:bg-red-500")} />
                        </div>
                    </div>
                </CardContent>
             </Card>
        </div>
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
            <Card className={cn(
                "bg-card/80 backdrop-blur-sm border-primary/20 transition-all",
                !hasUnlockedAbilities && "bg-card/50 border-muted/20 backdrop-filter-none"
            )}>
                <CardContent className="p-1 md:p-2">
                     <div className="flex items-center gap-1 md:gap-2">
                        {abilities.map(ability => {
                            const isUnlocked = collectedOrganelles.has(ability.type);
                            const Icon = ability.icon;
                            return (
                                <Button 
                                    key={ability.type}
                                    variant="ghost" 
                                    size="icon"
                                    className={cn(
                                        "text-primary hover:bg-primary/10 hover:text-primary",
                                        !isUnlocked && "text-muted-foreground/50 hover:bg-transparent hover:text-muted-foreground/50"
                                    )}
                                    disabled={!isUnlocked}
                                >
                                    <Icon className={cn("w-5 h-5", !hasUnlockedAbilities && !isUnlocked && "text-muted-foreground/30")} />
                                </Button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
      </div>
    </>
    )
  }

  return (
    <>
      <div className="fixed top-4 left-4 w-64 text-foreground z-20">
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <Logo font={font} />
            <CardTitle className="flex items-center gap-2 text-md text-primary font-headline pt-2">
                <Dna />
                <span>BioCell Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2"><Gauge className="w-4 h-4 text-foreground/70"/> Size</span>
                <span>{score.toFixed(0)}μm</span>
            </div>
            <div className="space-y-1">
                 <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-foreground/70"/> Energy</span>
                    <span className={cn(energy < 20 && "text-red-500", isStarving && "text-red-500 font-bold")}>{isStarving ? 'STARVING' : `${energy.toFixed(0)}%`}</span>
                </div>
                <Progress value={energy} className={cn("h-2 [&>div]:bg-primary", isStarving && "[&>div]:bg-red-500")} />
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

      <div className="fixed bottom-4 right-4 z-20">
         <div className="text-xs text-muted-foreground pb-2 font-headline">V1</div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
        <Card className={cn(
            "bg-card/80 backdrop-blur-sm border-primary/20 transition-all",
            !hasUnlockedAbilities && "bg-card/50 border-muted/20 backdrop-filter-none"
        )}>
            <CardContent className="p-2">
                 <div className="flex items-center gap-2">
                    {abilities.map(ability => {
                        const isUnlocked = collectedOrganelles.has(ability.type);
                        const Icon = ability.icon;
                        return (
                            <Button 
                                key={ability.type}
                                variant="ghost" 
                                className={cn(
                                    "text-primary hover:bg-primary/10 hover:text-primary",
                                    !isUnlocked && "text-muted-foreground/50 hover:bg-transparent hover:text-muted-foreground/50"
                                )}
                                disabled={!isUnlocked}
                            >
                                <Icon className={cn(!hasUnlockedAbilities && !isUnlocked && "text-muted-foreground/30")} />
                                {isUnlocked && <span className="ml-2 hidden md:inline">{ability.label}</span>}
                            </Button>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
