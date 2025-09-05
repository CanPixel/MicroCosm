
"use client";
import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type CiliateProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  animationDirection?: 'normal' | 'reverse';
  rotation?: number;
  showName?: boolean;
};

export function Ciliate({ position, size, duration, delay, opacity, initialRotation = 0, animationDirection = 'normal', rotation = initialRotation, showName = false }: CiliateProps) {
    const animationName = animationDirection === 'reverse' ? 'spin-reverse' : 'spin';
    
    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration}s ease-in-out infinite, ${animationName} ${duration * 2.5}s linear infinite`,
        animationDelay: `${delay}s, ${delay}s`,
        transformOrigin: 'center center',
    };

    const containerStyle: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
    };

    const bodyStyle: React.CSSProperties = {
        transform: `rotate(${rotation + 90}deg)`,
        width: '100%',
        height: '100%',
    };

    return (
        <div style={containerStyle} className="absolute">
            <OrganismNameLabel name={Ciliate.displayName} size={size} showName={showName} />
            <div style={bodyStyle}>
                <div style={animationStyle} className="w-full h-full">
                    <svg width={size} height={size} viewBox="0 0 100 100">
                      {/* Cilia */}
                      <g stroke="hsl(var(--destructive) / 0.8)" strokeWidth="1">
                        {Array.from({ length: 40 }).map((_, i) => {
                          const angle = (i / 40) * Math.PI * 1.8 + Math.PI * 0.1;
                          const r = 38;
                          const x1 = 50 + r * Math.cos(angle);
                          const y1 = 50 + r * Math.sin(angle);
                          const x2 = 50 + (r + 4) * Math.cos(angle);
                          const y2 = 50 + (r + 4) * Math.sin(angle);
                          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
                        })}
                      </g>

                      {/* Body */}
                      <path 
                          d="M 50,10 C 85,10 90,40 85,60 C 80,80 65,90 50,90 C 35,90 20,80 15,60 C 10,40 15,10 50,10 Z"
                          fill="hsl(var(--primary) / 0.8)" 
                          stroke="hsl(var(--destructive) / 0.9)" 
                          strokeWidth="2"
                      />

                      {/* Oral Groove */}
                      <path
                        d="M 50,60 C 45,70 48,85 50,90"
                        fill="none"
                        stroke="hsl(var(--background) / 0.4)"
                        strokeWidth="3"
                      />
                      
                      {/* Nucleus */}
                      <circle cx="50" cy="45" r="8" fill="hsl(var(--background) / 0.3)" />
                      <circle cx="53" cy="42" r="3" fill="hsl(var(--background) / 0.3)" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

Ciliate.displayName = 'Ciliate';
