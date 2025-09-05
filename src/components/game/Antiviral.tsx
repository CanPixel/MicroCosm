
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
        filter: 'drop-shadow(0 0 10px hsl(var(--primary) / 0.9))',
    };

    const animationStyle: React.CSSProperties = {
        animation: 'spin 10s linear infinite',
    };

    return (
        <div style={style} className="absolute">
            <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size} viewBox="0 0 20 20" fill="hsl(var(--primary))">
                    <rect x="8" y="2" width="4" height="16" rx="1" />
                    <rect x="2" y="8" width="16" height="4" rx="1" />
                </svg>
            </div>
        </div>
    );
}

    