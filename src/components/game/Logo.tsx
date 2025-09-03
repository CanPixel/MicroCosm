
"use client";

import { cn } from "@/lib/utils";

export function Logo() {
  return (
    <div className="relative flex items-center justify-center">
      <h1
        className="text-3xl font-bold text-primary font-headline"
        style={{ filter: `drop-shadow(0 0 10px hsl(var(--primary)))` }}
      >
        MicroCosm
      </h1>
      
      {/* Particle Blobs */}
      <div className="absolute -top-2 -left-2 w-4 h-4 bg-accent/80 rounded-full animate-logo-blob-1" />
      <div className="absolute top-0 -right-4 w-3 h-3 bg-primary/70 rounded-full animate-logo-blob-2" />
      <div className="absolute -bottom-3 right-4 w-5 h-5 bg-primary/80 rounded-full animate-logo-blob-3" />
    </div>
  );
}
