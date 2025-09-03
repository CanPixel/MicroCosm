"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from 'lucide-react';

const highScores = [
  { rank: 1, name: "Player1", score: 1540 },
  { rank: 2, name: "Cyto-Surfer", score: 1210 },
  { rank: 3, name: "Amoeba.Alex", score: 980 },
  { rank: 4, name: "Plasmid_Pilot", score: 750 },
  { rank: 5, name: "Gamer_Gene", score: 620 },
];

export function Leaderboard() {
  return (
    <Card className="w-full max-w-md mx-auto bg-card/80 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-primary">
            <Trophy/>
            Leaderboard
        </CardTitle>
        <CardDescription>Top scores across the microcosm.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20">
              <TableHead className="w-[50px]">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Cell Size (μm)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {highScores.map((player) => (
              <TableRow key={player.rank} className="border-primary/10">
                <TableCell className="font-medium text-primary">{player.rank}</TableCell>
                <TableCell>{player.name}</TableCell>
                <TableCell className="text-right font-mono">{player.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
