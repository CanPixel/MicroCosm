
"use client";
import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type RodBacteriaProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  animationDirection?: 'normal' | 'reverse';
  rotation?: number;
  showName?: boolean;
};

export function RodBacteria({ position, size, duration, delay, opacity, initialRotation = 0, animationDirection = 'normal', rotation = initialRotation, showName = false }: RodBacteriaProps) {
    const animationName = animationDirection === 'reverse' ? 'spin-reverse' : 'spin';
    
    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration}s ease-in-out infinite, ${animationName} ${duration * 1.5}s linear infinite`,
        animationDelay: `${delay}s, ${delay}s`,
        transformOrigin: 'center center',
    };

    const containerStyle: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size / 2}px`,
        opacity: opacity,
    };

    const bodyStyle: React.CSSProperties = {
        transform: `rotate(${rotation}deg)`,
        width: '100%',
        height: '100%',
    };

    return (
        <div style={containerStyle} className="absolute">
            <OrganismNameLabel name={RodBacteria.displayName} size={size} showName={showName} />
            <div style={bodyStyle}>
                <div style={animationStyle} className="w-full h-full">
                    <svg width={size} height={size/2} viewBox={`0 0 20 10`} style={{ overflow: 'visible' }}
                         fill="url(#mc-microbe-body)" stroke="hsl(198 75% 62%)" strokeWidth="0.8">
                        <rect x="1" y="1" width="18" height="8" rx="4" ry="4" />
                        <ellipse cx="6" cy="3.4" rx="3" ry="1.2" fill="hsl(185 80% 72% / 0.5)" stroke="none" />
                        <circle cx="7" cy="5" r="0.9" fill="hsl(224 71% 8% / 0.6)" stroke="none" />
                        <circle cx="10" cy="5" r="0.9" fill="hsl(224 71% 8% / 0.6)" stroke="none" />
                        <circle cx="13" cy="5" r="0.9" fill="hsl(224 71% 8% / 0.6)" stroke="none" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

RodBacteria.displayName = 'Rod-shaped Bacteria';
