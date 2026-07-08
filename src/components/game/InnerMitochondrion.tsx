
"use client";
import React from 'react';

type InnerMitochondrionProps = {
  size: number;
};

export function InnerMitochondrion({ size }: InnerMitochondrionProps) {
    // The viewBox is made larger than the shape to prevent the glow from being clipped.
    return (
        <svg width={size} height={size * 0.6} viewBox="0 0 60 40">
            {/* Outer membrane */}
            <path
                d="M 10,20 C 10,10 50,10 50,20 C 50,30 10,30 10,20 Z"
                fill="url(#mc-organelle-warm)"
                stroke="hsl(28 95% 60%)"
                strokeWidth="2"
            />
            {/* Inner membrane (cristae) */}
            <path
                d="M 15,20 C 15,15 20,15 20,20 S 25,25 25,20 S 30,15 30,20 S 35,25 35,20 S 40,15 40,20 S 45,25 45,20"
                fill="none"
                stroke="hsl(12 90% 42%)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
}
