
"use client";
import React from 'react';

type FlagellaProps = {
  size: number;
  duration: number;
  delay: number;
  isMoving?: boolean;
};

export function Flagella({ size, duration, delay, isMoving = false }: FlagellaProps) {

    const flagellaAnimationStyle1: React.CSSProperties = {
        animation: isMoving ? `whip ${duration / 4}s ease-in-out infinite alternate` : 'none',
        animationDelay: `${delay}s`,
        transformOrigin: '20% 80%',
    };

     const flagellaAnimationStyle2: React.CSSProperties = {
        animation: isMoving ? `whip ${duration / 3.5}s ease-in-out infinite alternate` : 'none',
        animationDelay: `${delay + 0.5}s`,
        transformOrigin: '20% 80%',
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full">
            <svg width={size} height={size} viewBox="0 0 20 20" className="absolute top-0 left-0">
                <g transform="translate(4,2) rotate(10)">
                    <g style={flagellaAnimationStyle1}>
                        <path d="M 4,12 C -2,10 0,18 5,20" stroke="hsl(var(--chart-3))" fill="none" strokeWidth="1" strokeLinecap="round"/>
                    </g>
                    <g style={flagellaAnimationStyle2}>
                        <path d="M 5,12 C 0,10 -2,16 3,18" stroke="hsl(var(--chart-3))" fill="none" strokeWidth="1" strokeLinecap="round"/>
                    </g>
                </g>
            </svg>
        </div>
    );
}

