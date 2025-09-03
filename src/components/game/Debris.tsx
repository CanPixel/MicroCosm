
"use client";

import React, { useMemo } from 'react';
import { FloatingDebris } from './FloatingDebris';

const DEBRIS_COUNT = 30;
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;

export function Debris() {
  const debrisList = useMemo(() => {
    return Array.from({ length: DEBRIS_COUNT }, (_, i) => {
      const x = Math.random() * WORLD_WIDTH;
      const y = Math.random() * WORLD_HEIGHT;
      const size = Math.random() * 80 + 20; // Size between 20 and 100
      const duration = Math.random() * 20 + 15; // Animation duration between 15s and 35s
      const delay = Math.random() * -30; // Negative delay to start animations at different points
      const opacity = Math.random() * 0.1 + 0.05; // Low opacity
      
      return {
        id: `debris-${i}`,
        position: { x, y },
        size,
        duration,
        delay,
        opacity,
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      {debrisList.map(debris => (
        <FloatingDebris
          key={debris.id}
          position={debris.position}
          size={debris.size}
          duration={debris.duration}
          delay={debris.delay}
          opacity={debris.opacity}
        />
      ))}
    </div>
  );
}
