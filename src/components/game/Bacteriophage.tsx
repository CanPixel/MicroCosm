import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type Props = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  rotation?: number;
  showName?: boolean;
};

export function Bacteriophage({ position, size, duration, delay, opacity, initialRotation = 0, rotation = initialRotation, showName = false }: Props) {
  return (
    <div
      className="absolute"
      style={{ top: position.y, left: position.x, width: size, height: size, opacity }}
    >
      <OrganismNameLabel name={Bacteriophage.displayName} size={size} showName={showName} />
      <div
        className="h-full w-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: '50% 50%',
          animation: `phage-twitch ${Math.max(1.4, duration / 14)}s ease-in-out ${delay}s infinite alternate`,
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 32 24" aria-hidden>
          <g strokeLinejoin="round" strokeLinecap="round">
            {/* Tail fibers and receptor legs, kept inside the declared viewBox. */}
            <g fill="none" stroke="hsl(284 88% 70%)" strokeWidth="1.25">
              <path d="M10 12 4 6 1.7 6" />
              <path d="M10 12 4 18 1.7 18" />
              <path d="M7 12 2.5 9" />
              <path d="M7 12 2.5 15" />
            </g>

            {/* Contractile injection tail. */}
            <path d="M8 10.3h8.2v3.4H8z" fill="hsl(279 68% 38%)" stroke="hsl(290 92% 72%)" strokeWidth="1" />
            <path d="M10 10.3v3.4M12 10.3v3.4M14 10.3v3.4" stroke="hsl(321 90% 70% / .65)" strokeWidth=".65" />
            <path d="M16.2 11h2.2v2h-2.2z" fill="hsl(300 80% 62%)" stroke="hsl(300 95% 80%)" strokeWidth=".7" />

            {/* Icosahedral capsid, pointed in the direction of travel. */}
            <path d="m18.2 12 3.6-7 6.9 1.2 2.2 5.8-2.2 5.8-6.9 1.2z" fill="url(#mc-virus-body)" stroke="hsl(291 88% 70%)" strokeWidth="1.15" />
            <path d="m21.8 5 2.1 7-2.1 7M23.9 12h7" fill="none" stroke="hsl(207 90% 76% / .38)" strokeWidth=".7" />
            <circle cx="25.4" cy="9" r="1.05" fill="hsl(48 100% 68%)" stroke="none" />
            <circle cx="27.2" cy="13.1" r=".75" fill="hsl(48 100% 72%)" stroke="none" />
            <circle cx="23.5" cy="14.5" r=".65" fill="hsl(48 100% 72% / .8)" stroke="none" />
            <path d="M22.5 6.3 27 7" stroke="white" strokeOpacity=".32" strokeWidth="1" />
          </g>
        </svg>
      </div>
    </div>
  );
}

Bacteriophage.displayName = 'Bacteriophage';
Bacteriophage.isInfectious = true;
