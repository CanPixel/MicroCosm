"use client";

import React from 'react';
import { Organism, SpeciesId } from '@/lib/game/types';
import { Amoeba } from './Amoeba';
import { Tardigrade } from './Tardigrade';
import { SpikyVirus } from './SpikyVirus';
import { RodBacteria } from './RodBacteria';
import { FlagellateProtist } from './FlagellateProtist';
import { Ciliate } from './Ciliate';
import { Bacteriophage } from './Bacteriophage';
import { FungiWall } from './FungiWall';
import { Mitochondrion } from './Mitochondrion';
import { GolgiApparatus } from './GolgiApparatus';
import { CellNucleus } from './CellNucleus';

const SPECIES_COMPONENTS: Record<SpeciesId, React.FC<any>> = {
  amoeba: Amoeba,
  tardigrade: Tardigrade,
  spikyVirus: SpikyVirus,
  rodBacteria: RodBacteria,
  flagellateProtist: FlagellateProtist,
  ciliate: Ciliate,
  bacteriophage: Bacteriophage,
  fungiWall: FungiWall,
  mitochondrion: Mitochondrion,
  golgi: GolgiApparatus,
  nucleus: CellNucleus,
};

type OrganismLayerProps = {
  organisms: Organism[];
  showNames: boolean;
  // The game loop moves organisms imperatively via these elements, so React
  // only re-renders this layer when membership changes (eaten / collected).
  registerEl: (id: string, el: HTMLDivElement | null) => void;
};

export const OrganismLayer = React.memo(function OrganismLayer({
  organisms,
  showNames,
  registerEl,
}: OrganismLayerProps) {
  return (
    <>
      {organisms.map((o) => {
        const Component = SPECIES_COMPONENTS[o.species];
        const width = typeof o.size === 'number' ? o.size : o.size.width;
        const height = typeof o.size === 'number' ? o.size : o.size.height;
        const interactive = o.kind !== 'ambient' || o.harmful;
        return (
          <div
            key={o.id}
            ref={(el) => registerEl(o.id, el)}
            className={
              'absolute top-0 left-0 will-change-transform' +
              (o.kind === 'organelle' ? ' transition-[filter,opacity] duration-300' : '')
            }
            style={{
              width,
              height,
              zIndex: interactive ? 20 : 10,
              transform: `translate(${o.pos.x}px, ${o.pos.y}px) rotate(${o.autonomous ? o.displayRotation : 0}deg)`,
            }}
          >
            <Component
              position={{ x: 0, y: 0 }}
              size={o.size}
              duration={o.render.duration}
              delay={o.render.delay}
              opacity={o.render.opacity}
              initialRotation={o.render.initialRotation}
              animationDirection={o.render.animationDirection}
              // Autonomous organisms are rotated by the wrapper; pass 0 so the
              // component only applies its own base-orientation offset.
              rotation={o.autonomous ? 0 : undefined}
              isMoving={o.autonomous}
              showName={showNames}
            />
          </div>
        );
      })}
    </>
  );
});
