
"use client";
import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type AmoebaProps = {
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

export function Amoeba({ position, size, duration, delay, opacity, initialRotation = 0, animationDirection = 'normal', rotation = initialRotation, showName = false }: AmoebaProps) {
    const animationName = animationDirection === 'reverse' ? 'spin-reverse' : 'spin';
    
    const animationStyle: React.CSSProperties = {
        animation: `morph ${duration/2}s ease-in-out infinite, ${animationName} ${duration * 4}s linear infinite`,
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
            <OrganismNameLabel name={Amoeba.displayName} size={size} showName={showName} />
            <div style={bodyStyle}>
                <div style={animationStyle} className="w-full h-full">
                    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
                        {/* Broad lobose pseudopods and an asymmetric rear uroid. */}
                        <path
                            d="M18 58C7 52 9 40 23 36C20 24 31 16 42 24C49 11 65 15 66 29C79 23 90 32 84 44C97 50 92 65 79 65C82 79 68 86 58 77C49 91 32 86 34 72C22 78 11 69 18 58Z"
                            fill="none"
                            stroke="hsl(224 22% 8% / .72)"
                            strokeWidth="5"
                            transform="translate(1 1)"
                        />
                        <path
                            d="M18 58C7 52 9 40 23 36C20 24 31 16 42 24C49 11 65 15 66 29C79 23 90 32 84 44C97 50 92 65 79 65C82 79 68 86 58 77C49 91 32 86 34 72C22 78 11 69 18 58Z"
                            fill="hsl(263 62% 38% / .58)"
                            stroke="hsl(263 88% 68%)"
                            strokeWidth="3.2"
                        />
                        <path
                            d="M18 58C7 52 9 40 23 36C20 24 31 16 42 24C49 11 65 15 66 29C79 23 90 32 84 44C97 50 92 65 79 65C82 79 68 86 58 77C49 91 32 86 34 72C22 78 11 69 18 58Z"
                            fill="none"
                            stroke="hsl(190 46% 94% / .48)"
                            strokeWidth="1.7"
                            transform="translate(-.8 -.8)"
                        />

                        {/* Endoplasm, contractile vacuoles and granular inclusions. */}
                        <ellipse cx="49" cy="51" rx="14" ry="12" fill="url(#mc-core-hot)" opacity=".88" />
                        <circle cx="45" cy="47" r="4" fill="hsl(340 100% 92% / .72)" />
                        <circle cx="70" cy="48" r="8" fill="hsl(190 66% 82% / .18)" stroke="hsl(190 75% 88% / .62)" strokeWidth="1.5" />
                        <circle cx="29" cy="52" r="5.5" fill="hsl(190 66% 82% / .12)" stroke="hsl(190 60% 88% / .42)" strokeWidth="1.2" />
                        <g fill="hsl(52 90% 72% / .58)">
                            <circle cx="37" cy="33" r="1.8" /><circle cx="58" cy="35" r="1.4" />
                            <circle cx="62" cy="66" r="1.7" /><circle cx="39" cy="68" r="1.2" />
                            <circle cx="76" cy="58" r="1.3" /><circle cx="25" cy="43" r="1.1" />
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    );
}

Amoeba.displayName = 'Amoeba';
