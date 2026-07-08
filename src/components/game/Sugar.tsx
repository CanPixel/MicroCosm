"use client";

type SugarProps = {
  position: { x: number; y: number };
  size: number;
};

// A glowing nutrient mote: bright golden core with a soft bloom halo.
export function Sugar({ position, size }: SugarProps) {
  const style: React.CSSProperties = {
    top: `${position.y}px`,
    left: `${position.x}px`,
    width: `${size}px`,
    height: `${size}px`,
    transform: `translate(-50%, -50%)`,
  };

  return (
    <div style={style} className="absolute">
      <svg width={size} height={size} viewBox="0 0 20 20" style={{ overflow: 'visible' }}>
        <circle cx="10" cy="10" r="9" fill="url(#mc-sugar)" filter="url(#mc-bloom-strong)" />
        <circle cx="7.5" cy="7" r="2.4" fill="hsl(50 100% 95% / 0.9)" />
      </svg>
    </div>
  );
}
