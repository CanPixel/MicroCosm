
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
import { Amoeba } from './Amoeba';
import { FungiWall } from './FungiWall';

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

      // Organelles (always interactive)
      if (type < 0.1) {
        Component = Mitochondrion;
        opacity = 1; // Rendered at full opacity when eligible
      } else if (type < 0.2) {
        Component = GolgiApparatus;
        opacity = 1; // Rendered at full opacity when eligible
      }
      else if (type < 0.3) {
        Component = CellNucleus;
        opacity = 1; // Rendered at full opacity when eligible
      }
      // Harmful Organisms (always interactive)
      else if (type < 0.35) { // 5% chance for Fungi
        Component = FungiWall;
        opacity = Math.random() * 0.1 + 0.9; // High opacity
        isAutonomous = false; // It's stationary
      }
      else if (type < 0.40) { // 5% chance
        Component = CancerCell;
        opacity = Math.random() * 0.2 + 0.8; // High opacity
        isAutonomous = true;
      } 
      // Ambient, non-interactive organisms (low opacity)
      else if (type < 0.45) { // 5% chance for giant amoeba
        Component = Amoeba;
        opacity = Math.random() * 0.2 + 0.2; // low opacity
        isAutonomous = true;
      }
      else if (type < 0.55) { // 10%
        Component = Tardigrade;
        opacity = Math.random() * 0.2 + 0.1; // low opacity
        isAutonomous = true;
      } else if (type < 0.65) { // 10%
        Component = SpikyVirus;
        opacity = Math.random() * 0.2 + 0.1; // low opacity
      } else if (type < 0.75) { // 10%
        Component = RodBacteria;
        opacity = Math.random() * 0.2 + 0.2; // low opacity
        isAutonomous = true;
      } else if (type < 0.85) { // 10%
        Component = FlagellateProtist;
        opacity = Math.random() * 0.2 + 0.1; // low opacity
        isAutonomous = true;
      } else if (type < 0.95) { // 10%
        Component = Ciliate;
        opacity = Math.random() * 0.2 + 0.2; // low opacity
        isAutonomous = true;
      } else { // 5%
        Component = Bacteriophage;
        opacity = Math.random() * 0.3 + 0.1; // low opacity
        isAutonomous = true;
      }
      
      const propsOverride: any = {};
      if (Component === Amoeba) {
        propsOverride.size = Math.random() * 150 + 250; // 250-400
      }
      if (Component === FungiWall) {
        propsOverride.size = Math.random() * 200 + 400; // 400-600
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
            ...propsOverride
        }
      };
    });
}
