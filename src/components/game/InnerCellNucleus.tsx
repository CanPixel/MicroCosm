
"use client";
import React from 'react';

type InnerCellNucleusProps = {
  size: number;
};

export function InnerCellNucleus({ size }: InnerCellNucleusProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 60 60">
            {/* Nuclear envelope */}
            <circle cx="30" cy="30" r="28" fill="hsl(263 60% 30% / 0.5)" stroke="hsl(263 85% 65%)" strokeWidth="3" />
            {/* Nucleolus core */}
            <circle cx="30" cy="30" r="12" fill="url(#mc-core-hot)" />
            <circle cx="26" cy="26" r="3.5" fill="hsl(340 100% 90% / 0.8)" />
            {/* Chromatin Squiggle */}
            <path d="M 25,30 C 20,20 40,20 35,30 S 20,40 30,40 S 40,25 35,22" fill="none" stroke="hsl(198 93% 72%)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
    );
}
