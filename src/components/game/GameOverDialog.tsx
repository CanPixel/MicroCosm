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
            <AlertDialogTitle className="font-headline text-2xl">Game Over</AlertDialogTitle>
            <AlertDialogDescription>
                Your BioCell has run out of energy. Your final size was {Math.round(score)}μm.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogAction onClick={onRestart}>Restart Simulation</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
    );
}
