import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import {
  Activity,
  Check,
  CircleDotDashed,
  Dna,
  FlaskConical,
  Gauge,
  Move,
  PackageOpen,
  ScanLine,
  ShieldCheck,
  Split,
  ZoomOut,
  Zap,
} from 'lucide-react';
import { CELL_ARCHITECTURE_SLOTS, STANCE_TRAITS } from '@/lib/game/architecture';
import { DIVISION_MIN_ARCHITECTURE_SCORE } from '@/lib/game/constants';
import type {
  ArchitectureBonuses,
  AutomationRule,
  CellAutomation,
  CellStage,
  MetabolicStance,
  OrganellePlacement,
  OrganelleType,
} from '@/lib/game/types';

type Readiness = {
  ready: boolean;
  checks: {
    systems: boolean;
    architecture: boolean;
    size: boolean;
    energy: boolean;
    glucose: boolean;
    biomass: boolean;
    integrity: boolean;
    genome: boolean;
  };
  costs: { energy: number; glucose: number; biomass: number };
};

type Props = {
  intensity: number;
  interactive: boolean;
  architecture: OrganellePlacement[];
  bonuses: ArchitectureBonuses;
  stance: MetabolicStance;
  automation: CellAutomation;
  stage: CellStage;
  divisionProgress: number;
  readiness: Readiness;
  organelleLevels: Record<OrganelleType, number>;
  onMove: (unitId: string, slot: number) => void;
  onStance: (stance: MetabolicStance) => void;
  onAutomation: (rule: AutomationRule, enabled: boolean) => void;
  onBeginDivision: () => void;
  onClose: () => void;
};

type DragState = {
  pointerId: number;
  unitId: string;
  type: OrganelleType;
  startX: number;
  startY: number;
  x: number;
  y: number;
  hoveredSlot: number | null;
};

const organelleInfo: Record<OrganelleType, {
  name: string;
  role: string;
  icon: typeof Zap;
  className: string;
}> = {
  mitochondrion: {
    name: 'Mitochondrion',
    role: 'The metabolic ring raises ATP yield. Membrane placement improves transport and propulsion.',
    icon: Zap,
    className: 'architecture-unit-mito',
  },
  nucleus: {
    name: 'Nucleus',
    role: 'The genome core suppresses viral replication and protects the membrane from structural damage.',
    icon: Dna,
    className: 'architecture-unit-nucleus',
  },
  golgi: {
    name: 'Golgi apparatus',
    role: 'Nucleus adjacency improves biomass synthesis. Membrane placement extends lysosome reach.',
    icon: PackageOpen,
    className: 'architecture-unit-golgi',
  },
};

const stageInfo: Record<CellStage, { index: number; title: string; instruction: string }> = {
  forage: { index: 1, title: 'Metabolic ignition', instruction: 'Ingest 8 glucose crystals to establish a viable energy flux.' },
  assemble: { index: 2, title: 'System assembly', instruction: 'Explore and engulf mitochondria, Golgi, and a nucleus.' },
  stabilize: { index: 3, title: 'Homeostatic design', instruction: `Upgrade each system and arrange a coherence score of ${DIVISION_MIN_ARCHITECTURE_SCORE} or more.` },
  replicate: { index: 4, title: 'Replication reserve', instruction: 'Accumulate the ATP, glucose, biomass, size, and integrity required for division.' },
  division: { index: 5, title: 'Controlled cytokinesis', instruction: 'Keep ATP and membrane integrity stable while the daughter cell separates.' },
  complete: { index: 5, title: 'Lineage established', instruction: 'The daughter cell inherited a stable architecture.' },
};

const checkLabels: Record<keyof Readiness['checks'], string> = {
  systems: 'Systems L1',
  architecture: `Coherence ${DIVISION_MIN_ARCHITECTURE_SCORE}+`,
  size: 'Diameter 95 μm+',
  energy: 'ATP 35+',
  glucose: 'Glucose 45+',
  biomass: 'Biomass 22+',
  integrity: 'Integrity 75%+',
  genome: 'Genome clear',
};

