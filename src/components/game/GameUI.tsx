import { Activity, Biohazard, Box, BrainCircuit, ChevronUp, Dna, FlaskConical, Gauge, Microscope, Minus, Plus, Shield, Sparkles, Volume2, VolumeX, Zap } from 'lucide-react';
import { OrganelleType } from '@/lib/game/types';
import type { ReactNode } from 'react';

type Cost = { glucose: number; biomass: number };
type AbilityState = { cost: number; cooldown: number; active: boolean };
type Props = {
  cellSize: number;
  score: number;
  energy: number;
  glucose: number;
  biomass: number;
  integrity: number;
  maxIntegrity: number;
  isStarving: boolean;
  collectedOrganelles: Set<string>;
  isInfected: boolean;
  infectionProgress: number;
  organelleLevels: Record<OrganelleType, number>;
  threatLevel: number;
  elapsed: number;
  kills: number;
  shielded: boolean;
  muted: boolean;
  zoomMultiplier: number;
  electronMix: number;
  onToggleMute: () => void;
  onZoomChange: (value: number) => void;
  getUpgradeCost: (type: OrganelleType) => Cost;
  getAbilityState: (type: OrganelleType) => AbilityState;
  onUpgrade: (type: OrganelleType) => void;
  onAbility: (type: OrganelleType) => void;
};

const systems: Array<{ type: OrganelleType; name: string; action: string; key: string; icon: typeof Zap }> = [
  { type: 'mitochondrion', name: 'Mitochondria', action: 'ATP surge', key: '1', icon: Zap },
  { type: 'nucleus', name: 'Nucleus', action: 'Membrane shield', key: '2', icon: Shield },
  { type: 'golgi', name: 'Golgi', action: 'Lysosome burst', key: '3', icon: Dna },
];

function Meter({ value, max = 100, tone = 'cyan' }: { value: number; max?: number; tone?: 'cyan' | 'amber' | 'red' | 'green' }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className={`meter-fill meter-${tone}`} style={{ width: `${Math.min(100, Math.max(0, value / max * 100))}%` }} />
    </div>
  );
}

