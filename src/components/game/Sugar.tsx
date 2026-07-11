"use client";

type SugarProps = {
  position: { x: number; y: number };
  size: number;
};

// Glucose is intentionally represented as a tiny white crystalline square.
export function Sugar({ position, size }: SugarProps) {
  const style: React.CSSProperties = {
    top: `${position.y}px`,
    left: `${position.x}px`,
    width: `${size}px`,
    height: `${size}px`,
    transform: `translate(-50%, -50%)`,
  };

  return (
    <div style={style} className="absolute sugar-crystal">
      <svg width={size} height={size} viewBox="0 0 20 20" style={{ overflow: 'visible' }} aria-hidden>
        <rect x="2" y="2" width="16" height="16" rx="1.4" fill="hsl(190 35% 98%)" stroke="hsl(190 30% 78%)" strokeWidth="1.5" />
        <path d="M5 5h5M5 5v5" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}
