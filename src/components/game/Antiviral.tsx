
"use client";

import React from 'react';

type AntiviralProps = {
  position: { x: number; y: number };
};

export function Antiviral({ position }: AntiviralProps) {
    const size = 20;

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        transform: 'translate(-50%, -50%)',
    };

    const animationStyle: React.CSSProperties = {
        animation: 'spin 10s linear infinite, pulse-glow 2.5s ease-in-out infinite',
    };

    return (
        <div style={style} className="absolute">
            <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size} viewBox="0 0 20 20" style={{ overflow: 'visible' }}>
                    {/* Healing capsule cross */}
                    <rect x="8" y="2" width="4" height="16" rx="2" fill="hsl(150 80% 55%)" />
                    <rect x="2" y="8" width="16" height="4" rx="2" fill="hsl(150 80% 55%)" />
                    <rect x="8.8" y="2.8" width="1.2" height="14.4" rx="0.6" fill="hsl(150 100% 85% / 0.8)" />
                </svg>
            </div>
        </div>
    );
}
