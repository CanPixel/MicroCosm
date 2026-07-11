"use client";
import React from 'react';

type InnerMitochondrionProps = {
  size: number;
};

export function InnerMitochondrion({ size }: InnerMitochondrionProps) {
    return (
        <svg width={size} height={size * 0.6} viewBox="0 0 60 40">
            <path
                d="M 8 20 C 8 8 20 5 34 7 C 47 8 53 13 52 21 C 51 31 40 34 25 32 C 14 31 8 27 8 20 Z"
                fill="url(#mc-organelle-warm)"
                stroke="hsl(28 95% 60%)"
                strokeWidth="2"
            />
            <path
                d="M 11 20 C 11 11 21 8 33 10 C 44 10 49 14 48 21 C 47 27 39 30 27 29 C 17 29 11 26 11 20 Z"
                fill="hsl(18 72% 32% / .26)"
                stroke="hsl(44 92% 72% / .7)"
                strokeWidth="1"
            />
            <path
                d="M 15 20 C 15 14 20 13 20 19 C 20 25 25 25 25 20 C 25 14 30 13 30 19 C 30 25 35 26 35 20 C 35 14 40 13 40 19 C 40 24 44 25 45 21"
                fill="none"
                stroke="hsl(350 72% 38%)"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
            <g fill="hsl(52 100% 84% / .9)">
                <circle cx="14" cy="14" r="1" />
                <circle cx="23" cy="11" r="0.8" />
                <circle cx="34" cy="12" r="0.9" />
                <circle cx="44" cy="15" r="0.8" />
                <circle cx="17" cy="27" r="0.8" />
                <circle cx="41" cy="27" r="0.9" />
            </g>
            <g stroke="hsl(190 42% 88%)" strokeWidth="0.8" fill="hsl(190 38% 78%)">
                <path d="M 19 16 v -2" />
                <circle cx="19" cy="13" r="1.1" />
                <path d="M 29 24 v 2" />
                <circle cx="29" cy="27" r="1.1" />
                <path d="M 39 16 v -2" />
                <circle cx="39" cy="13" r="1.1" />
            </g>
        </svg>
    );
}
