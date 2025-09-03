"use client";

type SugarProps = {
  position: { x: number; y: number };
};

export function Sugar({ position }: SugarProps) {
  const style: React.CSSProperties = {
    top: `${position.y}px`,
    left: `${position.x}px`,
    transform: `translate(-50%, -50%) rotate(45deg)`,
    filter: `drop-shadow(0 0 8px hsl(var(--foreground) / 0.7))`,
    boxShadow: '0 0 0 1px hsl(var(--foreground) / 0.8)',
  };

  return <div style={style} className="absolute w-2.5 h-2.5 bg-transparent rounded-sm" />;
}
