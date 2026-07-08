
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
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ overflow: 'visible' }} filter="url(#mc-bloom)">
                <g transform="translate(4,2) rotate(10)">
                    {/* Body */}
                    <ellipse cx="7" cy="7" rx="6" ry="6.6" fill="url(#mc-microbe-body)" stroke="hsl(198 75% 62%)" strokeWidth="0.7" />
                    <ellipse cx="5.5" cy="5" rx="2" ry="1.4" fill="hsl(185 80% 78% / 0.5)" />
                    <circle cx="7" cy="7" r="0.8" fill="hsl(224 71% 8% / 0.4)" />
                    <circle cx="8.5" cy="9" r="0.6" fill="hsl(224 71% 8% / 0.4)" />
                    <circle cx="5.5" cy="9" r="0.5" fill="hsl(224 71% 8% / 0.4)" />
                </g>
            </svg>
        </div>
    );
}
