"use client";

import React from 'react';
import { Organism, SpeciesId } from '@/lib/game/types';
import { Amoeba } from './Amoeba';
import { Tardigrade } from './Tardigrade';
import { SpikyVirus } from './SpikyVirus';
import { RodBacteria } from './RodBacteria';
import { FlagellateProtist } from './FlagellateProtist';
import { Ciliate } from './Ciliate';
import { GiantVirusEntity } from './GiantVirusEntity';
import { FungiWall } from './FungiWall';
import { Mitochondrion } from './Mitochondrion';
import { GolgiApparatus } from './GolgiApparatus';
import { CellNucleus } from './CellNucleus';
import { renderDimensions } from '@/lib/game/world';

type OrganismComponentProps = {
  position: { x: number; y: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  size: any;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  animationDirection?: 'normal' | 'reverse';
  rotation?: number;
  isMoving?: boolean;
  showName?: boolean;
};

const SPECIES_COMPONENTS: Record<SpeciesId, React.FC<OrganismComponentProps>> = {
  amoeba: Amoeba,
  tardigrade: Tardigrade,
  spikyVirus: SpikyVirus,
  rodBacteria: RodBacteria,
  flagellateProtist: FlagellateProtist,
  ciliate: Ciliate,
  giantVirus: GiantVirusEntity,
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
        const { width, height } = renderDimensions(o);
        const interactive = o.kind !== 'ambient' || o.harmful;
        return (
          <div
            key={o.id}
            ref={(el) => registerEl(o.id, el)}
            className={
              'absolute top-0 left-0' +
              (o.kind === 'organelle' ? ' transition-opacity duration-300' : '')
            }
            style={{
              width,
              height,
              zIndex: interactive ? 20 : 10,
              transform: `translate(${o.pos.x - width / 2}px, ${o.pos.y - height / 2}px) rotate(${o.autonomous ? o.displayRotation : 0}deg)`,
              transformOrigin: '50% 50%',
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
