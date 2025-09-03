
"use client";

import React, { useMemo } from 'react';
import { Tardigrade } from './Tardigrade';
import { SpikyVirus } from './SpikyVirus';
import { RodBacteria } from './RodBacteria';
import { FlagellateProtist } from './FlagellateProtist';
import { Ciliate } from './Ciliate';
import { Bacteriophage } from './Bacteriophage';
import { Autonomous } from './Autonomous';
import { CancerCell } from './CancerCell';
import { Mitochondrion } from './Mitochondrion';
import { GolgiApparatus } from './GolgiApparatus';
import { CellNucleus } from './CellNucleus';

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
      const initialRotation = Math.random() * 360;
      const animationDirection = Math.random() < 0.5 ? 'normal' : 'reverse';
      
      const type = Math.random();

      let Component;
      let opacity;
      let isAutonomous = false;

      if (type < 0.02) { // 2% chance
        Component = CancerCell;
        opacity = Math.random() * 0.2 + 0.8; // High opacity
        isAutonomous = true;
      } else if (type < 0.1) {
        Component = Tardigrade;
        opacity = Math.random() * 0.2 + 0.7; // High opacity
        isAutonomous = true;
      } else if (type < 0.2) {
        Component = SpikyVirus;
        opacity = Math.random() * 0.2 + 0.6; // High opacity
      } else if (type < 0.3) {
        Component = RodBacteria;
        opacity = Math.random() * 0.2 + 0.8; // High opacity
        isAutonomous = true;
      } else if (type < 0.4) {
        Component = FlagellateProtist;
        opacity = Math.random() * 0.2 + 0.7; // High opacity
        isAutonomous = true;
      } else if (type < 0.5) {
        Component = Ciliate;
        opacity = Math.random() * 0.2 + 0.8; // High opacity
        isAutonomous = true;
      } else if (type < 0.6) {
        Component = Bacteriophage;
        opacity = Math.random() * 0.3 + 0.6; // High opacity
        isAutonomous = true;
      } else if (type < 0.75) {
        Component = Mitochondrion;
        opacity = Math.random() * 0.05 + 0.025; 
      } else if (type < 0.85) {
        Component = GolgiApparatus;
        opacity = Math.random() * 0.05 + 0.025; 
      }
      else {
        Component = CellNucleus;
        opacity = Math.random() * 0.05 + 0.025; 
      }
      
      const initialPosition = { x, y };

      return {
        id: `debris-${i}`,
        Component,
        isAutonomous,
        initialPosition,
        props: {
            position: initialPosition,
            size,
            duration,
            delay,
            opacity,
            initialRotation,
            animationDirection,
        }
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      {debrisList.map(debris => {
        if (debris.isAutonomous) {
            return (
                 <Autonomous key={debris.id} initialPosition={debris.initialPosition}>
                    <debris.Component {...debris.props} />
                </Autonomous>
            )
        }
        return <debris.Component key={debris.id} {...debris.props} />;
      })}
    </div>
  );
}
