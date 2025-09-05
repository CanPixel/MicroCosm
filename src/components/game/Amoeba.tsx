
"use client";
import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type AmoebaProps = {
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

export function Amoeba({ position, size, duration, delay, opacity, initialRotation = 0, animationDirection = 'normal', rotation = initialRotation, showName = false }: AmoebaProps) {
    const animationName = animationDirection === 'reverse' ? 'spin-reverse' : 'spin';
    
    const animationStyle: React.CSSProperties = {
        animation: `morph ${duration/2}s ease-in-out infinite, ${animationName} ${duration * 4}s linear infinite`,
        animationDelay: `${delay}s, ${delay}s`,
        transformOrigin: 'center center',
    };

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`, 
        opacity: opacity,
        transform: `rotate(${rotation + 90}deg)`,
        filter: `drop-shadow(0 0 15px hsl(var(--accent) / 0.5))`
    };

    return (
        <div style={style} className="absolute">
             <OrganismNameLabel name={Amoeba.displayName} size={size} showName={showName} />
             <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size} viewBox="0 0 20 20">
                    <path 
                        d="M 10,2 C 18,2 18,18 10,18 C 2,18 2,2 10,2 Z" 
                        fill="hsl(var(--accent) / 0.4)" 
                        stroke="hsl(var(--accent) / 0.9)" 
                        strokeWidth="1"
                    />
                    <circle cx="10" cy="10" r="3" fill="hsl(var(--background) / 0.3)" />
                </svg>
            </div>
        </div>
    );
}

Amoeba.displayName = 'Amoeba';
