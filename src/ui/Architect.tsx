import { useEffect, useState, type CSSProperties } from 'react';
import type { GameEngine, HudSnapshot, SlotView } from '@/game/engine';
import { ORGANELLES, slotAccepts } from '@/game/sim/organelles';
import type { OrganelleType } from '@/game/sim/types';
import { organelleIcon } from './art';
import { fmt, useStore } from './hooks';
import { BiomassIcon, DnaIcon } from './icons';

const SYNERGY: Partial<Record<OrganelleType, string>> = {
  er: 'Beside the nucleus: −10% build cost.',
  golgi: 'Beside the ER: stronger lysosome bursts and darts.',
  lysosome: 'Beside the Golgi: faster digestion.',
  mitochondrion: 'Beside a flagellum, cilia or cytoskeleton: +5% speed. Beside another mitochondrion: +ATP.',
  chloroplast: 'In the outer cortex: +50% light capture.',
  vacuole: 'Beside a chloroplast: +glucose storage.',
  flagellum: 'Beside an eyespot: phototaxis speed boost.',
  eyespot: 'Beside a flagellum: steer toward light faster.',
  nucleus: 'Fixed at the genome core.',
};

const RING_LABEL = { core: 'Genome core', inner: 'Cytoplasm', outer: 'Cortex (membrane)' };

export function Architect({ engine, hud }: { engine: GameEngine; hud: HudSnapshot }) {
  const slots = useStore(engine.slots);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ id: number; type: OrganelleType; x: number; y: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const selectedOrg = hud.organelles.find((o) => o.id === selected) ?? null;
  const moving = drag ? hud.organelles.find((o) => o.id === drag.id) : selectedOrg;

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = () => {
      if (hover !== null && drag) engine.moveOrganelle(drag.id, hover);
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [drag, hover, engine]);

  useEffect(() => {
    engine.setHighlightSlot(hover ?? -1);
  }, [hover, engine]);

  const validTarget = (slot: SlotView) =>
    !!moving && !slot.locked && moving.type !== 'nucleus' && slotAccepts(slot.id, moving.type)
    && (!slot.occupant || (slot.occupant.type !== 'nucleus' && slotAccepts(hud.organelles.find((o) => o.id === moving.id)!.slot, slot.occupant.type)));

  const t = hud.traits;
  return (
    <div className="architect">
      <div className="slot-layer">
        {slots.map((slot) => {
          const r = Math.max(16, slot.r);
          const valid = validTarget(slot);
          const cls = [
            'slot', `slot-${slot.ring}`,
            slot.locked ? 'slot-locked' : '',
            slot.occupant ? 'slot-full' : '',
            slot.occupant && slot.occupant.id === selected ? 'slot-selected' : '',
            valid ? 'slot-valid' : '',
            hover === slot.id ? 'slot-hover' : '',
          ].join(' ');
          return (
            <button
              key={slot.id}
              className={cls}
              style={{ left: slot.x - r, top: slot.y - r, width: r * 2, height: r * 2 } as CSSProperties}
              onPointerEnter={() => setHover(slot.id)}
              onPointerLeave={() => setHover((h) => (h === slot.id ? null : h))}
              onPointerDown={(e) => {
                if (slot.occupant && slot.occupant.type !== 'nucleus') {
                  e.preventDefault();
                  setSelected(slot.occupant.id);
                  setDrag({ id: slot.occupant.id, type: slot.occupant.type, x: e.clientX, y: e.clientY });
                } else if (slot.occupant) {
                  setSelected(slot.occupant.id);
                }
              }}
              onClick={() => {
                if (!slot.occupant && selectedOrg && valid) engine.moveOrganelle(selectedOrg.id, slot.id);
              }}
              title={slot.locked ? 'Grow larger to open this slot' : RING_LABEL[slot.ring]}
            >
              {slot.locked && <span className="slot-lock">+</span>}
            </button>
          );
        })}
      </div>
      {drag && (
        <img className="drag-ghost" src={organelleIcon(drag.type, 96)} style={{ left: drag.x - 32, top: drag.y - 32 }} alt="" />
      )}

      <aside className="panel arch-panel">
        <header className="arch-head">
          <div>
            <span className="eyebrow">Ultrastructure · time slowed</span>
            <h2>Cell Architect</h2>
          </div>
          <button className="btn btn-ghost" onClick={() => engine.toggleArchitect(false)}>Back <kbd>TAB</kbd></button>
        </header>

        <div className="arch-stats">
          <Stat label="ATP output" value={`${fmt(hud.rates.atpGain, 1)}/s`} />
          <Stat label="Photosynthesis" value={`${fmt(hud.rates.glucoseLight, 2)}/s`} />
          <Stat label="Speed" value={fmt(t.speed)} />
          <Stat label="Digestion" value={`×${fmt(t.digestion, 2)}`} />
          <Stat label="Food vacuoles" value={`${t.vacuoleSlots}`} />
          <Stat label="Viral resist" value={`${Math.round(t.viralResistance * 100)}%`} />
          {t.lysoRadius > 0 && <Stat label="Lysosome burst" value={`${Math.round(t.lysoDamage)} dmg`} />}
          {t.dartCount > 0 && <Stat label="Toxicysts" value={`${t.dartCount}×${Math.round(t.dartDamage)}`} />}
        </div>

        {selectedOrg ? (
          <div className="org-card">
            <img src={organelleIcon(selectedOrg.type, 96)} alt="" />
            <div>
              <b>{ORGANELLES[selectedOrg.type].name}{selectedOrg.misfolded ? ' (misfolded)' : ''}</b>
              <p>{ORGANELLES[selectedOrg.type].science}</p>
              {SYNERGY[selectedOrg.type] && <p className="synergy">{SYNERGY[selectedOrg.type]}</p>}
              <div className="org-actions">
                {selectedOrg.type !== 'nucleus' && (
                  <button className="btn btn-small btn-danger" onClick={() => { engine.recycle(selectedOrg.id); setSelected(null); }}>
                    Recycle (autophagy)
                  </button>
                )}
                <button className="btn btn-small btn-ghost" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        ) : (
          <p className="arch-tip">Drag organelles between slots. Placement matters: synergies light up between neighbors. The cortex holds membrane machinery (flagella, cilia, extrusomes, eyespots).</p>
        )}

        <div className="budget">
          <span><BiomassIcon size={16} /> <b>{fmt(hud.spendable)}</b> spare biomass</span>
          <span><DnaIcon size={16} /> <b>{fmt(hud.dna, 1)}</b> DNA</span>
          <span className="muted">{hud.organelles.length}/{hud.slotCount} slots</span>
        </div>

        <div className="build-list">
          {hud.build.map((b) => (
            <div key={b.type} className={`build ${b.ok ? '' : 'build-off'}`}>
              <img src={organelleIcon(b.type, 80)} alt="" />
              <div className="build-text">
                <b>{b.name} <small>{b.owned}/{b.max}</small></b>
                <span>{b.role}</span>
                {!b.ok && <em>{b.reason}</em>}
              </div>
              <button className="btn btn-build" disabled={!b.ok} onClick={() => engine.build(b.type)} title={b.science}>
                <span><BiomassIcon size={13} />{b.biomass}</span>
                {b.dna > 0 && <span><DnaIcon size={13} />{b.dna}</span>}
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
