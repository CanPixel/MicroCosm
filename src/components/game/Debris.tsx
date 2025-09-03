
"use client";

import React, { useMemo } from 'react';
import { FloatingDebris } from './FloatingDebris';
import { Tardigrade } from './Tardigrade';
import { SpikyVirus } from './SpikyVirus';
import { RodBacteria } from './RodBacteria';

const DEBRIS_COUNT = 100; // Increased count for more variety
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;

export function Debris() {
  const debrisList = useMemo(() => {
    return Array.from({ length: DEBRIS_COUNT }, (_, i) => {
      const x = Math.random() * WORLD_WIDTH;
      const y = Math.random() * WORLD_HEIGHT;
      const size = Math.random() * 80 + 20; // Size between 20 and 100
      const duration = Math.random() * 40 + 20; // Animation duration between 20s and 60s
      const delay = Math.random() * -60; // Negative delay to start animations at different points
      
      const type = Math.random();

      let Component;
      let opacity;

      if (type < 0.1) {
        Component = Tardigrade;
        opacity = Math.random() * 0.2 + 0.7; // High opacity
      } else if (type < 0.2) {
        Component = SpikyVirus;
        opacity = Math.random() * 0.2 + 0.6; // High opacity
      } else if (type < 0.35) {
        Component = RodBacteria;
        opacity = Math.random() * 0.2 + 0.8; // High opacity
      } else {
        Component = FloatingDebris;
        opacity = Math.random() * 0.1 + 0.05; // Keep these very low opacity for atmosphere
      }
      
      return {
        id: `debris-${i}`,
        Component,
        props: {
            position: { x, y },
            size,
            duration,
            delay,
            opacity,
        }
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      {debrisList.map(debris => (
        <debris.Component key={debris.id} {...debris.props} />
      ))}
    </div>
  );
}
