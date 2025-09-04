
"use client";
import React from 'react';

type InnerCellNucleusProps = {
  size: number;
};

export function InnerCellNucleus({ size }: InnerCellNucleusProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 60 60">
            {/* Outer Circle */}
            <circle cx="30" cy="30" r="28" fill="hsl(var(--destructive) / 0.3)" stroke="hsl(var(--destructive) / 0.5)" strokeWidth="3" />
            {/* Nucleus */}
            <circle cx="30" cy="30" r="12" fill="hsl(var(--destructive) / 0.6)" />
            {/* Chromatin Squiggle */}
            <path d="M 25,30 C 20,20 40,20 35,30 S 20,40 30,40 S 40,25 35,22" fill="none" stroke="hsl(var(--primary) / 0.8)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
    );
}
