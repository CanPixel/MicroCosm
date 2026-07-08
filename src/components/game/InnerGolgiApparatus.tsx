
"use client";
import React from 'react';

type InnerGolgiApparatusProps = {
  size: number;
};

const paths = [
    { d: "M 10 20 C 20 10, 40 10, 50 20", stroke: "hsl(280 85% 68%)", strokeWidth: "5" },
    { d: "M 15 36 C 25 26, 45 26, 55 36", stroke: "hsl(288 78% 60%)", strokeWidth: "4" },
    { d: "M 20 52 C 30 42, 50 42, 60 52", stroke: "hsl(295 72% 55%)", strokeWidth: "3" },
];

export function InnerGolgiApparatus({ size }: InnerGolgiApparatusProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 70 70">
            <g fill="none" strokeLinecap="round">
                {paths.map((path, i) => (
                    <path key={`path-${i}`} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} />
                ))}
            </g>
        </svg>
    );
}
