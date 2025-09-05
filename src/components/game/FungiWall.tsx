
"use client";
import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type FungiWallProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  showName?: boolean;
};

export function FungiWall({ position, size, duration, delay, opacity, initialRotation = 0, showName = false }: FungiWallProps) {

    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration * 2}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transformOrigin: 'center center',
    };

    const containerStyle: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
        filter: `drop-shadow(0 0 25px hsl(var(--destructive) / 0.5))`
    };

    const bodyStyle: React.CSSProperties = {
        transform: `rotate(${initialRotation}deg)`,
        width: '100%',
        height: '100%',
    };

    return (
        <div style={containerStyle} className="absolute">
             <div className="relative w-full h-full">
                <OrganismNameLabel name={FungiWall.displayName} size={size} showName={showName} />
                <div style={bodyStyle}>
                    <div style={animationStyle} className="w-full h-full">
                        <svg width={size} height={size} viewBox="0 0 100 100">
                            <defs>
                                <filter id="fungi-glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                                </filter>
                            </defs>
                            
                            {/* Mycelium Network */}
                            <g 
                                stroke="hsl(var(--destructive) / 0.8)" 
                                strokeWidth="2.5" 
                                fill="none" 
                                strokeLinecap="round"
                                filter="url(#fungi-glow)"
                            >
                                {/* Main Branches */}
                                <path d="M 50,10 C 30,30 70,40 50,60" />
                                <path d="M 50,60 C 40,80 80,90 60,95" />
                                <path d="M 50,60 C 20,70 10,50 25,40" />
                                <path d="M 25,40 C 5,30 15,10 30,15" />
                                <path d="M 50,60 C 80,50 90,70 75,80" />
                                <path d="M 75,80 C 95,90 90,60 80,50" />
                                <path d="M 80,50 C 70,30 95,20 85,15" />
                                
                                {/* Smaller connecting branches */}
                                <path d="M 38,22 C 45,35 30,45 35,55" />
                                <path d="M 62,18 C 55,30 70,35 65,48" />
                                <path d="M 45,75 C 30,85 20,70 30,65" />
                                <path d="M 60,85 C 75,90 85,75 78,70" />
                            </g>

                            {/* Spore nodes */}
                             <g fill="hsl(var(--destructive))">
                                <circle cx="50" cy="60" r="4" />
                                <circle cx="25" cy="40" r="3" />
                                <circle cx="80" cy="50" r="3.5" />
                                <circle cx="30" cy="15" r="2.5" />
                                <circle cx="75" cy="80" r="3" />
                                <circle cx="60" cy="95" r="2" />
                            </g>

                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}

FungiWall.displayName = 'Fungal Wall';
FungiWall.isHarmful = true;

