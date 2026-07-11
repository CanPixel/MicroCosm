
"use client";
import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type SpikyVirusProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  animationDirection?: 'normal' | 'reverse';
  showName?: boolean;
};

const NUM_SPIKES = 20;

export function SpikyVirus({ position, size, duration, delay, opacity, initialRotation = 0, animationDirection = 'normal', showName = false }: SpikyVirusProps) {
    const animationName = animationDirection === 'reverse' ? 'spin-reverse' : 'spin';
    
    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration}s ease-in-out infinite, ${animationName} ${duration * 2}s linear infinite`,
        animationDelay: `${delay}s, ${delay}s`,
        transformOrigin: 'center center',
    };

    const containerStyle: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
    };

    const bodyStyle: React.CSSProperties = {
        transform: `rotate(${initialRotation}deg)`,
        width: '100%',
        height: '100%',
    };

    return (
        <div style={containerStyle} className="absolute">
            <OrganismNameLabel name={SpikyVirus.displayName} size={size} showName={showName} />
            <div style={bodyStyle}>
                <div style={animationStyle} className="w-full h-full">
                    <svg width={size} height={size} viewBox="0 0 20 20" style={{ overflow: 'visible' }}>
                        {/* Spikes: bold red corona knobs, like the reference virus. */}
                        {Array.from({ length: NUM_SPIKES }).map((_, i) => {
                            const angle = (i / NUM_SPIKES) * 2 * Math.PI;
                            const x1 = 10 + 6.5 * Math.cos(angle);
                            const y1 = 10 + 6.5 * Math.sin(angle);
                            const x2 = 10 + 9 * Math.cos(angle);
                            const y2 = 10 + 9 * Math.sin(angle);
                            return (
                              <g key={i}>
                                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(350 85% 55%)" strokeWidth="1.1" strokeLinecap="round" />
                                <circle cx={x2} cy={y2} r="1" fill="hsl(345 90% 62%)" />
                              </g>
                            );
                        })}

                        <circle cx="10" cy="10" r="6.8" fill="url(#mc-virus-body)" stroke="hsl(350 80% 45%)" strokeWidth="1" />
                        {/* Genetic speckles + highlight. */}
                        <circle cx="8" cy="8" r="1.3" fill="hsl(200 100% 88% / 0.8)" />
                        <circle cx="12" cy="9" r="0.8" fill="hsl(210 90% 78% / 0.5)" />
                        <circle cx="10.5" cy="12" r="0.7" fill="hsl(210 90% 78% / 0.5)" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

SpikyVirus.displayName = 'Virus';
SpikyVirus.isHarmful = true;
