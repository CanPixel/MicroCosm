
"use client";
import React from 'react';

type InnerMitochondrionProps = {
  size: number;
};

export function InnerMitochondrion({ size }: InnerMitochondrionProps) {
    return (
        <svg width={size} height={size * 0.6} viewBox="0 0 50 30">
            {/* Outer membrane */}
            <path 
                d="M 5,15 C 5,5 45,5 45,15 C 45,25 5,25 5,15 Z" 
                fill="hsl(var(--chart-3) / 0.8)" 
                stroke="hsl(var(--chart-3) / 0.9)" 
                strokeWidth="2"
            />
            {/* Inner membrane (cristae) */}
            <path 
                d="M 10,15 C 10,10 15,10 15,15 S 20,20 20,15 S 25,10 25,15 S 30,20 30,15 S 35,10 35,15 S 40,20 40,15"
                fill="none" 
                stroke="hsl(var(--destructive) / 0.7)" 
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
}
