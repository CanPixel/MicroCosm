import type { CSSProperties, ReactNode } from 'react';
import type { GameEngine, HudSnapshot } from '@/game/engine';
import { FATES } from '@/game/sim/organelles';
import { SPECIES } from '@/game/sim/species';
import type { AbilityId, LightMode } from '@/game/sim/types';
import { clock, fmt } from './hooks';
import { AbilityIcon, AtpIcon, BiomassIcon, DnaIcon, GlucoseIcon, IntegrityIcon, LightIcon, PauseIcon, SpeakerIcon, SunIcon } from './icons';
import { Radar } from './Radar';

function Ring({ value, max, color, icon, label, warn }: { value: number; max: number; color: string; icon: ReactNode; label: string; warn?: boolean }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const k = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <div className={`ring ${warn ? 'ring-warn' : ''}`} title={`${label}: ${fmt(value)} / ${fmt(max)}`}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${c * k} ${c}`} transform="rotate(-90 32 32)"
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

function Vitals({ hud, engine }: { hud: HudSnapshot; engine: GameEngine }) {
  const biomassK = Math.min(1, hud.biomass / hud.division.threshold);
  const dnaK = Math.min(1, hud.dna / hud.division.dna);
  return (
    <section className="panel vitals">
      <div className="rings">
        <Ring value={hud.atp} max={hud.atpCap} color="#ffd23f" icon={<AtpIcon />} label="ATP" warn={hud.atp < 15} />
        <Ring value={hud.integrity} max={hud.maxIntegrity} color="#ff4f8b" icon={<IntegrityIcon />} label="Membrane" warn={hud.integrity < hud.maxIntegrity * 0.35} />
        <Ring value={hud.glucose} max={hud.glucoseCap} color="#c4f53a" icon={<GlucoseIcon />} label="Glucose" warn={hud.glucose < 6} />
      </div>
      <div className="meter-row" title="Biomass: builds organelles and drives growth. Reach the threshold to divide.">
        <BiomassIcon />
        <div className="meter">
          <i style={{ width: `${biomassK * 100}%`, background: 'linear-gradient(90deg,#ff9a6b,#b48cff)' }} />
        </div>
        <b>{fmt(hud.biomass)}<small>/{hud.division.threshold}</small></b>
      </div>
      <div className="meter-row" title="Nucleotides: needed to replicate the genome and to mutate.">
        <DnaIcon />
        <div className="meter">
          <i style={{ width: `${dnaK * 100}%`, background: 'linear-gradient(90deg,#5ab0ff,#ff5f9e)' }} />
        </div>
        <b>{fmt(hud.dna, 1)}<small>/{hud.division.dna}</small></b>
      </div>
      {hud.division.progress > 0 ? (
        <div className="divide-progress"><span>Cytokinesis</span><div className="meter"><i style={{ width: `${hud.division.progress * 100}%` }} /></div></div>
      ) : hud.division.ok ? (
        <button className="btn btn-divide" onClick={() => engine.divide()}>
          Divide <kbd>R</kbd>
        </button>
      ) : null}
    </section>
  );
}

function Objective({ hud }: { hud: HudSnapshot }) {
  const o = hud.objective;
  return (
    <section className="objective">
      <div className="obj-chips">
        <span className="chip chip-biome" title={hud.biome.tagline}>
          <SunIcon level={hud.light} /> {hud.biome.name}
        </span>
        <span className="chip">{clock(hud.time)}</span>
        <span className="chip chip-gen">Gen {hud.generation}</span>
        <span className="chip chip-pressure" title="Ecosystem pressure rises with time, distance and generation">
          Pressure {fmt(hud.pressure, 1)}
        </span>
      </div>
      {o ? (
        <div className="panel obj-card">
          <div className="obj-head">
            <span className="obj-step">{o.index + 1}/{o.total}</span>
            <b>{o.title}</b>
            {o.progress && <span className="obj-progress">{o.progress}</span>}
          </div>
          <p>{o.text}</p>
        </div>
      ) : (
        <div className="panel obj-card">
          <div className="obj-head"><b>Free evolution</b></div>
          <p>The microcosmos is yours. Explore deeper biomes, fill the Field Journal, and outgrow everything.</p>
        </div>
      )}
    </section>
  );
}

const LOCKED: Array<{ id: AbilityId; hint: string }> = [
  { id: 'lysosome', hint: 'Build a lysosome' },
  { id: 'toxicyst', hint: 'Build an extrusome' },
  { id: 'rnai', hint: 'Build an ER' },
  { id: 'encyst', hint: 'Build a cytoskeleton hub' },
];

function Hotbar({ hud, engine }: { hud: HudSnapshot; engine: GameEngine }) {
  const owned = new Set(hud.abilities.map((a) => a.id));
  return (
    <section className="hotbar">
      {hud.abilities.map((a) => {
        const k = a.remaining > 0 ? a.remaining / a.cooldown : 0;
        const style = { '--cd': `${k * 360}deg` } as CSSProperties;
        return (
          <button
            key={a.id}
            className={`ability ${a.remaining > 0 ? 'cooling' : ''} ${!a.affordable ? 'poor' : ''} ${a.id === 'dash' ? 'ability-dash' : ''}`}
            style={style}
            onClick={() => engine.ability(a.id)}
            title={`${a.name}: ${a.description} (${a.atp} ATP)`}
          >
            <span className="ability-icon"><AbilityIcon id={a.id} /></span>
            {a.remaining > 0 && <span className="ability-cd">{a.remaining.toFixed(1)}</span>}
            <kbd>{a.key === 'SPACE' ? '␣' : a.key}</kbd>
            <span className="ability-cost">{a.atp}<AtpIcon size={10} /></span>
            {a.id === 'virophage' && <span className="ability-count">{hud.storedVirophages}</span>}
          </button>
        );
      })}
      {LOCKED.filter((l) => !owned.has(l.id)).map((l) => (
        <div key={l.id} className="ability locked" title={l.hint}>
          <span className="ability-icon"><AbilityIcon id={l.id} /></span>
          <span className="ability-lock">{l.hint}</span>
        </div>
      ))}
    </section>
  );
}

const LIGHTS: Array<{ mode: LightMode; name: string }> = [
  { mode: 'bright', name: 'Brightfield' },
  { mode: 'dark', name: 'Darkfield' },
  { mode: 'fluor', name: 'Fluorescence' },
];

function Scope({ hud, engine }: { hud: HudSnapshot; engine: GameEngine }) {
  const canBuild = hud.build.some((b) => b.ok);
  return (
    <section className="panel scope">
      <header>
        <span className="eyebrow">Microscope</span>
        <kbd>Q</kbd>
      </header>
      <div className="seg">
        {LIGHTS.map((l) => (
          <button key={l.mode} className={hud.lightMode === l.mode ? 'on' : ''} onClick={() => engine.setLight(l.mode)} title={l.name}>
            <LightIcon mode={l.mode} />
            <span>{l.name}</span>
          </button>
        ))}
      </div>
      <label className="zoom">
        <span>Magnification</span>
        <input
          type="range" min={0.55} max={2.6} step={0.01} value={hud.userZoom}
          onChange={(e) => engine.setUserZoom(Number(e.target.value))}
        />
      </label>
      <button className={`btn btn-architect ${canBuild ? 'pulse' : ''}`} onClick={() => engine.toggleArchitect()}>
        Cell Architect <kbd>TAB</kbd>
      </button>
    </section>
  );
}

function Colony({ hud }: { hud: HudSnapshot }) {
  return (
    <section className="panel colony">
      <header>
        <span className="eyebrow">Colony</span>
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

export function Hud({ hud, engine }: { hud: HudSnapshot; engine: GameEngine }) {
  return (
    <div className={`hud ${hud.architect ? 'hud-architect' : ''}`}>
      <Vitals hud={hud} engine={engine} />
      {!hud.architect && <Objective hud={hud} />}
      <div className="hud-right">
        <Radar engine={engine} biome={hud.biome.id} />
        <div className="hud-buttons">
          <button className="icon-btn" onClick={() => engine.updateSettings({ muted: !hud.settings.muted })} title="Mute (M)">
            <SpeakerIcon muted={hud.settings.muted} />
          </button>
          <button className="icon-btn" onClick={() => engine.pause()} title="Pause (ESC)"><PauseIcon /></button>
        </div>
      </div>
      {!hud.architect && <Status hud={hud} />}
      {!hud.architect && <Hotbar hud={hud} engine={engine} />}
      {!hud.architect && <Scope hud={hud} engine={engine} />}
      {!hud.architect && <Colony hud={hud} />}
      {hud.labels && <div className="hint-identify">Identifying specimens</div>}
    </div>
  );
}
