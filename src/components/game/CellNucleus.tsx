
"use client";
import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type CellNucleusProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  showName?: boolean;
};

export function CellNucleus({ position, size, duration, delay, opacity, initialRotation = 0, showName = false }: CellNucleusProps) {

    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transformOrigin: 'center center',
    };

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
        transform: `rotate(${initialRotation}deg)`,
    };

    return (
        <div style={style} className="absolute">
            <OrganismNameLabel name={CellNucleus.displayName} size={size} showName={showName} />
             <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size} viewBox="0 0 60 60">
                    {/* Outer Circle */}
                    <circle cx="30" cy="30" r="28" fill="hsl(var(--destructive) / 0.3)" stroke="hsl(var(--destructive) / 0.5)" strokeWidth="2" />
                    
                    {/* Nucleus */}
                    <circle cx="30" cy="30" r="12" fill="hsl(var(--destructive) / 0.6)" />
                    
                    {/* Chromatin Squiggle */}
                    <path d="M 25,30 C 20,20 40,20 35,30 S 20,40 30,40 S 40,25 35,22" fill="none" stroke="hsl(var(--primary) / 0.8)" strokeWidth="1.5" strokeLinecap="round"/>

                    {/* Ribosome dots */}
                    <circle cx="20" cy="22" r="1.5" fill="hsl(var(--chart-3))" />
                    <circle cx="42" cy="35" r="2" fill="hsl(var(--chart-3))" />
                    <circle cx="38" cy="18" r="1" fill="hsl(var(--chart-3))" />
                </svg>
            </div>
        </div>
    );
}

CellNucleus.displayName = 'Organelle: Nucleus';
CellNucleus.type = 'nucleus';
CellNucleus.isOrganelle = true;
