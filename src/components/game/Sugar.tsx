
"use client";

import { useState, useEffect } from "react";

type SugarProps = {
  position: { x: number; y: number };
  rotation: number;
};

export function Sugar({ position, rotation: initialRotation }: SugarProps) {
  const [rotation, setRotation] = useState(initialRotation);
  
  useEffect(() => {
    // This check is to avoid hydration mismatch.
    // The initial rotation is passed from the server (or initial state),
    // but we can also set a random one on the client if it's not provided.
    if (rotation === undefined) {
      setRotation(Math.random() * 360);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const style: React.CSSProperties = {
    top: `${position.y}px`,
    left: `${position.x}px`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    filter: `drop-shadow(0 0 8px hsl(var(--foreground) / 0.7))`,
    boxShadow: '0 0 0 1px hsl(var(--foreground) / 0.8)',
  };

  return <div style={style} className="absolute w-2.5 h-2.5 bg-transparent" />;
}

    