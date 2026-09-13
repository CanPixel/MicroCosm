"use client";

type SugarProps = {
  position: { x: number; y: number };
  size: number;
};

// A faceted nutrient with a phosphor-green core, matching the radar legend.
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
        <path d="M10 1 18 5.5V14.5L10 19 2 14.5V5.5Z" fill="#bddf86" stroke="#eafacb" strokeWidth="1.2" />
        <path d="m10 1 0 8 8-3.5M10 9 2 5.5M10 9v10" fill="none" stroke="#799e5b" strokeWidth=".8" />
        <path d="M5 5h5M5 5v5" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}
