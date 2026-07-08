"use client";

import React from 'react';

// A single hidden SVG holding gradients and filters shared by every entity.
// SVG paint servers referenced as url(#id) resolve document-wide, so defining
// them once here lets all the small per-organism SVGs share one visual system:
// vivid gradient fills, thick rim outlines, and soft bloom — the flat, glowing
// Kurzgesagt / electron-micrograph language.
export function GameDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden style={{ position: 'absolute' }}>
      <defs>
        {/* Player membrane rim-light: red→primary sweep like a lit cell wall. */}
        <linearGradient id="mc-membrane-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(350 90% 60%)" />
          <stop offset="50%" stopColor="hsl(var(--accent))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>

        {/* Player cytoplasm fill. */}
        <radialGradient id="mc-cytoplasm" cx="42%" cy="38%" r="75%">
          <stop offset="0%" stopColor="hsl(var(--accent) / 0.35)" />
          <stop offset="60%" stopColor="hsl(224 71% 8% / 0.55)" />
          <stop offset="100%" stopColor="hsl(224 71% 5% / 0.75)" />
        </radialGradient>

        {/* Virus body: deep blue orb with a bright top highlight. */}
        <radialGradient id="mc-virus-body" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="hsl(210 90% 62%)" />
          <stop offset="55%" stopColor="hsl(222 85% 45%)" />
          <stop offset="100%" stopColor="hsl(230 80% 26%)" />
        </radialGradient>

        {/* Bacterium / flagellate body: teal capsule. */}
        <radialGradient id="mc-microbe-body" cx="40%" cy="35%" r="72%">
          <stop offset="0%" stopColor="hsl(185 75% 55%)" />
          <stop offset="60%" stopColor="hsl(190 70% 40%)" />
          <stop offset="100%" stopColor="hsl(198 70% 26%)" />
        </radialGradient>

        {/* Organelle warm fill (mitochondrion etc). */}
        <radialGradient id="mc-organelle-warm" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="hsl(38 100% 62%)" />
          <stop offset="60%" stopColor="hsl(28 95% 52%)" />
          <stop offset="100%" stopColor="hsl(12 85% 45%)" />
        </radialGradient>

        {/* Nucleus / hot core. */}
        <radialGradient id="mc-core-hot" cx="42%" cy="38%" r="70%">
          <stop offset="0%" stopColor="hsl(340 95% 68%)" />
          <stop offset="70%" stopColor="hsl(330 85% 52%)" />
          <stop offset="100%" stopColor="hsl(320 80% 38%)" />
        </radialGradient>

        <radialGradient id="mc-sugar" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="hsl(50 100% 85%)" />
          <stop offset="100%" stopColor="hsl(40 100% 60%)" />
        </radialGradient>

        {/* Soft bloom for bright objects against the dark field. */}
        <filter id="mc-bloom" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="mc-bloom-strong" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
