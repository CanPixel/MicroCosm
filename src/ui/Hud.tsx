import type { CSSProperties, ReactNode } from 'react';
import type { GameEngine, HudSnapshot } from '@/game/engine';
import { FATES } from '@/game/sim/organelles';
import { SPECIES } from '@/game/sim/species';
import type { LightMode, UnlockId } from '@/game/sim/types';
import { fmt } from './hooks';
import { AbilityIcon, AtpIcon, BiomassIcon, DnaIcon, GlucoseIcon, IntegrityIcon, LightIcon, PauseIcon, SpeakerIcon, SunIcon } from './icons';
import { Radar } from './Radar';

// The HUD grows with the organism: each element appears (with a soft reveal
// animation on mount) once the run has given the player a reason to need it.
const has = (hud: HudSnapshot, id: UnlockId) => hud.unlocked.includes(id);

function Ring({ value, max, color, icon, label, warn }: { value: number; max: number; color: string; icon: ReactNode; label: string; warn?: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const k = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <div className={`ring reveal ${warn ? 'ring-warn' : ''}`} title={`${label}: ${fmt(value)} / ${fmt(max)}`}>
      <svg width="54" height="54" viewBox="0 0 54 54">
        <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="27" cy="27" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${c * k} ${c}`} transform="rotate(-90 27 27)"
        />
      </svg>
      <div className="ring-center">
        {icon}
        <b>{fmt(value)}</b>
      </div>
      <span className="ring-label">{label}</span>
    </div>
  );
}

function Meter({ icon, k, value, max, gradient, title }: { icon: ReactNode; k: number; value: string; max: number; gradient: string; title: string }) {
  return (
    <div className="meter-row reveal" title={title}>
      {icon}
      <div className="meter">
        <i style={{ width: `${Math.min(1, k) * 100}%`, background: gradient }} />
      </div>
      <b>{value}<small>/{max}</small></b>
    </div>
  );
}

function Vitals({ hud, engine }: { hud: HudSnapshot; engine: GameEngine }) {
  return (
    <section className="panel vitals">
      <div className="rings">
        <Ring value={hud.atp} max={hud.atpCap} color="#ffd23f" icon={<AtpIcon size={15} />} label="ATP" warn={hud.atp < 15} />
        <Ring value={hud.integrity} max={hud.maxIntegrity} color="#ff4f8b" icon={<IntegrityIcon size={15} />} label="Membrane" warn={hud.integrity < hud.maxIntegrity * 0.35} />
        {has(hud, 'glucose') && (
          <Ring value={hud.glucose} max={hud.glucoseCap} color="#c4f53a" icon={<GlucoseIcon size={15} />} label="Glucose" warn={hud.glucose < 6} />
        )}
      </div>
      {has(hud, 'biomass') && (
        <Meter
          icon={<BiomassIcon />} k={hud.biomass / hud.division.threshold} value={fmt(hud.biomass)} max={hud.division.threshold}
          gradient="linear-gradient(90deg,#ff9a6b,#b48cff)" title="Biomass: builds organelles and drives growth. Reach the threshold to divide."
        />
      )}
      {has(hud, 'dna') && (
        <Meter
          icon={<DnaIcon />} k={hud.dna / hud.division.dna} value={fmt(hud.dna, 1)} max={hud.division.dna}
          gradient="linear-gradient(90deg,#5ab0ff,#ff5f9e)" title="Nucleotides: needed to replicate the genome and to mutate."
        />
      )}
      {hud.division.progress > 0 ? (
        <div className="divide-progress"><span>Cytokinesis</span><div className="meter"><i style={{ width: `${hud.division.progress * 100}%` }} /></div></div>
      ) : hud.division.ok ? (
        <button className="btn btn-divide reveal" onClick={() => engine.divide()}>
          Divide <kbd>R</kbd>
        </button>
      ) : null}
    </section>
  );
}

function Objective({ hud }: { hud: HudSnapshot }) {
  if (hud.intro < 0.95) return null;
  const done = hud.completed;
  if (done) {
    return (
      <section className="objective">
        <div key={`done-${done.title}`} className="panel obj-card obj-done">
          <div className="obj-head">
            <span className="obj-check">✓</span>
            <b>{done.title}</b>
            {done.reward > 0 && <span className="obj-progress">+{done.reward} DNA</span>}
          </div>
        </div>
      </section>
    );
  }
  const o = hud.objective;
  const title = o ? o.title : 'Free evolution';
  const text = o ? o.text : 'The microcosmos is yours. Explore deeper biomes, fill the Field Journal, and outgrow everything.';
  // The instructions show while the objective is fresh, then fold away (hover to reread).
  const fresh = hud.objectiveAge < 14;
  return (
    <section className="objective">
      <div key={title} className={`panel obj-card ${fresh ? '' : 'obj-folded'}`}>
        <div className="obj-head">
          <b>{title}</b>
          {o?.progress && <span className="obj-progress">{o.progress}</span>}
        </div>
        <p>{text}</p>
      </div>
    </section>
  );
}

function Hotbar({ hud, engine }: { hud: HudSnapshot; engine: GameEngine }) {
  const abilities = hud.abilities.filter((a) => a.id !== 'dash' || has(hud, 'dash'));
  if (!abilities.length) return null;
  return (
    <section className="hotbar">
      {abilities.map((a) => {
        const k = a.remaining > 0 ? a.remaining / a.cooldown : 0;
        const style = { '--cd': `${k * 360}deg` } as CSSProperties;
        return (
          <button
            key={a.id}
            className={`ability reveal ${a.remaining > 0 ? 'cooling' : ''} ${!a.affordable ? 'poor' : ''} ${a.id === 'dash' ? 'ability-dash' : ''}`}
            style={style}
            onClick={() => engine.ability(a.id)}
            title={`${a.name}: ${a.description} (${a.atp} ATP)`}
          >
            <span className="ability-icon"><AbilityIcon id={a.id} size={a.id === 'dash' ? 28 : 24} /></span>
            {a.remaining > 0 && <span className="ability-cd">{a.remaining.toFixed(1)}</span>}
            <kbd>{a.key === 'SPACE' ? '␣' : a.key}</kbd>
            {a.id === 'virophage' && <span className="ability-count">{hud.storedVirophages}</span>}
          </button>
        );
      })}
    </section>
  );
}

const LIGHTS: Array<{ mode: LightMode; name: string }> = [
  { mode: 'bright', name: 'Brightfield' },
  { mode: 'dark', name: 'Darkfield' },
  { mode: 'fluor', name: 'Fluorescence' },
];

function Tools({ hud, engine }: { hud: HudSnapshot; engine: GameEngine }) {
  const scope = has(hud, 'microscope');
  const architect = has(hud, 'architect');
  if (!scope && !architect) return null;
  const canBuild = hud.build.some((b) => b.ok);
  return (
    <section className="tools">
      {scope && (
        <div className="panel light-pill reveal" title="Microscope illumination (Q)">
          {LIGHTS.map((l) => (
            <button key={l.mode} className={hud.lightMode === l.mode ? 'on' : ''} onClick={() => engine.setLight(l.mode)} title={l.name}>
              <LightIcon mode={l.mode} />
            </button>
          ))}
          <span className="light-name">{LIGHTS.find((l) => l.mode === hud.lightMode)?.name}</span>
          <kbd>Q</kbd>
        </div>
      )}
      {architect && (
        <button className={`btn btn-architect reveal ${canBuild ? 'pulse' : ''}`} onClick={() => engine.toggleArchitect()}>
          Cell Architect <kbd>TAB</kbd>
        </button>
      )}
    </section>
  );
}

function Colony({ hud }: { hud: HudSnapshot }) {
  if (hud.cells < 2 && hud.generation < 2) return null;
  return (
    <section className="panel colony reveal">
      <header>
        <span className="eyebrow">Colony · Gen {hud.generation}</span>
        <b>{hud.cells} {hud.cells === 1 ? 'cell' : 'cells'}</b>
      </header>
      <div className="cells">
        {hud.units.map((u) => {
          const k = u.integrity / Math.max(1, u.maxIntegrity);
          const color = u.fate === 'prime' ? '#7be0c0' : FATES[u.fate as Exclude<typeof u.fate, 'prime'>].color;
          return (
            <span key={u.id} className="cell-dot" title={u.fate === 'prime' ? 'Prime cell (germ line)' : FATES[u.fate as Exclude<typeof u.fate, 'prime'>].name}
              style={{ '--c': color, '--k': `${k * 360}deg` } as CSSProperties}>
              <i />
            </span>
          );
        })}
      </div>
      {hud.mutations.length > 0 && (
        <div className="mutations">
          {hud.mutations.map((m) => <span key={m.id} className="mut">{m.id}{m.stacks > 1 ? ` ×${m.stacks}` : ''}</span>)}
        </div>
      )}
    </section>
  );
}

function Status({ hud }: { hud: HudSnapshot }) {
  const inf = hud.infection;
  const chips: Array<{ key: string; color: string; text: string; hint?: string; bar?: number }> = [];
  if (hud.captured) chips.push({ key: 'cap', color: '#ff3b5c', text: `Caught by ${SPECIES[hud.captured.species].name}`, hint: 'Struggle: WASD + SPACE', bar: hud.captured.struggle });
  if (inf.viralLoad > 0) chips.push({ key: 'vl', color: '#ff3b5c', text: `Viral load ${Math.round(inf.viralLoad)}%`, hint: 'RNAi [3]', bar: inf.viralLoad / 100 });
  if (inf.attached > 0) chips.push({ key: 'att', color: '#ff6b84', text: `${inf.attached} virion${inf.attached > 1 ? 's' : ''} docked`, hint: 'DASH!' });
  if (inf.viroids > 0) chips.push({ key: 'vir', color: '#ff7ad9', text: `${inf.viroids} viroid${inf.viroids > 1 ? 's' : ''} siphoning ATP`, hint: 'Dash / RNAi' });
  if (inf.prophages > 0) chips.push({ key: 'pro', color: '#ff2a2a', text: `${inf.prophages} provirus${inf.prophages > 1 ? 'es' : ''} dormant`, hint: 'RNAi [3]' });
  if (inf.misfolded > 0) chips.push({ key: 'mis', color: '#d7c4ff', text: `${inf.misfolded} misfolded`, hint: 'Lysosome [1]' });
  if (inf.colonies > 0) chips.push({ key: 'col', color: '#9dff3a', text: `${inf.colonies} bacterial colon${inf.colonies > 1 ? 'ies' : 'y'}`, hint: 'Lysosome [1]' });
  if (inf.satellite > 0.05) chips.push({ key: 'sat', color: '#ffe98a', text: 'Satellite RNA primed' });
  if (hud.starving) chips.push({ key: 'starve', color: '#ff9a3d', text: 'Starving: eating own cytoplasm', hint: 'Find glucose' });
  if (hud.cyst) chips.push({ key: 'cyst', color: '#ffcf7a', text: 'Encysted' });
  if (hud.dsup) chips.push({ key: 'dsup', color: '#c9b6ff', text: 'Dsup shield' });
  if (hud.storedVirophages > 0) chips.push({ key: 'vp', color: '#7dffb0', text: `${hud.storedVirophages} virophage allies`, hint: 'Release [5]' });
  if (!chips.length) return null;
  return (
    <section className="status">
      {chips.map((c) => (
        <div key={c.key} className="status-chip" style={{ '--c': c.color } as CSSProperties}>
          <span>{c.text}</span>
          {c.hint && <em>{c.hint}</em>}
          {c.bar !== undefined && <div className="meter"><i style={{ width: `${Math.min(1, c.bar) * 100}%`, background: c.color }} /></div>}
        </div>
      ))}
    </section>
  );
}

function Banner({ hud }: { hud: HudSnapshot }) {
  const b = hud.banner;
  if (!b) return null;
  return (
    <div key={b.id} className="banner" aria-live="polite">
      <h2>{b.title}</h2>
      <p>{b.sub}</p>
    </div>
  );
}

export function Hud({ hud, engine }: { hud: HudSnapshot; engine: GameEngine }) {
  const quiet = hud.architect;
  const shown = hud.intro >= 0.6;
  return (
    <div className={`hud ${quiet ? 'hud-architect' : ''}`}>
      {shown && (
        <div className="hud-left">
          <Vitals hud={hud} engine={engine} />
          {!quiet && <Status hud={hud} />}
        </div>
      )}
      {!quiet && <Objective hud={hud} />}
      <div className="hud-right">
        {shown && has(hud, 'radar') && (
          <Radar engine={engine} biome={hud.biome.id} label={<><SunIcon size={12} level={hud.light} /> {hud.biome.name}</>} />
        )}
        <div className="hud-buttons">
          <button className="icon-btn" onClick={() => engine.updateSettings({ muted: !hud.settings.muted })} title="Mute (M)">
            <SpeakerIcon muted={hud.settings.muted} />
          </button>
          <button className="icon-btn" onClick={() => engine.pause()} title="Pause (ESC)"><PauseIcon /></button>
        </div>
      </div>
      {!quiet && <Banner hud={hud} />}
      {!quiet && hud.hint && <div key={hud.hint} className="hint-swim">{hud.hint}</div>}
      {!quiet && shown && <Hotbar hud={hud} engine={engine} />}
      {!quiet && shown && <Tools hud={hud} engine={engine} />}
      {!quiet && shown && <Colony hud={hud} />}
      {hud.labels && <div className="hint-identify">Identifying specimens</div>}
    </div>
  );
}
