
"use client";

import { cn } from "@/lib/utils";

export function Logo() {
  return (
    <div className="relative flex items-center mb-2">
      <h1
        className="text-xl font-bold text-primary font-headline"
        style={{ filter: `drop-shadow(0 0 8px hsl(var(--primary)))` }}
      >
        MicroCosm
      </h1>
      
      {/* Particle Blobs */}
      <div className="absolute -top-1 -left-1 w-3 h-3 bg-accent/80 rounded-full animate-logo-blob-1" />
      <div className="absolute top-0 -right-2 w-2 h-2 bg-primary/70 rounded-full animate-logo-blob-2" />
      <div className="absolute -bottom-2 right-0 w-3 h-3 bg-primary/80 rounded-full animate-logo-blob-3" />
    </div>
  );
}
