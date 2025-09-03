
"use client";
import React from 'react';

type TardigradeProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  animationDirection?: 'normal' | 'reverse';
  rotation?: number;
};

// A simplified tardigrade
export function Tardigrade({ position, size, duration, delay, opacity, initialRotation = 0, animationDirection = 'normal', rotation = initialRotation }: TardigradeProps) {
    const animationName = animationDirection === 'reverse' ? 'spin-reverse' : 'spin';

    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration * 1.5}s ease-in-out infinite, ${animationName} ${duration * 3}s linear infinite`,
        animationDelay: `${delay}s, ${delay}s`,
        transformOrigin: 'center center',
    };

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
        transform: `rotate(${rotation}deg)`, // Facing right originally, so no offset needed
    };

    return (
        <div style={style} className="absolute">
             <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size} viewBox="0 0 40 40">
                    <g transform="rotate(90 20 20)">
                        {/* Body */}
                        <path d="M 15,5 C 5,15 5,25 15,35 L 25,35 C 35,25 35,15 25,5 Z" 
                            fill="hsl(var(--chart-3) / 0.4)" 
                            stroke="hsl(var(--chart-3))"
                            strokeWidth="1.5"
                        />
                        {/* Segments */}
                        <path d="M 16,9 C 10,16 10,24 16,31" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="1" />
                        <path d="M 20,7 C 15,16 15,24 20,33" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="1" />
                        <path d="M 24,9 C 30,16 30,24 24,31" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="1" />

                        {/* Head Area */}
                        <path d="M 25,5 C 22,2 18,2 15,5" fill="hsl(var(--accent) / 0.3)" stroke="hsl(var(--accent))" strokeWidth="0.5"/>

                        {/* Legs */}
                        <path d="M 12,12 C 8,12 6,10 6,14" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="1.5" />
                        <path d="M 12,18 C 6,18 4,16 4,20" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="1.5" />
                        <path d="M 12,24 C 8,24 6,26 6,30" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="1.5" />
                        
                        <path d="M 28,12 C 32,12 34,10 34,14" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="1.5" />
                        <path d="M 28,18 C 34,18 36,16 36,20" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="1.5" />
                        <path d="M 28,24 C 32,24 34,26 34,30" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="1.5" />
                    </g>
                </svg>
            </div>
        </div>
    );
}
