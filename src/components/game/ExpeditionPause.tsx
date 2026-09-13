import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight, Dna, MoveUpRight, Scan, Waves } from 'lucide-react';

export function ExpeditionPause({ open, intro, onResume, elapsed, sugars }: { open: boolean; intro: boolean; onResume: () => void; elapsed: number; sugars: number }) {
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onResume(); }}>
    <DialogContent className="expedition-pause">
      <p className="eyebrow">MICROCOSM / FIELD EXPEDITION 07</p>
      <div className="expedition-emblem"><Dna size={38} strokeWidth={1.2} /></div>
      <DialogTitle className="expedition-title">{intro ? 'A world within a drop.' : 'A moment of stillness.'}</DialogTitle>
      <DialogDescription className="expedition-description">{intro ? 'Become a living cell. Feed your metabolism, assemble your organelles, and survive long enough to divide.' : 'Your specimen is safe. The ecosystem and your metabolism are paused until you return.'}</DialogDescription>
      <div className="expedition-controls">
        <div><Waves /><span><b>Swim & forage</b><small>WASD, arrows, or hold and drag. Eat green glucose.</small></span></div>
        <div><MoveUpRight /><span><b>Escape a predator</b><small>Space for a short burst. Costs 14 ATP, recharges in 4s.</small></span></div>
        <div><Scan /><span><b>Look closer</b><small>Hold E to identify life. Tab to arrange your cell.</small></span></div>
        <div><Dna /><span><b>Build a lineage</b><small>Follow your objective. Collect systems, then prepare division.</small></span></div>
      </div>
      {!intro && <p className="expedition-record">{Math.floor(elapsed / 60)}m {Math.floor(elapsed % 60)}s survived · {sugars} nutrients absorbed</p>}
      <button className="expedition-start" onClick={onResume}>{intro ? 'Enter the microcosm' : 'Resume expedition'}<ArrowRight size={18} /></button>
      <p className="expedition-footnote">ESC TO PAUSE · 1 / 2 / 3 TO USE ORGANELLES</p>
    </DialogContent>
  </Dialog>;
}
