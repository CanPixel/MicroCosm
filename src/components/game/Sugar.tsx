
"use client";

import { useState, useEffect } from "react";

type SugarProps = {
  position: { x: number; y: number };
  size: number;
};

export function Sugar({ position, size }: SugarProps) {
  const style: React.CSSProperties = {
    top: `${position.y}px`,
    left: `${position.x}px`,
    width: `${size}px`,
    height: `${size}px`,
    transform: `translate(-50%, -50%)`,
    filter: `drop-shadow(0 0 8px hsl(var(--foreground) / 0.7))`,
  };

  return <div style={style} className="absolute bg-foreground" />;
}

    