import { useMemo, useState, type CSSProperties } from 'react';
import { DEATH_TEXT, TOTAL_SPECIES, type GameEngine, type HudSnapshot, type Toast } from '@/game/engine';
import { FATES, MUTATIONS } from '@/game/sim/organelles';
import { SPECIES, SPECIES_LIST } from '@/game/sim/species';
import type { CellFate, MutationId, SpeciesGroup, SpeciesId } from '@/game/sim/types';
import { speciesIcon } from './art';
import { clock, fmt } from './hooks';
import { DnaIcon } from './icons';

export function Logo({ big = false }: { big?: boolean }) {
  return (
    <h1 className={`logo ${big ? 'logo-big' : ''}`} aria-label="MicroCosm">
      <span className="logo-micro">Micro</span>
      <span className="logo-cosm">Cosm</span>
      <i className="logo-drop logo-drop-1" />
      <i className="logo-drop logo-drop-2" />
    </h1>
  );
}

type Overlay = 'none' | 'journal' | 'settings' | 'howto';

function useOverlay() {
  return useState<Overlay>('none');
}

export function TitleScreen({ engine, hud }: { engine: GameEngine; hud: HudSnapshot }) {
  const [overlay, setOverlay] = useOverlay();
  const known = Object.keys(hud.journal).length;
  const r = hud.records;
  return (
    <div className="screen title-screen" onPointerDown={() => engine.unlockAudio()}>
      <div className="title-card">
        <span className="eyebrow">A journey through the microcosmos</span>
        <Logo big />
        <p className="tagline">Engulf. Endosymbiose. Divide. Survive the viral storm and grow from a single cell into a multicellular organism.</p>
        <div className="title-actions">
          <button className="btn btn-primary btn-lg" onClick={() => engine.newRun()}>Begin specimen</button>
          <button className="btn btn-ghost" onClick={() => setOverlay('howto')}>How to play</button>
          <button className="btn btn-ghost" onClick={() => setOverlay('journal')}>Field Journal <small>{known}/{TOTAL_SPECIES}</small></button>
          <button className="btn btn-ghost" onClick={() => setOverlay('settings')}>Settings</button>
        </div>
        {r.runs > 0 && (
          <div className="records">
            <span>Runs <b>{r.runs}</b></span>
            <span>Best generation <b>{r.bestGeneration}</b></span>
            <span>Largest colony <b>{r.bestCells}</b></span>
            <span>Longest life <b>{clock(r.longestRun)}</b></span>
            {r.victories > 0 && <span>Multicellular <b>×{r.victories}</b></span>}
          </div>
        )}
      </div>
      <footer className="title-foot">Inspired by electron micrographs, <i>Journey to the Microcosmos</i> and Kurzgesagt. All sound is synthesized live.</footer>
      {overlay === 'journal' && <Journal hud={hud} onClose={() => setOverlay('none')} />}
      {overlay === 'settings' && <SettingsPanel engine={engine} hud={hud} onClose={() => setOverlay('none')} />}
      {overlay === 'howto' && <HowTo onClose={() => setOverlay('none')} />}
    </div>
  );
}

export function PauseMenu({ engine, hud }: { engine: GameEngine; hud: HudSnapshot }) {
  const [overlay, setOverlay] = useOverlay();
  return (
    <div className="screen modal-screen">
      <div className="panel modal pause">
        <span className="eyebrow">Specimen held</span>
        <h2>Paused</h2>
        <div className="pause-stats">
          <span>Time <b>{clock(hud.time)}</b></span>
          <span>Generation <b>{hud.generation}</b></span>
          <span>Cells <b>{hud.cells}</b></span>
          <span>Species <b>{hud.discovered.length}</b></span>
        </div>
        <div className="stack">
          <button className="btn btn-primary" onClick={() => engine.resume()}>Resume <kbd>ESC</kbd></button>
          <button className="btn btn-ghost" onClick={() => setOverlay('journal')}>Field Journal</button>
          <button className="btn btn-ghost" onClick={() => setOverlay('howto')}>How to play</button>
          <button className="btn btn-ghost" onClick={() => setOverlay('settings')}>Settings</button>
          <button className="btn btn-danger" onClick={() => engine.toTitle()}>Abandon specimen</button>
        </div>
      </div>
      {overlay === 'journal' && <Journal hud={hud} onClose={() => setOverlay('none')} />}
      {overlay === 'settings' && <SettingsPanel engine={engine} hud={hud} onClose={() => setOverlay('none')} />}
      {overlay === 'howto' && <HowTo onClose={() => setOverlay('none')} />}
    </div>
  );
}

