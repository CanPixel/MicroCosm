
"use client";
import React from 'react';

type FungiWallProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
};

// Simplified tentacles for animation
const tentacles = [
    { d: "M 50,5 C 40,20 60,30 55,45", delay: "0s" },
    { d: "M 10,10 C 25,20 5,35 15,50", delay: "0.5s" },
    { d: "M 80,20 C 95,30 70,45 85,60", delay: "0.2s" },
    { d: "M 20,80 C 30,95 45,70 60,85", delay: "0.7s" },
    { d: "M 80,80 C 90,90 90,70 95,65", delay: "0.3s" },
];

export function FungiWall({ position, size, duration, delay, opacity, initialRotation = 0 }: FungiWallProps) {

    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration * 2}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transformOrigin: 'center center',
    };

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
        transform: `rotate(${initialRotation}deg)`,
        filter: `drop-shadow(0 0 25px hsl(var(--destructive) / 0.5))`
    };

    return (
        <div style={style} className="absolute">
             <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size} viewBox="0 0 100 100">
                    <defs>
                        <filter id="fungi-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                        </filter>
                    </defs>

                    {/* Tentacles */}
                    <g filter="url(#fungi-glow)">
                        {tentacles.map((t, i) => (
                            <path
                                key={`tentacle-${i}`}
                                d={t.d}
                                stroke="hsl(var(--destructive) / 0.7)"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                style={{
                                    animation: `sine-wave ${duration / 3}s ease-in-out infinite alternate`,
                                    animationDelay: t.delay,
                                    transformOrigin: '50% 50%',
                                }}
                            />
                        ))}
                    </g>
                    
                    {/* Body */}
                    <g fill="hsl(var(--destructive) / 0.5)" stroke="hsl(var(--destructive))" strokeWidth="2">
                        <path d="M 50,0 C 20,20 80,30 50,50 S 20,80 0,50" />
                        <path d="M 50,100 C 80,80 20,70 50,50 S 80,20 100,50" />
                        <path d="M 0,50 C 20,40 30,80 50,50" />
                        <path d="M 100,50 C 80,60 70,20 50,50" />
                    </g>

                </svg>
            </div>
        </div>
    );
}
