
"use client";

import React from 'react';
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

export type DebrisItem = {
    id: string;
    Component: React.FC<any>;
    isAutonomous: boolean;
    initialPosition: { x: number; y: number };
    props: any;
};

export function Debris(): DebrisItem[] {
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

      // Organelles
      if (type < 0.15) {
        Component = Mitochondrion;
        opacity = Math.random() * 0.2 + 0.3; // Low opacity for background
      } else if (type < 0.3) {
        Component = GolgiApparatus;
        opacity = Math.random() * 0.2 + 0.3; // Low opacity for background
      }
      else if (type < 0.45) {
        Component = CellNucleus;
        opacity = Math.random() * 0.2 + 0.3; // Low opacity for background
      }
      // Active organisms
      else if (type < 0.47) { // 2% chance
        Component = CancerCell;
        opacity = Math.random() * 0.2 + 0.8; // High opacity
        isAutonomous = true;
      } else if (type < 0.55) { // 8%
        Component = Tardigrade;
        opacity = Math.random() * 0.2 + 0.7; // High opacity
        isAutonomous = true;
      } else if (type < 0.63) { // 8%
        Component = SpikyVirus;
        opacity = Math.random() * 0.2 + 0.6; // High opacity
      } else if (type < 0.71) { // 8%
        Component = RodBacteria;
        opacity = Math.random() * 0.2 + 0.8; // High opacity
        isAutonomous = true;
      } else if (type < 0.79) { // 8%
        Component = FlagellateProtist;
        opacity = Math.random() * 0.2 + 0.7; // High opacity
        isAutonomous = true;
      } else if (type < 0.87) { // 8%
        Component = Ciliate;
        opacity = Math.random() * 0.2 + 0.8; // High opacity
        isAutonomous = true;
      } else { // 13%
        Component = Bacteriophage;
        opacity = Math.random() * 0.3 + 0.6; // High opacity
        isAutonomous = true;
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
}
