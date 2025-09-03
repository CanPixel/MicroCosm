"use client";

import { cn } from "@/lib/utils";

type BioCellProps = {
  position: { x: number; y: number };
  size: number;
};

export function BioCell({ position, size }: BioCellProps) {
  const cellStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    top: `${position.y}px`,
    left: `${position.x}px`,
    transform: `translate(-50%, -50%)`,
    filter: `drop-shadow(0 0 12px hsl(var(--primary))) drop-shadow(0 0 4px hsl(var(--primary)))`,
  };

  return (
    <div
      style={cellStyle}
      className="absolute bg-primary transition-all duration-500 ease-out animate-morph"
    />
  );
}