export function GameUI(props: Props) {
  const seconds = Math.floor(props.elapsed % 60).toString().padStart(2, '0');
  const minutes = Math.floor(props.elapsed / 60).toString().padStart(2, '0');
  const electronMagnification = Math.round(800 + props.electronMix * 7200);
  const microscopeReadout = props.electronMix > 0.12
    ? `EM ${electronMagnification.toLocaleString()}×`
    : `OPTICAL ${props.zoomMultiplier.toFixed(1)}×`;

  return (
    <div data-game-ui className="hud-root pointer-events-none fixed inset-0 z-40 text-white">
      <section className="hud-panel pointer-events-auto w-[min(320px,calc(100vw-24px))] p-4">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="eyebrow">LIVE SPECIMEN 07</p>
            <h1 className="microcosm-title text-[30px] leading-none">Micro<span className="cosm-icky">Cosm</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={props.onToggleMute} className="hud-icon-button pointer-events-auto sm:hidden" aria-label={props.muted ? 'Unmute' : 'Mute'}>
              {props.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-2.5 py-1 text-right">
              <p className="eyebrow">SURVIVAL</p><p className="font-mono text-sm">{minutes}:{seconds}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat icon={Zap} label="ATP" value={`${Math.round(props.energy)}`}><Meter value={props.energy} tone={props.isStarving ? 'red' : 'cyan'} /></Stat>
          <Stat icon={FlaskConical} label="GLUCOSE" value={`${Math.round(props.glucose)}`}><Meter value={props.glucose} max={80 + props.organelleLevels.nucleus * 15} tone="amber" /></Stat>
          <Stat icon={Activity} label="INTEGRITY" value={`${Math.round(props.integrity)}%`}><Meter value={props.integrity} max={props.maxIntegrity} tone="green" /></Stat>
          <Stat icon={Box} label="BIOMASS" value={`${Math.floor(props.biomass)}`} />
        </div>

        {(props.isInfected || props.isStarving) && (
          <div className="infection-readout mt-3 rounded-lg p-2.5">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-red-200">
              <span className="flex items-center gap-2"><Biohazard size={15} />{props.isInfected ? 'GENOME HIJACK' : 'ATP STARVATION'}</span>
              {props.isInfected && <span className="font-mono text-[10px]">{Math.round(props.infectionProgress)}%</span>}
            </div>
            {props.isInfected && <>
              <div className="mt-2"><Meter value={props.infectionProgress} tone="red" /></div>
              <p className="mt-1.5 text-[9px] text-red-200/55">
                {props.organelleLevels.nucleus >= 1 || props.organelleLevels.golgi >= 1
                  ? 'Use RNA interference or an autophagy purge to reduce viral load.'
                  : 'Find an antiviral vesicle. Upgrade Nucleus or Golgi to build an internal response.'}
              </p>
            </>}
          </div>
        )}
      </section>

      <section className="microscope-panel hud-panel pointer-events-auto absolute p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[10px] font-bold tracking-wide text-cyan-100/75"><Microscope size={15} /> MICROSCOPE</span>
          <span className={props.electronMix > 0.12 ? 'electron-readout' : 'text-[10px] font-bold text-white/55'}>
            {microscopeReadout}
          </span>
        </div>
        <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
          <button type="button" className="zoom-step-button" aria-label="Zoom out" disabled={props.zoomMultiplier <= 0.7001} onClick={() => props.onZoomChange(props.zoomMultiplier - 0.1)}><Minus size={14} /></button>
          <input
            className="microscope-slider"
            type="range"
            min="0.7"
            max="2.4"
            step="0.1"
            value={props.zoomMultiplier}
            onChange={(event) => props.onZoomChange(Number(event.currentTarget.value))}
            aria-label="Microscope zoom"
            aria-valuetext={microscopeReadout}
          />
          <button type="button" className="zoom-step-button" aria-label="Zoom in" disabled={props.zoomMultiplier >= 2.3999} onClick={() => props.onZoomChange(props.zoomMultiplier + 0.1)}><Plus size={14} /></button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[8px] font-bold tracking-[.12em] text-white/30">
          <span>ECOSYSTEM</span><span>[ &nbsp; ]</span><span>ULTRASTRUCTURE</span>
        </div>
      </section>

      <section className="pressure-panel hud-panel pointer-events-auto absolute hidden w-60 p-3 sm:block">
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow">ECOSYSTEM PRESSURE</p>
          <button type="button" onClick={props.onToggleMute} className="hud-icon-button" aria-label={props.muted ? 'Unmute' : 'Mute'}>
            {props.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
        <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm"><Gauge size={16} /> Threat wave</span><b className="text-amber-300">{props.threatLevel}</b></div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-amber-300/70" style={{ width: `${(props.elapsed % 45) / 45 * 100}%` }} /></div>
        <div className="mt-2 flex justify-between text-xs text-white/55"><span>{props.kills} digested</span><span>{Math.round(props.score)} μm</span></div>
      </section>

      <section className="system-dock absolute left-1/2 flex -translate-x-1/2 gap-2">
        {systems.map((system) => {
          const unlocked = props.collectedOrganelles.has(system.type);
          const cost = props.getUpgradeCost(system.type);
          const Icon = system.icon;
          const affordable = props.glucose >= cost.glucose && props.biomass >= cost.biomass;
          const ability = props.getAbilityState(system.type);
          const abilityReady = props.energy >= ability.cost && ability.cooldown <= 0;
          const actionLabel = props.isInfected && system.type === 'nucleus' && props.organelleLevels.nucleus >= 1
            ? 'RNA interference'
            : props.isInfected && system.type === 'golgi' && props.organelleLevels.golgi >= 1
              ? 'Autophagy purge'
              : system.action;
          const compactAction = ability.cooldown > 0
            ? `${ability.cooldown.toFixed(1)}s`
            : props.isInfected && system.type === 'nucleus' && props.organelleLevels.nucleus >= 1
              ? 'RNAi'
              : props.isInfected && system.type === 'golgi' && props.organelleLevels.golgi >= 1
                ? 'Purge'
                : system.type === 'mitochondrion' ? 'Surge' : system.type === 'nucleus' ? 'Shield' : 'Burst';
          const displayedAction = ability.cooldown > 0 ? `${ability.cooldown.toFixed(1)}s` : actionLabel;
          return (
            <article key={system.type} className={`hud-panel pointer-events-auto min-w-0 flex-1 p-2.5 ${!unlocked ? 'system-locked' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="system-icon"><Icon size={18} /></span>
                <div className="min-w-0"><p className="truncate text-xs font-bold sm:text-sm">{system.name}</p><p className="eyebrow">LEVEL {props.organelleLevels[system.type]}</p></div>
              </div>
              <div className="mt-2 grid gap-1 sm:grid-cols-[1fr_auto]">
                <button disabled={!unlocked || !abilityReady} onClick={() => props.onAbility(system.type)} className="action-button" title={`${ability.cost} ATP`} aria-label={`${displayedAction}, costs ${ability.cost} ATP`}>
                  <Sparkles size={13} /><span className="action-label truncate">{displayedAction}</span><span className="action-label-compact">{compactAction}</span><span className="ability-cost">{ability.cost} ATP</span><kbd>{system.key}</kbd>
                </button>
                <button disabled={!unlocked || !affordable} onClick={() => props.onUpgrade(system.type)} className="upgrade-button" title={`Upgrade: ${cost.glucose} glucose, ${cost.biomass} biomass`} aria-label={`Upgrade ${system.name}, costs ${cost.glucose} glucose and ${cost.biomass} biomass`}>
                  <ChevronUp size={14} /><span className="upgrade-cost sm:hidden">{cost.glucose}G · {cost.biomass}B</span>
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <div className="control-hint absolute hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] text-white/45 lg:flex"><BrainCircuit size={13} /> WASD / DRAG TO SWIM · HOLD E TO IDENTIFY</div>
      {props.shielded && <div className="absolute left-1/2 top-20 -translate-x-1/2 rounded-full border border-cyan-300/40 bg-cyan-950/70 px-4 py-1.5 text-xs font-bold text-cyan-200">MEMBRANE SHIELD ACTIVE</div>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, children }: { icon: typeof Zap; label: string; value: string; children?: ReactNode }) {
  return <div className="resource-tile"><div className="mb-1 flex items-center justify-between"><span className="flex items-center gap-1.5 text-[10px] font-bold text-white/55"><Icon size={12} />{label}</span><b className="text-xs">{value}</b></div>{children}</div>;
}
