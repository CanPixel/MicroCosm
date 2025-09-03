"use client";
import React from 'react';

type BacteriophageProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  animationDirection?: 'normal' | 'reverse';
};

export function Bacteriophage({ position, size, duration, delay, opacity, initialRotation = 0, animationDirection = 'normal' }: BacteriophageProps) {
    const animationName = animationDirection === 'reverse' ? 'spin-reverse' : 'spin';

    const animationStyle: React.CSSProperties = {
        animation: `jitter ${duration / 2}s ease-in-out infinite, ${animationName} ${duration * 4}s linear infinite`,
        animationDelay: `${delay}s, ${delay}s`,
        transformOrigin: 'center center',
    };

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
        transform: `rotate(${initialRotation}deg)`,
    };

    return (
        <div style={style} className="absolute">
             <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size} viewBox="0 0 20 20" stroke="hsl(var(--accent))" strokeWidth="0.7" fill="hsl(var(--accent) / 0.3)">
                    {/* Head */}
                    <polygon points="10,2 15,6 15,11 10,15 5,11 5,6" />
                    
                    {/* Collar */}
                    <rect x="8" y="15" width="4" height="1" fill="hsl(var(--accent))"/>

                    {/* Tail */}
                    <rect x="9" y="16" width="2" height="4" />

                    {/* Tail Fibers */}
                    <g strokeWidth="0.5" stroke="hsl(var(--accent))" fill="none">
                        <path d="M 8,20 l -4,2" />
                        <path d="M 12,20 l 4,2" />
                        <path d="M 8,20 l -3,-1" />
                        <path d="M 12,20 l 3,-1" />
                    </g>
                </svg>
            </div>
        </div>
    );
}