export function DivisionScreen({ engine, hud }: { engine: GameEngine; hud: HudSnapshot }) {
  const [fate, setFate] = useState<CellFate | null>(null);
  const [mutation, setMutation] = useState<MutationId | null>(null);
  const choices = hud.choices;
  if (!choices) return null;
  const pickedFate = fate && choices.fates.includes(fate) ? fate : null;
  const pickedMut = mutation && choices.mutations.includes(mutation) ? mutation : null;
  return (
    <div className="screen modal-screen">
      <div className="panel modal division">
        <span className="eyebrow">Cytokinesis complete</span>
        <h2>Generation {hud.generation} → {hud.generation + 1}</h2>
        <p className="lede">Your genome replicated and the cell pinched in two. The daughter stays adhered to you. Choose what it becomes, and which mutation the lineage keeps.</p>
        <h3>Daughter cell fate</h3>
        <div className="choice-row">
          {choices.fates.map((f) => {
            const def = FATES[f as Exclude<CellFate, 'prime'>];
            return (
              <button key={f} className={`choice ${pickedFate === f ? 'on' : ''}`} style={{ '--c': def.color } as CSSProperties} onClick={() => setFate(f)}>
                <span className="fate-dot" />
                <b>{def.name}</b>
                <span className="choice-effect">{def.role}</span>
                <small>{def.science}</small>
              </button>
            );
          })}
        </div>
        <h3>
          Mutation
          <button className="btn btn-small btn-ghost reroll" disabled={hud.dna < 2} onClick={() => engine.reroll()}>
            Reroll <DnaIcon size={13} /> 2
          </button>
        </h3>
        <div className="choice-row">
          {choices.mutations.map((m) => {
            const def = MUTATIONS[m];
            const stacks = hud.mutations.find((x) => x.id === m)?.stacks ?? 0;
            return (
              <button key={m} className={`choice choice-mut ${pickedMut === m ? 'on' : ''}`} onClick={() => setMutation(m)}>
                <b>{def.name}{stacks > 0 ? <em> +{stacks + 1}</em> : null}</b>
                <span className="choice-effect">{def.effect}</span>
                <small>{def.science}</small>
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary btn-lg" disabled={!pickedFate || !pickedMut} onClick={() => pickedFate && pickedMut && engine.chooseDivision(pickedFate, pickedMut)}>
          Commit to the lineage
        </button>
      </div>
    </div>
  );
}

export function EndScreen({ engine, hud, victory }: { engine: GameEngine; hud: HudSnapshot; victory: boolean }) {
  const [overlay, setOverlay] = useOverlay();
  const s = hud.stats;
  const killer = hud.death?.killer;
  return (
    <div className="screen modal-screen">
      <div className={`panel modal end ${victory ? 'end-win' : ''}`}>
        {victory ? (
          <>
            <span className="eyebrow">Threshold crossed</span>
            <h2>Multicellularity</h2>
            <p className="lede">Six specialized cells now live as one organism, dividing labor like tissue. On Earth this step took roughly a billion years. You did it in {clock(hud.time)}.</p>
          </>
        ) : (
          <>
            <span className="eyebrow">Specimen lost</span>
            <h2>{hud.death ? DEATH_TEXT[hud.death.cause] : 'The cell died'}</h2>
            {killer && (
              <div className="killer">
                <img src={speciesIcon(killer, 112)} alt="" />
                <div>
                  <b>{SPECIES[killer].name}</b>
                  <i>{SPECIES[killer].latin}</i>
                  <p>{SPECIES[killer].codex.role}</p>
                </div>
              </div>
            )}
          </>
        )}
        <div className="end-stats">
          <span>Survived <b>{clock(hud.time)}</b></span>
          <span>Generation <b>{hud.generation}</b></span>
          <span>Peak colony <b>{s.peakCells}</b></span>
          <span>Engulfed <b>{s.eaten}</b></span>
          <span>Destroyed <b>{s.kills}</b></span>
          <span>Glucose <b>{s.glucose}</b></span>
          <span>Species seen <b>{s.discovered}</b></span>
          <span>Farthest <b>{fmt(s.maxDistance / 2)} μm</b></span>
        </div>
        {hud.newRecords.length > 0 && (
          <div className="new-records">New personal best: {hud.newRecords.join(' · ')}</div>
        )}
        <div className="stack stack-row">
          {victory ? (
            <button className="btn btn-primary" onClick={() => engine.resume()}>Keep evolving</button>
          ) : (
            <button className="btn btn-primary" onClick={() => engine.newRun()}>Try again</button>
          )}
          <button className="btn btn-ghost" onClick={() => setOverlay('journal')}>Field Journal</button>
          <button className="btn btn-ghost" onClick={() => engine.toTitle()}>Title</button>
        </div>
      </div>
      {overlay === 'journal' && <Journal hud={hud} onClose={() => setOverlay('none')} />}
    </div>
  );
}

const GROUPS: Array<{ id: 'all' | SpeciesGroup | 'micro'; name: string }> = [
  { id: 'all', name: 'All' },
  { id: 'micro', name: 'Microbes' },
  { id: 'protist', name: 'Protists' },
  { id: 'animal', name: 'Animalcules' },
  { id: 'agent', name: 'Infectious agents' },
];

const SPECTRUM: SpeciesId[] = ['prion', 'viroid', 'satellite', 'adenovirus', 'virophage', 'proteo'];

export function Journal({ hud, onClose }: { hud: HudSnapshot; onClose: () => void }) {
  const [group, setGroup] = useState<(typeof GROUPS)[number]['id']>('all');
  const [selected, setSelected] = useState<SpeciesId | null>(null);
  const list = useMemo(() => SPECIES_LIST.filter((d) => {
    if (group === 'all') return true;
    if (group === 'micro') return d.group === 'bacteria' || d.group === 'resource' || d.group === 'obstacle';
    if (group === 'protist') return d.group === 'protist' || d.group === 'boss';
    return d.group === group;
  }), [group]);
  const known = (id: SpeciesId) => !!hud.journal[id];
  const count = Object.keys(hud.journal).length;
  const sel = selected ? SPECIES[selected] : null;
  return (
    <div className="screen journal-screen" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel journal">
        <header className="journal-head">
          <div>
            <span className="eyebrow">Field Journal</span>
            <h2>{count} / {TOTAL_SPECIES} catalogued</h2>
          </div>
          <div className="tabs">
            {GROUPS.map((g) => (
              <button key={g.id} className={group === g.id ? 'on' : ''} onClick={() => setGroup(g.id)}>{g.name}</button>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </header>
        <div className="journal-body">
          <div className="journal-grid">
            {list.map((d) => (
              <button key={d.id} className={`specimen ${known(d.id) ? '' : 'unknown'} ${selected === d.id ? 'on' : ''}`} onClick={() => setSelected(d.id)}>
                <img src={speciesIcon(d.id, 112, !known(d.id))} alt="" />
                <span>{known(d.id) ? d.name : '???'}</span>
              </button>
            ))}
          </div>
          <div className="journal-detail">
            {sel ? (
              known(sel.id) ? (
                <>
                  <img src={speciesIcon(sel.id, 220)} alt="" />
                  <h3>{sel.name}</h3>
                  <i className="latin">{sel.latin}</i>
                  <div className="facts">
                    <span>Size <b>{sel.codex.size}</b></span>
                    <span>Encounters <b>{hud.journal[sel.id]}</b></span>
                    {sel.threat > 0 && <span className="danger">Threat <b>{'●'.repeat(sel.threat)}</b></span>}
                  </div>
                  <p>{sel.codex.fact}</p>
                  <p className="role">{sel.codex.role}</p>
                  {sel.group === 'agent' && (
                    <div className="spectrum">
                      <span className="eyebrow">Aliveness spectrum</span>
                      <div className="spectrum-bar">
                        {SPECTRUM.map((id, i) => (
                          <span key={id} className={SPECIES[id].aliveness === sel.aliveness || (id === 'adenovirus' && sel.aliveness === 3) ? 'on' : ''}>
                            {['Prions', 'Viroids', 'Satellites', 'Viruses', 'Virophages', 'Bacteria'][i]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="detail-empty">Not yet observed. Some species only show under darkfield or fluorescence light.</div>
              )
            ) : (
              <div className="detail-empty">Every organism you meet is catalogued here with real biology. Select a specimen.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsPanel({ engine, hud, onClose }: { engine: GameEngine; hud: HudSnapshot; onClose: () => void }) {
  const s = hud.settings;
  return (
    <div className="screen journal-screen" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel modal settings">
        <span className="eyebrow">Settings</span>
        <h2>Lab bench</h2>
        {(['master', 'music', 'sfx'] as const).map((k) => (
          <label key={k} className="slider-row">
            <span>{k === 'sfx' ? 'Effects' : k[0].toUpperCase() + k.slice(1)}</span>
            <input type="range" min={0} max={1} step={0.01} value={s[k]} onChange={(e) => engine.updateSettings({ [k]: Number(e.target.value) })} />
            <b>{Math.round(s[k] * 100)}</b>
          </label>
        ))}
        <div className="slider-row">
          <span>Quality</span>
          <div className="seg seg-text">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <button key={q} className={s.quality === q ? 'on' : ''} onClick={() => engine.updateSettings({ quality: q })}>{q}</button>
            ))}
          </div>
        </div>
        <label className="toggle-row">
          <input type="checkbox" checked={s.reducedMotion} onChange={(e) => engine.updateSettings({ reducedMotion: e.target.checked })} />
          <span>Reduced motion (no screen shake or distortion)</span>
        </label>
        <label className="toggle-row">
          <input type="checkbox" checked={s.muted} onChange={(e) => engine.updateSettings({ muted: e.target.checked })} />
          <span>Mute all sound</span>
        </label>
        {!hud.webgl && <p className="muted">WebGL2 is unavailable, so post-processing (bloom, light modes) is reduced.</p>}
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

export function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="screen journal-screen" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel modal howto">
        <span className="eyebrow">Field manual</span>
        <h2>How to live as a cell</h2>
        <div className="howto-grid">
          <section>
            <h3>Eat and grow</h3>
            <p>Swim into <b>glucose</b> for fuel. Engulf anything clearly <b>smaller than you</b> (dashed green ring): it is digested in a food vacuole into <b>biomass</b>. Things larger than you, outlined in <b>red</b>, can eat or hurt you.</p>
          </section>
          <section>
            <h3>Endosymbiosis</h3>
            <p>Engulf a purple <b>α-proteobacterium</b> to keep it as a mitochondrion (huge ATP boost), or a <b>cyanobacterium</b> for a chloroplast (glucose from light).</p>
          </section>
          <section>
            <h3>Build the cell</h3>
            <p>Press <kbd>TAB</kbd> to zoom into your ultrastructure. Spend biomass and DNA on organelles and drag them into slots. Neighbors create synergies.</p>
          </section>
          <section>
            <h3>Survive infection</h3>
            <p>Docking viruses can be shaken off with a <kbd>SPACE</kbd> dash. Injected genomes replicate toward a burst: cut them with <b>RNAi</b>. Prions misfold organelles: a <b>lysosome burst</b> recycles them.</p>
          </section>
          <section>
            <h3>Change the light</h3>
            <p><kbd>Q</kbd> cycles brightfield, darkfield (reveals prions, viroids and trap bristles) and fluorescence (reveals infected prey and proviruses, at an ATP cost).</p>
          </section>
          <section>
            <h3>Divide</h3>
            <p>At critical mass with enough DNA, press <kbd>R</kbd>. Daughters stay attached and specialize. Reach <b>six cells</b> to become multicellular.</p>
          </section>
        </div>
        <div className="keys">
          <span><kbd>WASD</kbd>/<kbd>hold mouse</kbd> swim</span>
          <span><kbd>SPACE</kbd> dash</span>
          <span><kbd>1</kbd>–<kbd>5</kbd> abilities</span>
          <span><kbd>right click</kbd> fire</span>
          <span><kbd>Q</kbd> light</span>
          <span><kbd>TAB</kbd> architect</span>
          <span><kbd>R</kbd> divide</span>
          <span><kbd>E</kbd> identify</span>
          <span><kbd>wheel</kbd> zoom</span>
          <span><kbd>ESC</kbd> pause</span>
        </div>
        <button className="btn btn-primary" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

export function Toasts({ toasts, engine, docked }: { toasts: Toast[]; engine: GameEngine; docked: boolean }) {
  return (
    <div className={`toasts ${docked ? 'toasts-docked' : ''}`} aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`toast toast-${t.kind}`} style={{ '--c': t.color } as CSSProperties} onClick={() => engine.dismissToast(t.id)}>
          {t.species && <img src={speciesIcon(t.species, 72)} alt="" />}
          <span>
            <b>{t.title}</b>
            <small>{t.text}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
