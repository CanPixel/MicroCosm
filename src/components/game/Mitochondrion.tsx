
"use client";
import React from 'react';

type MitochondrionProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
};

export function Mitochondrion({ position, size, duration, delay, opacity, initialRotation = 0 }: MitochondrionProps) {

    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transformOrigin: 'center center',
    };

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size * 0.6}px`, // Make it oblong
        opacity: opacity,
        transform: `rotate(${initialRotation}deg)`,
    };

    return (
        <div style={style} className="absolute">
             <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size * 0.6} viewBox="0 0 50 30">
                    {/* Outer membrane */}
                    <path 
                        d="M 5,15 C 5,5 45,5 45,15 C 45,25 5,25 5,15 Z" 
                        fill="hsl(var(--chart-3) / 0.8)" 
                        stroke="hsl(var(--chart-3) / 0.9)" 
                        strokeWidth="1"
                    />
                     {/* Inner membrane (cristae) */}
                    <path 
                        d="M 10,15 C 10,10 15,10 15,15 S 20,20 20,15 S 25,10 25,15 S 30,20 30,15 S 35,10 35,15 S 40,20 40,15"
                        fill="none" 
                        stroke="hsl(var(--destructive) / 0.7)" 
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    {/* Matrix dots */}
                    <circle cx="12" cy="18" r="0.7" fill="hsl(var(--primary) / 0.5)"/>
                    <circle cx="18" cy="12" r="0.7" fill="hsl(var(--primary) / 0.5)"/>
                    <circle cx="22" cy="18" r="0.7" fill="hsl(var(--primary) / 0.5)"/>
                    <circle cx="28" cy="12" r="0.7" fill="hsl(var(--primary) / 0.5)"/>
                    <circle cx="33" cy="18" r="0.7" fill="hsl(var(--primary) / 0.5)"/>
                    <circle cx="38" cy="12" r="0.7" fill="hsl(var(--primary) / 0.5)"/>
                </svg>
            </div>
        </div>
    );
}
