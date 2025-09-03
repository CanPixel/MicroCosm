"use client";

type NutrientProps = {
  position: { x: number; y: number };
};

export function Nutrient({ position }: NutrientProps) {
  const style: React.CSSProperties = {
    top: `${position.y}px`,
    left: `${position.x}px`,
    transform: `translate(-50%, -50%)`,
    filter: `drop-shadow(0 0 6px hsl(var(--primary) / 0.8))`,
  };

  return <div style={style} className="absolute w-3 h-3 bg-primary/80 rounded-full animate-pulse" />;
}
