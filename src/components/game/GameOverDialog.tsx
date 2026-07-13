"use client";

import { BatteryWarning, Biohazard, Droplets, RotateCcw } from 'lucide-react';
import type { DeathCause } from '@/lib/game/types';

type GameOverDialogProps = {
  score: number;
  elapsed: number;
  cause: DeathCause | null;
  isOpen: boolean;
  onRestart: () => void;
};

const causes: Record<DeathCause, { title: string; detail: string; icon: typeof Biohazard }> = {
  starvation: {
    title: 'Metabolic collapse',
    detail: 'ATP reached zero and the cell consumed its own structure. A steadier glucose route or Homeostasis stance could preserve the next lineage.',
    icon: BatteryWarning,
  },
  'membrane-rupture': {
    title: 'Membrane rupture',
    detail: 'Repeated impacts overwhelmed lipid repair. Reposition the nucleus, engage Homeostasis, or shield before crossing a hostile bloom.',
    icon: Droplets,
  },
  'genome-hijack': {
    title: 'Genome hijacked',
    detail: 'Viral replication completed before RNA interference or autophagy could clear it. Keep ATP in reserve when infectious particles approach.',
    icon: Biohazard,
  },
};

export function GameOverDialog({ score, elapsed, cause, isOpen, onRestart }: GameOverDialogProps) {
  if (!isOpen) return null;
  const outcome = causes[cause ?? 'starvation'];
  const Icon = outcome.icon;
  const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');

  return (
    <div data-game-ui className="fixed inset-0 z-[90] grid place-items-center bg-[#02070d]/92 p-4">
      <section className="win-dialog w-full max-w-md p-6 text-center" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-red-300/25 bg-red-950/45 text-red-200"><Icon size={30} /></div>
        <p className="eyebrow mt-5">LINEAGE TERMINATED</p>
        <h2 id="game-over-title" className="mt-2 text-3xl font-black">{outcome.title}</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/58">{outcome.detail}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="architect-subpanel p-3"><span className="eyebrow">SURVIVAL</span><b className="mt-1 block text-sm">{minutes}:{seconds}</b></div>
          <div className="architect-subpanel p-3"><span className="eyebrow">FINAL DIAMETER</span><b className="mt-1 block text-sm">{Math.round(score)} μm</b></div>
        </div>
        <button type="button" onClick={onRestart} className="division-button mt-5"><RotateCcw size={16} /> START NEW LINEAGE</button>
      </section>
    </div>
  );
}
