
"use client";

import { cn } from "@/lib/utils";

type DebrisProps = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: 'primary' | 'accent';
};

export function Debris({ x, y, size, opacity, color }: DebrisProps) {
  const style: React.CSSProperties = {
    top: `${y}px`,
    left: `${x}px`,
    width: `${size}px`,
    height: `${size}px`,
    opacity: opacity,
    transform: `translate(-50%, -50%)`,
    filter: `blur(1px)`,
  };
  
  const colorClass = color === 'primary' ? 'bg-primary/40' : 'bg-accent/40';

  return <div style={style} className={cn("absolute rounded-full", colorClass)} />;
}
