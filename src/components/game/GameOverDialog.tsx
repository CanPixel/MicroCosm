
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type GameOverDialogProps = {
  score: number;
  isOpen: boolean;
  onRestart: () => void;
};

export function GameOverDialog({ score, isOpen, onRestart }: GameOverDialogProps) {
    
    return (
        <AlertDialog open={isOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle className="font-zcool-kuaile text-3xl">Game Over</AlertDialogTitle>
            <AlertDialogDescription>
                Your BioCell has starved.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogAction 
                onClick={onRestart}
                className={cn(
                    "font-zcool-kuaile text-lg",
                    "bg-accent text-accent-foreground hover:bg-accent/90"
                )}
            >
                Revive
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
    );
}
