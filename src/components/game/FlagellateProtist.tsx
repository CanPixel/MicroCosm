"use client";
import React from 'react';

type FlagellateProtistProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  animationDirection?: 'normal' | 'reverse';
  rotation?: number;
};

export function FlagellateProtist({ position, size, duration, delay, opacity, initialRotation = 0, animationDirection = 'normal', rotation = initialRotation }: FlagellateProtistProps) {
    const animationName = animationDirection === 'reverse' ? 'spin-reverse' : 'spin';

    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration}s ease-in-out infinite, ${animationName} ${duration * 2}s linear infinite`,
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
    };

    const flagellaAnimationStyle1: React.CSSProperties = {
        animation: `whip ${duration / 4}s ease-in-out infinite alternate`,
        animationDelay: `${delay}s`,
        transformOrigin: '20% 80%',
    };

     const flagellaAnimationStyle2: React.CSSProperties = {
        animation: `whip ${duration / 3.5}s ease-in-out infinite alternate`,
        animationDelay: `${delay + 0.5}s`,
        transformOrigin: '20% 80%',
    };

    return (
        <div style={style} className="absolute">
            <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size} viewBox="0 0 20 20">
                     <g transform="translate(4,2) rotate(10)">
                        {/* Body */}
                        <circle cx="7" cy="7" r="6" fill="hsl(var(--primary) / 0.6)" />
                        <circle cx="6" cy="6" r="1" fill="hsl(var(--background) / 0.2)" />
                        <circle cx="8" cy="8.5" r="0.8" fill="hsl(var(--background) / 0.2)" />
                        <circle cx="5" cy="8" r="0.5" fill="hsl(var(--background) / 0.2)" />

                        {/* Flagella */}
                         <g style={flagellaAnimationStyle1}>
                            <path d="M 4,12 C -2,10 0,18 5,20" stroke="hsl(var(--chart-3))" fill="none" strokeWidth="1" strokeLinecap="round"/>
                         </g>
                         <g style={flagellaAnimationStyle2}>
                            <path d="M 5,12 C 0,10 -2,16 3,18" stroke="hsl(var(--chart-3))" fill="none" strokeWidth="1" strokeLinecap="round"/>
                         </g>
                    </g>
                </svg>
            </div>
        </div>
    );
}
