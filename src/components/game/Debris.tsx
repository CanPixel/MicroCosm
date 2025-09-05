
"use client";

import React from 'react';
import { Tardigrade } from './Tardigrade';
import { SpikyVirus } from './SpikyVirus';
import { RodBacteria } from './RodBacteria';
import { FlagellateProtist } from './FlagellateProtist';
import { Ciliate } from './Ciliate';
import { Bacteriophage } from './Bacteriophage';
import { Autonomous } from './Autonomous';
import { Mitochondrion } from './Mitochondrion';
import { GolgiApparatus } from './GolgiApparatus';
import { CellNucleus } from './CellNucleus';
import { Amoeba } from './Amoeba';
import { FungiWall } from './FungiWall';

const DEBRIS_COUNT = 100;
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
const PLAYER_SPAWN_X = WORLD_WIDTH / 2;
const PLAYER_SPAWN_Y = WORLD_HEIGHT / 2;
const NO_SPAWN_RADIUS = 800; // Don't spawn giant organisms within this radius of the player's start

export type DebrisItem = {
    id: string;
    Component: React.FC<any> & { isHarmful?: boolean, isOrganelle?: boolean, isInfectious?: boolean };
    isAutonomous: boolean;
    initialPosition: { x: number; y: number };
    props: any;
    collisionSize: number | { width: number, height: number };
};

export function Debris(): DebrisItem[] {
    return Array.from({ length: DEBRIS_COUNT }, (_, i) => {
      let x = Math.random() * WORLD_WIDTH;
      let y = Math.random() * WORLD_HEIGHT;
      let size: number | { width: number; height: number } = Math.random() * 80 + 20; // Size between 20 and 100
      let collisionSize: number | { width: number, height: number } = size;
      const duration = Math.random() * 40 + 20; // Animation duration between 20s and 60s
      const delay = Math.random() * -60; // Negative delay to start animations at different points
      const initialRotation = Math.random() * 360;
      const animationDirection = Math.random() < 0.5 ? 'normal' : 'reverse';
      
      const type = Math.random();

      let Component: DebrisItem['Component'];
      let opacity = 1;
      let isAutonomous = false;

      // Determine if a normally ambient organism should be "active" (interactive and harmful)
      const isAmbientActive = Math.random() < 0.15; // 15% chance to be active

      // Organelles (always interactive, never harmful)
      if (type < 0.08) {
        Component = Mitochondrion;
      } else if (type < 0.16) {
        Component = GolgiApparatus;
      }
      else if (type < 0.24) {
        Component = CellNucleus;
      }
      // Harmful Organisms (always interactive and harmful)
      else if (type < 0.3) {
        Component = FungiWall;
        isAutonomous = false; // It's stationary
      }
      // Special infectious organism
      else if (type < 0.35) {
        Component = Bacteriophage;
        isAutonomous = true;
      }
      // Ambient organisms (can be background or active)
      else if (type < 0.45) {
        Component = Amoeba;
        isAutonomous = true;
      }
      else if (type < 0.55) {
        Component = Tardigrade;
        isAutonomous = true;
      } else if (type < 0.65) {
        Component = SpikyVirus;
        isAutonomous = true;
      } else if (type < 0.75) {
        Component = RodBacteria;
        isAutonomous = true;
      } else if (type < 0.85) {
        Component = FlagellateProtist;
        isAutonomous = true;
      } else {
        Component = Ciliate;
        isAutonomous = true;
      }

      // If the organism is not an organelle or a guaranteed harmful one,
      // check if it should become an active, harmful instance.
      if (!Component.isOrganelle && !(Component as any).isHarmful && !(Component as any).isInfectious) {
        if (isAmbientActive) {
            (Component as any).isHarmful = true; // Make this specific instance harmful
            opacity = Math.random() * 0.2 + 0.8; // High opacity
        } else {
            (Component as any).isHarmful = false; // Ensure it's not harmful
            opacity = Math.random() * 0.2 + 0.1; // Low opacity for background
        }
      } else if (!Component.isOrganelle) {
        // This handles guaranteed harmful entities like FungiWall or infectious ones
        opacity = 1;
      } else {
        // This handles organelles
        opacity = 1;
      }
      
      const propsOverride: any = {};
      const isGiant = Component === Amoeba;

      if (Component === Amoeba) {
        size = Math.random() * 150 + 250; // 250-400
      }
      if (Component === FungiWall) {
        const isHorizontal = Math.random() > 0.5;
        const width = Math.random() * 200 + 300; // 300-500
        const height = 50;
        size = {
            width: isHorizontal ? width : height,
            height: isHorizontal ? height : width
        };
        // Collision box is just the core rectangle, not the hairs
        collisionSize = {
            width: isHorizontal ? width : height,
            height: isHorizontal ? height * 0.6 : width
        }
        if (!isHorizontal) {
            (collisionSize as any).width = height;
            (collisionSize as any).height = width * 0.6;
        }

      }
      
      const spawnRadius = typeof size === 'number' ? size : Math.max(size.width, size.height);

      // If it's a giant organism, make sure it doesn't spawn on top of the player
      if (isGiant || Component === FungiWall) {
        let dist = Math.sqrt(Math.pow(x - PLAYER_SPAWN_X, 2) + Math.pow(y - PLAYER_SPAWN_Y, 2));
        while (dist < NO_SPAWN_RADIUS + spawnRadius) {
          x = Math.random() * WORLD_WIDTH;
          y = Math.random() * WORLD_HEIGHT;
          dist = Math.sqrt(Math.pow(x - PLAYER_SPAWN_X, 2) + Math.pow(y - PLAYER_SPAWN_Y, 2));
        }
      }

      // Set a smaller collision size for very large organisms to feel more fair
      if (typeof size === 'number' && typeof collisionSize === 'number' && isGiant) {
        collisionSize = size * 0.7; 
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
            initialRotation: Component === FungiWall ? 0 : initialRotation, // Fungi wall is not rotated
            animationDirection,
            ...propsOverride
        },
        collisionSize,
      };
    }).filter(d => d.Component); // Filter out any undefined components if logic fails
}

    