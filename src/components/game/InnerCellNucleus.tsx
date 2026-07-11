
"use client";
import React from 'react';

type InnerCellNucleusProps = {
  size: number;
};

export function InnerCellNucleus({ size }: InnerCellNucleusProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="28" fill="hsl(263 60% 27% / .58)" stroke="hsl(263 82% 70%)" strokeWidth="1.8" />
            <circle cx="30" cy="30" r="25.2" fill="none" stroke="hsl(190 52% 84% / .48)" strokeWidth="1.2" />
            {Array.from({ length: 12 }, (_, index) => {
              const angle = (index / 12) * Math.PI * 2;
              return (
                <g key={index} fill="hsl(190 66% 82%)">
                  <circle cx={30 + Math.cos(angle) * 25.5} cy={30 + Math.sin(angle) * 25.5} r="1.05" />
                  <circle cx={30 + Math.cos(angle) * 28} cy={30 + Math.sin(angle) * 28} r=".72" opacity=".72" />
                </g>
              );
            })}
            <path d="M14 28C18 16 29 18 30 26S40 38 47 28" fill="none" stroke="hsl(198 78% 72% / .72)" strokeWidth="2" strokeLinecap="round" />
            <path d="M17 39C23 31 30 43 37 35S43 19 48 23" fill="none" stroke="hsl(292 72% 72% / .66)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M21 18C26 24 35 15 40 22" fill="none" stroke="hsl(45 82% 68% / .42)" strokeWidth="1.5" strokeLinecap="round" />
            <ellipse cx="33" cy="31" rx="8.5" ry="7.3" fill="url(#mc-core-hot)" />
            <ellipse cx="30.5" cy="28.5" rx="2.8" ry="2.2" fill="hsl(340 100% 92% / .78)" />
        </svg>
    );
}
