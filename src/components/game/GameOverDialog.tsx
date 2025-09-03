"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type GameOverDialogProps = {
  score: number;
  isOpen: boolean;
  onRestart: () => void;
};

export function GameOverDialog({ score, isOpen, onRestart }: GameOverDialogProps) {
    const { toast } = useToast();
    
    const handleSubmitScore = () => {
        // Here you would typically call a server action or API to submit the score.
        console.log("Submitting score:", score);
        toast({
            title: "Score Submitted!",
            description: `Your score of ${score}μm has been saved to the leaderboard.`,
        });
        onRestart();
    };

    return (
        <AlertDialog open={isOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-2xl">Game Over</AlertDialogTitle>
            <AlertDialogDescription>
                Your BioCell has been compromised. Your final size was {score}μm.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={onRestart}>Return to Menu</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitScore}>Submit Score</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
    );
}
