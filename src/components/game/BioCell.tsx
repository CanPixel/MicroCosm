"use client";

import { forwardRef } from "react";

type BioCellProps = {
  size: number;
};

export const BioCell = forwardRef<HTMLDivElement, BioCellProps>(({ size }, ref) => {
  const cellStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    filter: `drop-shadow(0 0 12px hsl(var(--primary))) drop-shadow(0 0 4px hsl(var(--primary)))`,
  };

  return (
    <div
      ref={ref}
      style={cellStyle}
      className="absolute bg-primary transition-all duration-500 ease-out animate-morph"
    />
  );
});

BioCell.displayName = "BioCell";
