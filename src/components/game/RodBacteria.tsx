
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

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size / 2}px`,
        opacity: opacity,
        transform: `rotate(${rotation}deg)`,
    };

    return (
        <div style={style} className="absolute">
            <OrganismNameLabel name={RodBacteria.displayName} size={size} showName={showName} />
            <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size/2} viewBox={`0 0 20 10`} fill="hsl(var(--accent) / 0.5)" stroke="hsl(var(--accent))" strokeWidth="0.5">
                    <rect x="1" y="1" width="18" height="8" rx="4" ry="4" />
                    <circle cx="7" cy="5" r="0.8" fill="hsl(var(--background))" stroke="none" />
                    <circle cx="10" cy="5" r="0.8" fill="hsl(var(--background))" stroke="none" />
                    <circle cx="13" cy="5" r="0.8" fill="hsl(var(--background))" stroke="none" />
                </svg>
            </div>
        </div>
    );
}

RodBacteria.displayName = 'Rod-shaped Bacteria';
