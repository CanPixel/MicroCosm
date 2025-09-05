
"use client";
import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type FungiWallProps = {
  position: { x: number; y: number };
  size: { width: number; height: number };
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  showName?: boolean;
};

const NUM_HAIRS = 20;

export function FungiWall({ position, size, duration, delay, opacity, initialRotation = 0, showName = false }: FungiWallProps) {

    const containerStyle: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        opacity: opacity,
        transform: `rotate(${initialRotation}deg)`,
        transformOrigin: 'center center',
        filter: `drop-shadow(0 0 15px hsl(120 50% 30% / 0.7))`
    };

    return (
        <div style={containerStyle} className="absolute">
             <div className="relative w-full h-full">
                <OrganismNameLabel name={FungiWall.displayName} size={Math.max(size.width, size.height)} showName={showName} />
                <div className="w-full h-full">
                    <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="none">
                        {/* Hairy bits - top */}
                        <g stroke="hsl(120 50% 50% / 0.8)" strokeWidth="1" fill="none" strokeLinecap="round">
                            {Array.from({ length: NUM_HAIRS }).map((_, i) => (
                                <path
                                    key={`hair-top-${i}`}
                                    d={`M ${5 + i * (90 / (NUM_HAIRS -1))} 10 Q ${5 + i * (90 / (NUM_HAIRS-1)) + (i%2 === 0 ? -2 : 2)} 5, ${5 + i * (90 / (NUM_HAIRS - 1))} 0`}
                                    style={{
                                        animation: `sine-wave ${2 + Math.random() * 2}s ease-in-out ${Math.random() * -4}s infinite alternate`
                                    }}
                                />
                            ))}
                        </g>
                        
                        {/* Hairy bits - bottom */}
                         <g stroke="hsl(120 50% 50% / 0.8)" strokeWidth="1" fill="none" strokeLinecap="round">
                            {Array.from({ length: NUM_HAIRS }).map((_, i) => (
                                <path
                                    key={`hair-bottom-${i}`}
                                    d={`M ${5 + i * (90 / (NUM_HAIRS - 1))} 40 Q ${5 + i * (90 / (NUM_HAIRS - 1)) + (i%2 === 0 ? 2 : -2)} 45, ${5 + i * (90 / (NUM_HAIRS - 1))} 50`}
                                    style={{
                                        animation: `sine-wave ${2 + Math.random() * 2}s ease-in-out ${Math.random() * -4}s infinite alternate`
                                    }}
                                />
                            ))}
                        </g>

                        {/* Main Body */}
                        <rect x="0" y="10" width="100" height="30" rx="10" fill="hsl(120 40% 30%)" stroke="hsl(120 50% 50%)" strokeWidth="1.5" />
                        
                        {/* Yucky spots */}
                        <g fill="hsl(120 50% 20% / 0.5)">
                            <circle cx="20" cy="25" r="5" />
                            <circle cx="50" cy="25" r="8" />
                            <circle cx="85" cy="25" r="4" />
                            <circle cx="35" cy="20" r="3" />
                             <circle cx="65" cy="30" r="6" />
                        </g>

                    </svg>
                </div>
            </div>
        </div>
    );
}

FungiWall.displayName = 'Fungal Wall';
FungiWall.isHarmful = true;