export function CellArchitect(props: Props) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const occupants = useMemo(
    () => new Map(props.architecture.map((unit) => [unit.slot, unit])),
    [props.architecture],
  );
  const selected = props.architecture.find((unit) => unit.id === selectedUnit) ?? null;
  const currentStage = stageInfo[props.stage];

  const nearestSlot = (clientX: number, clientY: number): number | null => {
    const field = fieldRef.current;
    if (!field) return null;
    const fieldRect = field.getBoundingClientRect();
    const padding = 30;
    if (
      clientX < fieldRect.left - padding
      || clientX > fieldRect.right + padding
      || clientY < fieldRect.top - padding
      || clientY > fieldRect.bottom + padding
    ) return null;

    let nearest: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const element of field.querySelectorAll<HTMLElement>('[data-architecture-slot]')) {
      const rect = element.getBoundingClientRect();
      const distance = Math.hypot(clientX - (rect.left + rect.width / 2), clientY - (rect.top + rect.height / 2));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = Number(element.dataset.architectureSlot);
      }
    }
    return nearest;
  };

  const handleSlotPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    slot: number,
    unit: OrganellePlacement | undefined,
  ) => {
    if (!props.interactive || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    if (selectedUnit && selectedUnit !== unit?.id) {
      props.onMove(selectedUnit, slot);
      setSelectedUnit(null);
      setDrag(null);
      return;
    }

    if (!unit) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedUnit(unit.id);
    setDrag({
      pointerId: event.pointerId,
      unitId: unit.id,
      type: unit.type,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      hoveredSlot: unit.slot,
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    setDrag((current) => {
      if (!current || current.pointerId !== event.pointerId) return current;
      return {
        ...current,
        x: event.clientX,
        y: event.clientY,
        hoveredSlot: nearestSlot(event.clientX, event.clientY),
      };
    });
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 7;
    const target = nearestSlot(event.clientX, event.clientY);
    if (moved && target !== null) {
      props.onMove(drag.unitId, target);
      setSelectedUnit(null);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
  };

  const dragInfo = drag ? organelleInfo[drag.type] : null;
  const DragIcon = dragInfo?.icon;
  const dragMoved = drag ? Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 7 : false;

  return (
    <div
      data-game-ui
      className={`cell-architect fixed inset-0 z-[39] ${props.interactive ? 'cell-architect-interactive' : 'cell-architect-passive'}`}
      style={{ '--architect-intensity': props.intensity } as CSSProperties}
      role="region"
      aria-label="Cell ultrastructure architect"
      aria-hidden={!props.interactive}
      {...({ inert: props.interactive ? undefined : '' } as Record<string, string | undefined>)}
    >
      <div className="ultrastructure-vignette" aria-hidden="true" />

      <header className="ultrastructure-header">
        <span className="ultrastructure-scan-icon"><ScanLine size={17} /></span>
        <div className="min-w-0">
          <p className="eyebrow">{props.interactive
            ? 'LIVE ULTRASTRUCTURE · INTERNAL MOTILITY CLAMPED'
            : 'FOCUSING ULTRASTRUCTURE · WORLD CONTROL LIVE'}</p>
          <h2>Cell Architect <small>{props.bonuses.score} coherence</small></h2>
        </div>
        <button type="button" className="phase-out-button" onClick={props.onClose}>
          <ZoomOut size={15} /><span>PHASE OUT</span>
        </button>
      </header>

      <section className="ultrastructure-cell-stage" aria-label="Interactive internal cell structure">
        <div ref={fieldRef} className={`architecture-field ${selected ? 'architecture-field-routing' : ''}`}>
          <div className="architecture-membrane" aria-hidden="true" />
          <div className="architecture-ring architecture-ring-metabolic" aria-hidden="true" />
          <div className="architecture-ring architecture-ring-genome" aria-hidden="true" />
          <div className="architecture-zone-label architecture-zone-label-core">GENOME CORE</div>
          <div className="architecture-zone-label architecture-zone-label-ring">METABOLIC RING</div>

          {CELL_ARCHITECTURE_SLOTS.map((slot) => {
            const unit = occupants.get(slot.id);
            const info = unit ? organelleInfo[unit.type] : null;
            const Icon = info?.icon ?? CircleDotDashed;
            const isSource = unit?.id === selectedUnit;
            const isValid = Boolean(selectedUnit) && !isSource;
            const isHovered = drag?.hoveredSlot === slot.id && dragMoved;
            return (
              <button
                type="button"
                key={slot.id}
                data-architecture-slot={slot.id}
                className={[
                  'architecture-slot',
                  `architecture-slot-${slot.zone}`,
                  info?.className ?? '',
                  isSource ? 'architecture-slot-selected architecture-slot-source' : '',
                  isValid ? 'architecture-slot-valid' : '',
                  isHovered ? 'architecture-slot-drop' : '',
                ].join(' ')}
                style={{ left: `${50 + slot.x * 58}%`, top: `${50 + slot.y * 58}%` }}
                onPointerDown={(event) => handleSlotPointerDown(event, slot.id, unit)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={() => setDrag(null)}
                aria-label={unit
                  ? `${info?.name} in ${slot.label}. Drag or select to move.`
                  : `Empty ${slot.label}. Available organelle receptor.`}
                aria-pressed={isSource}
              >
                <span className="architecture-slot-receptor" aria-hidden="true" />
                <Icon size={unit?.type === 'nucleus' ? 27 : 23} />
                <span>{unit ? `L${props.organelleLevels[unit.type]}` : slot.zone.slice(0, 3).toUpperCase()}</span>
              </button>
            );
          })}

          <div className="architecture-score" aria-label={`Architecture score ${props.bonuses.score} out of 100`}>
            <strong>{props.bonuses.score}</strong><span>COHERENCE</span>
          </div>

          <div className={`ultrastructure-placement ${selected ? 'ultrastructure-placement-active' : ''}`}>
            <Move size={14} />
            <span>
              <b>{selected ? organelleInfo[selected.type].name : 'Cytoplasmic transport'}</b>
              <small>{selected
                ? 'Drag into a pulsing receptor, or tap another receptor to swap.'
                : 'Drag any organelle. Receptors illuminate when transport begins.'}</small>
            </span>
          </div>

          <div className="ultrastructure-bonus-strip">
            <Bonus icon={Zap} label="ATP" value={`+${Math.round((props.bonuses.atpConversion - 1) * 100)}%`} />
            <Bonus icon={FlaskConical} label="UPTAKE" value={`+${Math.round((props.bonuses.glucoseUptake - 1) * 100)}%`} />
            <Bonus icon={ShieldCheck} label="VIRAL" value={`${Math.round(props.bonuses.viralResistance * 100)}%`} />
            <Bonus icon={Activity} label="ANABOLISM" value={`+${Math.round((props.bonuses.biomassSynthesis - 1) * 100)}%`} />
          </div>
        </div>
      </section>

      <aside className="ultrastructure-controls">
        <section className="ultrastructure-panel ultrastructure-phase-panel">
          <div className="flex items-center justify-between gap-3">
            <div><p className="eyebrow">RUN PHASE {currentStage.index}/5</p><h3>{currentStage.title}</h3></div>
            <span className="live-indicator"><i /> WORLD LIVE</span>
          </div>
          <p>{currentStage.instruction}</p>
          {props.stage === 'division' && (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[8px] font-black tracking-wide text-cyan-100/70"><span>CYTOKINESIS</span><span>{Math.round(props.divisionProgress)}%</span></div>
              <div className="division-meter"><i style={{ width: `${props.divisionProgress}%` }} /></div>
            </div>
          )}
        </section>

        <section className="ultrastructure-panel">
          <p className="eyebrow">METABOLIC CONTROL HUB</p>
          <div className="ultrastructure-stances">
            {(Object.keys(STANCE_TRAITS) as MetabolicStance[]).map((stance) => {
              const trait = STANCE_TRAITS[stance];
              return (
                <button
                  type="button"
                  key={stance}
                  className={`stance-button ${props.stance === stance ? 'stance-button-active' : ''}`}
                  onClick={() => props.onStance(stance)}
                  aria-pressed={props.stance === stance}
                  title={trait.description}
                >
                  <Gauge size={14} /><span><b>{trait.label}</b><small>{trait.description}</small></span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="ultrastructure-panel ultrastructure-rna-panel">
          <p className="eyebrow">FOLDED REGULATORY RNA</p>
          <AutomationToggle
            label="Emergency RNAi"
            description="Trigger at 20% viral load."
            enabled={props.automation.rnai}
            unlocked={props.organelleLevels.nucleus >= 1}
            onChange={(enabled) => props.onAutomation('rnai', enabled)}
          />
          <AutomationToggle
            label="Autophagy reflex"
            description="Digest nearby infectious particles."
            enabled={props.automation.autophagy}
            unlocked={props.organelleLevels.golgi >= 1}
            onChange={(enabled) => props.onAutomation('autophagy', enabled)}
          />
        </section>

        <section className="ultrastructure-panel ultrastructure-division-panel">
          <div className="flex items-center justify-between"><p className="eyebrow">CONTROLLED DIVISION</p><Dna size={15} className="text-lime-300" /></div>
          <div className="readiness-grid">
            {(Object.keys(props.readiness.checks) as Array<keyof Readiness['checks']>).map((key) => (
              <div key={key} className={`readiness-check ${props.readiness.checks[key] ? 'readiness-check-ready' : ''}`}>
                <span>{props.readiness.checks[key] ? <Check size={10} /> : null}</span>{checkLabels[key]}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="division-button"
            disabled={!props.readiness.ready || props.stage === 'division'}
            onClick={props.onBeginDivision}
          >
            <Split size={15} />
            {props.stage === 'division' ? `DIVIDING ${Math.round(props.divisionProgress)}%` : 'BEGIN CYTOKINESIS'}
            <span>{props.readiness.costs.energy}A · {props.readiness.costs.glucose}G · {props.readiness.costs.biomass}B</span>
          </button>
        </section>
      </aside>

      {drag && dragMoved && DragIcon && (
        <div className={`organelle-drag-proxy ${dragInfo.className}`} style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <DragIcon size={25} /><span>{dragInfo.name}</span>
        </div>
      )}
    </div>
  );
}

function Bonus({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return <div className="ultrastructure-bonus"><Icon size={11} /><span>{label}</span><b>{value}</b></div>;
}

function AutomationToggle({ label, description, enabled, unlocked, onChange }: {
  label: string;
  description: string;
  enabled: boolean;
  unlocked: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`automation-toggle ${enabled ? 'automation-toggle-active' : ''}`}
      disabled={!unlocked}
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
    >
      <span className="automation-switch"><i /></span>
      <span><b>{label}</b><small>{unlocked ? description : 'Requires organelle level 1.'}</small></span>
    </button>
  );
}
