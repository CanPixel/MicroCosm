"use client";

type GiantAmoebaVirusProps = {
  size: number;
};

const FIBRIL_COUNT = 18;

// A fibril-coated giant virus inspired by mimiviruses, which infect amoebae.
// The pale crescent on the cell-facing side reads as a phagocytic cup rather
// than the tail apparatus of a bacteriophage.
export function GiantAmoebaVirus({ size }: GiantAmoebaVirusProps) {
  return (
    <svg
      className="giant-amoeba-virus h-full w-full"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <g className="giant-virus-fibrils" strokeLinecap="round">
        {Array.from({ length: FIBRIL_COUNT }, (_, index) => {
          const angle = (index / FIBRIL_COUNT) * Math.PI * 2;
          const inner = 16.4;
          const outer = 21.2 + (index % 3) * 0.7;
          const x1 = 24 + Math.cos(angle) * inner;
          const y1 = 24 + Math.sin(angle) * inner;
          const x2 = 24 + Math.cos(angle + (index % 2 ? 0.05 : -0.05)) * outer;
          const y2 = 24 + Math.sin(angle + (index % 2 ? 0.05 : -0.05)) * outer;
          return (
            <g key={index}>
              <path d={`M${x1} ${y1} Q${(x1 + x2) / 2 + Math.sin(angle) * 1.2} ${(y1 + y2) / 2 - Math.cos(angle) * 1.2} ${x2} ${y2}`} fill="none" stroke="hsl(315 72% 67% / .8)" strokeWidth="1" />
              <circle cx={x2} cy={y2} r="0.72" fill="hsl(100 54% 66%)" />
            </g>
          );
        })}
      </g>

      <polygon points="24,7.5 36.5,15 37.5,30 25,39.5 11.5,31 10.5,15.5" fill="hsl(247 62% 24%)" stroke="hsl(292 78% 68%)" strokeWidth="2" />
      <path d="M24 8 24 24 36 15M24 24l13 6M24 24 25 39M24 24 12 31M24 24 11 16" fill="none" stroke="hsl(284 75% 76% / .52)" strokeWidth="0.9" />
      <circle cx="24" cy="24" r="7" fill="hsl(218 73% 42% / .9)" stroke="hsl(194 68% 72% / .6)" strokeWidth="1" />
      <path d="M19 24c2.4-5 7.6 5 10 0s-3-6-5-2 2 7 5 7" fill="none" stroke="hsl(52 93% 73%)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="20.5" cy="19.5" r="1.6" fill="hsl(190 75% 90% / .72)" />

      <path d="M11.5 15.5C5.7 17.5 4.8 29.2 11.7 32" fill="none" stroke="hsl(190 42% 92% / .92)" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M10.3 18.5C7.4 20.7 7.1 27.2 10.7 29.5" fill="none" stroke="hsl(190 70% 70% / .5)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
