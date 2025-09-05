
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
                    <svg width={size} height={size} viewBox="0 0 20 20">
                        <defs>
                            <pattern id="virus-pattern" patternUnits="userSpaceOnUse" width="4" height="4">
                                <circle cx="2" cy="2" r="0.5" fill="hsl(var(--primary) / 0.5)" />
                            </pattern>
                        </defs>

                        {/* Spikes */}
                        {Array.from({ length: NUM_SPIKES }).map((_, i) => {
                            const angle = (i / NUM_SPIKES) * 2 * Math.PI;
                            const x1 = 10 + 7 * Math.cos(angle);
                            const y1 = 10 + 7 * Math.sin(angle);
                            const x2 = 10 + 10 * Math.cos(angle);
                            const y2 = 10 + 10 * Math.sin(angle);
                            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--primary) / 0.8)" strokeWidth="0.5" />
                        })}

                        <circle cx="10" cy="10" r="7" fill="url(#virus-pattern)" />
                        <circle cx="10" cy="10" r="7" fill="transparent" stroke="hsl(var(--primary) / 0.7)" strokeWidth="0.7" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

SpikyVirus.displayName = 'Virus';
SpikyVirus.isHarmful = true;
