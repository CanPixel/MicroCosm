
"use client";
import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type TardigradeProps = {
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

// A simplified tardigrade
export function Tardigrade({ position, size, duration, delay, opacity, initialRotation = 0, animationDirection = 'normal', rotation = initialRotation, showName = false }: TardigradeProps) {
    const animationName = animationDirection === 'reverse' ? 'spin-reverse' : 'spin';

    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration * 1.5}s ease-in-out infinite, ${animationName} ${duration * 3}s linear infinite`,
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
        transform: `rotate(${rotation}deg)`,
        width: '100%',
        height: '100%',
    };

    return (
        <div style={containerStyle} className="absolute">
            <OrganismNameLabel name={Tardigrade.displayName} size={size} showName={showName} />
            <div style={bodyStyle}>
                <div style={animationStyle} className="w-full h-full">
                    <svg width={size} height={size} viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
                        <g transform="rotate(90 20 20)">
                            {/* Legs (behind body) */}
                            <g fill="none" stroke="hsl(24 90% 48%)" strokeWidth="2.2" strokeLinecap="round">
                                <path d="M 12,12 C 8,12 6,10 6,14" />
                                <path d="M 12,18 C 6,18 4,16 4,20" />
                                <path d="M 12,24 C 8,24 6,26 6,30" />
                                <path d="M 28,12 C 32,12 34,10 34,14" />
                                <path d="M 28,18 C 34,18 36,16 36,20" />
                                <path d="M 28,24 C 32,24 34,26 34,30" />
                            </g>
                            {/* Body */}
                            <path d="M 15,5 C 5,15 5,25 15,35 L 25,35 C 35,25 35,15 25,5 Z"
                                fill="url(#mc-organelle-warm)"
                                stroke="hsl(28 95% 60%)"
                                strokeWidth="2"
                            />
                            {/* Segments */}
                            <g fill="none" stroke="hsl(12 90% 42%)" strokeWidth="1.3">
                                <path d="M 16,9 C 10,16 10,24 16,31" />
                                <path d="M 20,7 C 15,16 15,24 20,33" />
                                <path d="M 24,9 C 30,16 30,24 24,31" />
                            </g>
                            {/* Head */}
                            <path d="M 25,5 C 22,2 18,2 15,5" fill="hsl(340 85% 55%)" stroke="hsl(340 90% 65%)" strokeWidth="0.8"/>
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    );
}

Tardigrade.displayName = 'Tardigrade';
