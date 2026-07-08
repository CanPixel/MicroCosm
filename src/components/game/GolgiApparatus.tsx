
"use client";
import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type GolgiApparatusProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  showName?: boolean;
};

const paths = [
    { d: "M 10 20 C 20 10, 30 10, 40 20", stroke: "hsl(280 85% 68%)", strokeWidth: "3.5" },
    { d: "M 12 28 C 22 18, 32 18, 42 28", stroke: "hsl(285 80% 62%)", strokeWidth: "3" },
    { d: "M 15 36 C 25 26, 35 26, 45 36", stroke: "hsl(290 75% 58%)", strokeWidth: "2.5" },
    { d: "M 18 44 C 28 34, 38 34, 48 44", stroke: "hsl(295 70% 54%)", strokeWidth: "2" },
];

const vesicles = [
    { cx: 8, cy: 15, r: 2.2, fill: "hsl(45 100% 65%)" },
    { cx: 50, cy: 22, r: 3, fill: "hsl(45 100% 65%)" },
    { cx: 12, cy: 50, r: 2.5, fill: "hsl(45 100% 65%)" },
    { cx: 55, cy: 48, r: 1.8, fill: "hsl(45 100% 65%)" },
]

export function GolgiApparatus({ position, size, duration, delay, opacity, initialRotation = 0, showName = false }: GolgiApparatusProps) {

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
            <OrganismNameLabel name={GolgiApparatus.displayName} size={size} showName={showName} />
            <div style={animationStyle} className="w-full h-full">
                <svg width={size} height={size} viewBox="0 0 60 60" style={{ overflow: 'visible' }} filter="url(#mc-bloom)">
                    <g fill="none" strokeLinecap="round">
                        {paths.map((path, i) => (
                            <path key={`path-${i}`} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} />
                        ))}
                    </g>
                    <g>
                        {vesicles.map((vesicle, i) => (
                             <circle key={`vesicle-${i}`} cx={vesicle.cx} cy={vesicle.cy} r={vesicle.r} fill={vesicle.fill} />
                        ))}
                    </g>
                </svg>
            </div>
        </div>
    );
}

GolgiApparatus.displayName = 'Golgi Apparatus';
GolgiApparatus.type = 'golgi';
GolgiApparatus.isOrganelle = true;
