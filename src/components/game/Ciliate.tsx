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

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size * 0.7}px`, // Make it more pill-shaped
        opacity: opacity,
        transform: `rotate(${rotation + 90}deg)`,
    };

    return (
        <div style={{ top: `${position.y}px`, left: `${position.x}px`}} className="absolute">
            <OrganismNameLabel name={Ciliate.displayName} size={size} showName={showName} />
            <div style={{...style, top: 0, left: 0}} className="absolute">
                 <div style={animationStyle} className="w-full h-full">
                    <svg width={size} height={size * 0.7} viewBox="0 0 20 14">
                        {/* Cilia */}
                        {Array.from({ length: 30 }).map((_, i) => {
                            const perimeter = 2 * Math.PI * (10-2) + 2 * Math.PI * (7-2); // Approximation of pill shape perimeter
                            const progress = (i / 30);
                            
                            let x1, y1, angle;
                            const halfPerimeter = perimeter/2;
                            const arcLength = Math.PI * 5;
                            const straightLength = 10;
                            
                            if (progress * perimeter < arcLength) { // Top arc
                               angle = (progress * perimeter / 5) * Math.PI - Math.PI / 2;
                               x1 = 5 + 5 * Math.cos(angle);
                               y1 = 7 + 5 * Math.sin(angle);
                            } else if (progress * perimeter < arcLength + straightLength) { // right side
                                const len = progress * perimeter - arcLength;
                                x1 = 5;
                                y1 = 12 - len;
                                angle = -Math.PI/2;
                            } else if (progress * perimeter < arcLength * 2 + straightLength) { // bottom arc
                                angle = ((progress * perimeter - straightLength - arcLength) / 5) * Math.PI + Math.PI / 2;
                                x1 = 15 + 5 * Math.cos(angle);
                                y1 = 7 + 5 * Math.sin(angle);
                            } else { // left side
                                const len = progress * perimeter - arcLength * 2 - straightLength;
                                x1 = 15;
                                y1 = 2 + len;
                                angle = Math.PI/2;
                            }

                            const length = 1.5;
                            const x2 = x1 + length * Math.cos(angle);
                            const y2 = y1 + length * Math.sin(angle);
                            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--destructive) / 0.9)" strokeWidth="0.5" />
                        })}

                        {/* Body */}
                        <path 
                            d="M 5,2 A 5,5 0 0 1 5,12 L 15,12 A 5,5 0 0 1 15,2 Z" 
                            fill="hsl(var(--primary) / 0.8)" 
                            stroke="hsl(var(--destructive) / 0.9)" 
                            strokeWidth="1"
                        />

                        {/* Nucleus */}
                        <circle cx="13" cy="7" r="2.5" fill="hsl(var(--background) / 0.3)" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

Ciliate.displayName = 'Ciliate';
