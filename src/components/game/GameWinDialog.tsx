import { Dna, GitFork, RotateCcw } from 'lucide-react';

type Props = {
  isOpen: boolean;
  elapsed: number;
  score: number;
  architectureScore: number;
  onRestart: () => void;
};

export function GameWinDialog({ isOpen, elapsed, score, architectureScore, onRestart }: Props) {
  if (!isOpen) return null;
  const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  return (
    <div data-game-ui className="fixed inset-0 z-[90] grid place-items-center bg-[#02070d]/90 p-4">
      <section className="win-dialog w-full max-w-md p-6 text-center" role="dialog" aria-modal="true" aria-labelledby="win-title">
        <div className="win-lineage mx-auto"><Dna size={30} /><i /><GitFork size={22} /></div>
        <p className="eyebrow mt-5">VIABLE DAUGHTER CELL DETECTED</p>
        <h2 id="win-title" className="mt-2 text-3xl font-black">Lineage established</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/58">
          Your cell balanced membrane integrity, metabolic flux, genetic control, and reproductive machinery long enough to complete controlled cytokinesis.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <WinStat label="SURVIVAL" value={`${minutes}:${seconds}`} />
          <WinStat label="DIAMETER" value={`${Math.round(score)} μm`} />
          <WinStat label="COHERENCE" value={`${architectureScore}%`} />
        </div>
        <button type="button" onClick={onRestart} className="division-button mt-5"><RotateCcw size={16} /> START NEW LINEAGE</button>
      </section>
    </div>
  );
}

function WinStat({ label, value }: { label: string; value: string }) {
  return <div className="architect-subpanel p-3"><span className="eyebrow">{label}</span><b className="mt-1 block text-sm">{value}</b></div>;
}
