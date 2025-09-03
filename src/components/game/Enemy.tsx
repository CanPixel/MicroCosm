"use client";

import { Biohazard } from 'lucide-react';

type EnemyProps = {
  position: { x: number; y: number };
};

export function Enemy({ position }: EnemyProps) {
  const style: React.CSSProperties = {
    top: `${position.y}px`,
    left: `${position.x}px`,
    transform: `translate(-50%, -50%)`,
  };

  return (
    <div style={style} className="absolute text-accent animate-pulse-glow">
      <Biohazard size={32} />
    </div>
  );
}
