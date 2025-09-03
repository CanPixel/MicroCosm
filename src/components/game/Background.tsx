
"use client";

import { cn } from "@/lib/utils";

const VORONOI_COLORS = [
  "hsl(var(--foreground) / 0.1)",
  "hsl(var(--foreground) / 0.1)",
  "hsl(var(--foreground) / 0.1)",
  "hsl(var(--foreground) / 0.1)",
  "hsl(var(--foreground) / 0.15)",
  "hsl(var(--foreground) / 0.15)",
];

const generateGradients = (count: number, color: string) => {
  return Array.from({ length: count }, () => {
    const size = Math.floor(Math.random() * 250) + 100;
    const x = Math.floor(Math.random() * 120) - 10;
    const y = Math.floor(Math.random() * 120) - 10;
    const innerSize = size - 2;
    return `radial-gradient(circle at ${x}% ${y}%, transparent ${innerSize}px, ${color} ${innerSize}px, ${color} ${size}px, transparent ${size}px)`;
  }).join(", ");
};

export function Background() {
  return (
    <div className="absolute inset-0 z-0">
      <div
        className="absolute inset-0 bg-repeat"
        style={{
          backgroundImage: generateGradients(15, VORONOI_COLORS[0]),
          backgroundSize: "2000px 2000px",
        }}
      />
      <div
        className="absolute inset-0 bg-repeat"
        style={{
          backgroundImage: generateGradients(15, VORONOI_COLORS[1]),
          backgroundSize: "1800px 1800px",
        }}
      />
       <div
        className="absolute inset-0 bg-repeat"
        style={{
          backgroundImage: generateGradients(10, VORONOI_COLORS[2]),
          backgroundSize: "2200px 2200px",
        }}
      />
    </div>
  );
}
