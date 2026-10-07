import type { AbilityId, LightMode } from '@/game/sim/types';

// Flat two-tone glyphs in the HUD's visual language.

type P = { size?: number };

export function AtpIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2L13.5 2Z" fill="#ffd23f" stroke="#fff4b8" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function GlucoseIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4Z" fill="#c4f53a" stroke="#6fbf2a" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".8" />
    </svg>
  );
}

export function IntegrityIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3c4.8 0 8.5 3.6 8.5 8.6 0 5-3.9 9.4-8.5 9.4s-8.5-4.4-8.5-9.4C3.5 6.6 7.2 3 12 3Z" fill="#ff4f8b" />
      <path d="M12 6.4c3 0 5.3 2.3 5.3 5.4" fill="none" stroke="#ffd0e2" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function BiomassIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M5 9.5c0-3.6 3-5.5 6.2-5 2.1-1.8 6.4-1 7.2 2.6 2.6 1 3 4.8.8 6.6.6 3.3-2.6 6-5.7 4.8-2.2 2.2-6.4 1.6-7.4-1.4C3.4 16.5 2.4 11.6 5 9.5Z"
        fill="#ffb48a"
        stroke="#ffe0cc"
        strokeWidth="1.4"
      />
      <circle cx="10" cy="11" r="1.6" fill="#d9624a" />
      <circle cx="14.5" cy="14" r="1.2" fill="#d9624a" />
    </svg>
  );
}

export function DnaIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M7 3c0 6 10 6 10 12s-10 6-10 6" fill="none" stroke="#5ab0ff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17 3c0 6-10 6-10 12s10 6 10 6" fill="none" stroke="#ff5f9e" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8.6 6h6.8M9.6 9h4.8M9.6 15h4.8M8.6 18h6.8" stroke="#ffd23f" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SunIcon({ size = 16, level = 1 }: P & { level?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ opacity: 0.35 + level * 0.65 }}>
      <circle cx="12" cy="12" r="4.5" fill="#ffd23f" />
      <g stroke="#ffd23f" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7" />
      </g>
    </svg>
  );
}

export function AbilityIcon({ id, size = 30 }: P & { id: AbilityId }) {
  switch (id) {
    case 'dash':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <path
            d="M19 7c6 0 9 4.8 9 9s-3 9-9 9c-3.6 0-6-2-7.3-4.2C9 21 8 19 8.6 16 8 13 9 11 11.7 11.2 13 9 15.4 7 19 7Z"
            fill="#7be0c0"
            stroke="#fff"
            strokeWidth="1.6"
          />
          <path d="M3 12h6M2 16h5M3 20h6" stroke="#c8fff0" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'lysosome':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="16" r="8" fill="#b06cff" stroke="#e3c7ff" strokeWidth="2" />
          <circle cx="13.5" cy="14" r="2" fill="#ffd23f" />
          <circle cx="18.5" cy="18" r="1.6" fill="#ffd23f" />
          <path
            d="M16 2.5v4M16 25.5v4M2.5 16h4M25.5 16h4M6.5 6.5l2.8 2.8M22.7 22.7l2.8 2.8M6.5 25.5l2.8-2.8M22.7 9.3l2.8-2.8"
            stroke="#d6b8ff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'toxicyst':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`rotate(${(i - 1) * 18} 6 16) translate(0 ${(i - 1) * 2})`}>
              <path d="M5 16h17" stroke="#ffd23f" strokeWidth="3" strokeLinecap="round" />
              <path d="M22 12.5 29 16l-7 3.5Z" fill="#ff6b3d" />
            </g>
          ))}
        </svg>
      );
    case 'rnai':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <path d="M3 22c4-8 8 8 12 0s8 8 14 0" fill="none" stroke="#ff5f9e" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M11 4l10 14M21 4 11 18" stroke="#7dffb0" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="11" cy="4" r="2.4" fill="none" stroke="#7dffb0" strokeWidth="2" />
          <circle cx="21" cy="4" r="2.4" fill="none" stroke="#7dffb0" strokeWidth="2" />
        </svg>
      );
    case 'encyst':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <path d="M16 3 27.3 9.5v13L16 29 4.7 22.5v-13Z" fill="#d6963c" stroke="#ffdca0" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="16" cy="16" r="5.5" fill="#7be0c0" stroke="#fff" strokeWidth="1.4" />
        </svg>
      );
    case 'virophage':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          {[
            [10, 10],
            [22, 9],
            [16, 20],
            [8, 23],
            [24, 23],
          ].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 4} l3.5 2v4l-3.5 2-3.5-2v-4Z`} fill="#5ff0a0" stroke="#eafff3" strokeWidth="1.2" />
          ))}
        </svg>
      );
  }
}

export function LightIcon({ mode, size = 20 }: P & { mode: LightMode }) {
  if (mode === 'bright') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="#e9f7ff" />
        <circle cx="12" cy="12" r="4" fill="#7be0c0" stroke="#2a8f80" strokeWidth="1.4" />
      </svg>
    );
  }
  if (mode === 'dark') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="#05060c" stroke="#3a4060" />
        <circle cx="12" cy="12" r="4.5" fill="none" stroke="#ffffff" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="#05060c" stroke="#3a4060" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="#ff9a3d" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2" fill="#4f7dff" />
      <circle cx="16.5" cy="8" r="1.4" fill="#4dff6a" />
    </svg>
  );
}

export function SpeakerIcon({ muted, size = 18 }: P & { muted: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" fill="#eafff6" />
      {muted ? (
        <path d="m16 9 5 6M21 9l-5 6" stroke="#ff6b84" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="#7be0c0" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function PauseIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1.6" fill="#eafff6" />
      <rect x="14" y="5" width="4" height="14" rx="1.6" fill="#eafff6" />
    </svg>
  );
}
