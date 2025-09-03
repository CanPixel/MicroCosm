
"use client";
import React, { useMemo } from 'react';

type FloatingDebrisProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
};

// Function to generate a random blob path
const generateBlobPath = (size: number): string => {
    const numPoints = 8;
    const angleStep = (Math.PI * 2) / numPoints;
    const radius = size / 2;
    
    const points = Array.from({ length: numPoints }, (_, i) => {
        const angle = i * angleStep;
        const r = radius * (0.7 + Math.random() * 0.3);
        const x = radius + r * Math.cos(angle);
        const y = radius + r * Math.sin(angle);
        return { x, y };
    });

    // Create a smooth Catmull-Rom spline from the points
    let pathData = `M${points[0].x},${points[0].y}`;
    for (let i = 0; i < numPoints; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % numPoints];
        const p3 = points[(i + 2) % numPoints];
        
        const cp1x = p1.x + (p2.x - points[(i + numPoints - 1) % numPoints].x) / 6;
        const cp1y = p1.y + (p2.y - points[(i + numPoints - 1) % numPoints].y) / 6;
        
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        pathData += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    pathData += "Z";
    return pathData;
};


export function FloatingDebris({ position, size, duration, delay, opacity }: FloatingDebrisProps) {
    const path = useMemo(() => generateBlobPath(size), [size]);

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        animation: `sway ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        opacity: opacity,
        transformOrigin: 'center center',
    };

    return (
        <div style={style} className="absolute top-0 left-0 transform -translate-x-1/2 -translate-y-1/2">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="hsl(var(--foreground))">
                <path d={path} />
            </svg>
        </div>
    );
}
