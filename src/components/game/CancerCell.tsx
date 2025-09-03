
"use client";
import React from 'react';

type CancerCellProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  rotation?: number;
};

// Simplified tentacles for animation
const tentacles = [
    { d: "M 10,28 C 5,35 5,45 12,50", delay: "0s" },
    { d: "M 15,29 C 10,40 15,52 20,55", delay: "0.2s" },
    { d: "M 22,30 C 20,45 28,55 30,58", delay: "0.4s" },
    { d: "M 30,30 C 35,45 35,58 40,60", delay: "0.1s" },
    { d: "M 38,29 C 45,40 48,52 50,54", delay: "0.3s" },
    { d: "M 45,28 C 50,35 55,45 58,50", delay: "0.5s" },
    { d: "M 25,10 C 15,5 5,10 2,15", delay: "0.2s" },
    { d: "M 35,10 C 45,5 55,10 58,15", delay: "0.3s" },
];

export function CancerCell({ position, size, duration, opacity, rotation = 0 }: CancerCellProps) {

    const animationStyle: React.CSSProperties = {
        animation: `cancer-pulse ${duration/2}s ease-in-out infinite`,
        transformOrigin: 'center center',
    };

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
        transform: `rotate(${rotation}deg)`,
    };

    return (
        <div style={style} className="absolute">
             <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size} viewBox="0 0 60 60">
                    <defs>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                        </filter>
                    </defs>

                    {/* Tentacles */}
                    <g filter="url(#glow)">
                        {tentacles.map((t, i) => (
                            <path
                                key={`tentacle-${i}`}
                                d={t.d}
                                stroke="hsl(var(--chart-3) / 0.8)"
                                strokeWidth="3"
                                fill="none"
                                strokeLinecap="round"
                                style={{
                                    animation: `tentacle-whip ${duration / 4}s ease-in-out infinite alternate`,
                                    animationDelay: t.delay,
                                    transformOrigin: '50% 50%',
                                }}
                            />
                        ))}
                    </g>
                    
                    {/* Body */}
                    <path
                        d="M 10,30 C -10,10 70,10 50,30 C 70,50 -10,50 10,30 Z"
                        fill="hsl(var(--destructive) / 0.7)"
                        stroke="hsl(var(--destructive))"
                        strokeWidth="2"
                    />
                    <path
                        d="M 15,30 C 5,15 55,15 45,30 C 55,45 5,45 15,30 Z"
                        fill="hsl(var(--chart-3) / 0.6)"
                    />
                    
                    {/* Mouth */}
                    <path
                        d="M 20,35 C 25,45 35,45 40,35 L 35,25 L 25,25 Z"
                        fill="hsl(var(--background))"
                    />
                    {/* Teeth */}
                    <rect x="26" y="26" width="3" height="4" fill="hsl(var(--foreground))" rx="1"/>
                    <rect x="31" y="26" width="3" height="4" fill="hsl(var(--foreground))" rx="1"/>
                    <rect x="27" y="35" width="3" height="4" fill="hsl(var(--foreground))" rx="1"/>
                    <rect x="30" y="35" width="3" height="4" fill="hsl(var(--foreground))" rx="1"/>

                    {/* Eyes */}
                    <g>
                        <circle cx="20" cy="20" r="5" fill="hsl(var(--background))" />
                        <circle cx="21" cy="19" r="2" fill="hsl(var(--destructive))" />
                    </g>
                    <g>
                        <circle cx="40" cy="20" r="5" fill="hsl(var(--background))" />
                        <circle cx="39" cy="19" r="2" fill="hsl(var(--destructive))" />
                    </g>
                </svg>
            </div>
        </div>
    );
}
