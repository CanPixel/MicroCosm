"use client";

type FloatingDebrisProps = {
  position: { x: number; y: number };
};

export function FloatingDebris({ position }: FloatingDebrisProps) {
  const animationDuration = Math.random() * 10 + 15; // 15s to 25s for a very slow drift
  const style: React.CSSProperties = {
    top: `${position.y}px`,
    left: `${position.x}px`,
    transform: `translate(-50%, -50%)`,
    filter: `drop-shadow(0 0 6px hsl(var(--primary) / 0.5))`,
    animationDuration: `${animationDuration}s`,
  };

  return <div style={style} className="absolute w-3 h-3 bg-primary/40 rounded-full animate-sway" />;
}
