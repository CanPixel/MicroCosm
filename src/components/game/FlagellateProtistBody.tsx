
"use client";
import React from 'react';

type FlagellateProtistBodyProps = {
  size: number;
  duration: number;
  delay: number;
  animationDirection?: 'normal' | 'reverse';
};

export function FlagellateProtistBody({ size, duration, delay, animationDirection = 'normal' }: FlagellateProtistBodyProps) {
    const animationName = animationDirection === 'reverse' ? 'spin-reverse' : 'spin';

    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration}s ease-in-out infinite, ${animationName} ${duration * 2}s linear infinite`,
        animationDelay: `${delay}s, ${delay}s`,
        transformOrigin: 'center center',
    };

    return (
        <div style={animationStyle} className="w-full h-full">
            <svg width={size} height={size} viewBox="0 0 20 20">
                <g transform="translate(4,2) rotate(10)">
                    {/* Body */}
                    <circle cx="7" cy="7" r="6" fill="hsl(var(--primary) / 0.6)" />
                    <circle cx="6" cy="6" r="1" fill="hsl(var(--background) / 0.2)" />
                    <circle cx="8" cy="8.5" r="0.8" fill="hsl(var(--background) / 0.2)" />
                    <circle cx="5" cy="8" r="0.5" fill="hsl(var(--background) / 0.2)" />
                </g>
            </svg>
        </div>
    );
}
