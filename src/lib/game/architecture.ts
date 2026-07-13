import type {
  ArchitectureBonuses,
  MetabolicStance,
  OrganellePlacement,
  OrganelleType,
} from './types';

export type ArchitectureSlot = {
  id: number;
  x: number;
  y: number;
  zone: 'genome' | 'metabolic' | 'membrane';
  label: string;
};

export const CELL_ARCHITECTURE_SLOTS: ArchitectureSlot[] = [
  { id: 0, x: 0, y: 0, zone: 'genome', label: 'Genome core' },
  { id: 1, x: 0, y: -0.34, zone: 'metabolic', label: 'Metabolic north' },
  { id: 2, x: 0.34, y: 0, zone: 'metabolic', label: 'Metabolic east' },
  { id: 3, x: 0, y: 0.34, zone: 'metabolic', label: 'Metabolic south' },
  { id: 4, x: -0.34, y: 0, zone: 'metabolic', label: 'Metabolic west' },
  { id: 5, x: -0.48, y: -0.48, zone: 'membrane', label: 'Membrane northwest' },
  { id: 6, x: 0.48, y: -0.48, zone: 'membrane', label: 'Membrane northeast' },
  { id: 7, x: 0.48, y: 0.48, zone: 'membrane', label: 'Membrane southeast' },
  { id: 8, x: -0.48, y: 0.48, zone: 'membrane', label: 'Membrane southwest' },
];

const slotById = new Map(CELL_ARCHITECTURE_SLOTS.map((slot) => [slot.id, slot]));

export const STANCE_TRAITS: Record<MetabolicStance, {
  label: string;
  description: string;
  speed: number;
  uptake: number;
  drain: number;
  damage: number;
  synthesis: number;
}> = {
  forage: {
    label: 'Forage flux',
    description: 'Open transport channels. Faster movement and sugar uptake, but a leakier membrane.',
    speed: 1.16,
    uptake: 1.25,
    drain: 1.12,
    damage: 1.1,
    synthesis: 0.82,
  },
  homeostasis: {
    label: 'Homeostasis',
    description: 'Conserve ATP and reinforce the membrane. Slower, safer, and metabolically steady.',
    speed: 0.86,
    uptake: 0.92,
    drain: 0.78,
    damage: 0.76,
    synthesis: 0.9,
  },
  replicate: {
    label: 'Replication',
    description: 'Route ATP and glucose into new cell material. High biomass output with reduced mobility.',
    speed: 0.7,
    uptake: 0.88,
    drain: 1.14,
    damage: 1,
    synthesis: 1.72,
  },
};

export function architectureBonuses(architecture: OrganellePlacement[]): ArchitectureBonuses {
  let score = 8;
  let atpConversion = 1;
  let glucoseUptake = 1;
  let movementSpeed = 1;
  let damageReduction = 0;
  let viralResistance = 0;
  let biomassSynthesis = 1;
  let lysosomeRadius = 260;

  const nuclei = architecture.filter((unit) => unit.type === 'nucleus');
  const types = new Set(architecture.map((unit) => unit.type));

  for (const unit of architecture) {
    const slot = slotById.get(unit.slot);
    if (!slot) continue;

    if (unit.type === 'nucleus') {
      if (slot.zone === 'genome') {
        score += 28;
        viralResistance += 0.22;
        damageReduction += 0.07;
      } else if (slot.zone === 'metabolic') {
        score += 10;
        viralResistance += 0.08;
      } else {
        score += 2;
      }
    }

    if (unit.type === 'mitochondrion') {
      if (slot.zone === 'metabolic') {
        score += 13;
        atpConversion += 0.13;
      } else if (slot.zone === 'membrane') {
        score += 9;
        glucoseUptake += 0.08;
        movementSpeed += 0.035;
      } else {
        score += 4;
        atpConversion += 0.04;
      }
    }

    if (unit.type === 'golgi') {
      const nearNucleus = nuclei.some((nucleus) => {
        const nucleusSlot = slotById.get(nucleus.slot);
        if (!nucleusSlot) return false;
        return Math.hypot(slot.x - nucleusSlot.x, slot.y - nucleusSlot.y) <= 0.7;
      });
      if (nearNucleus) {
        score += 12;
        biomassSynthesis += 0.14;
      } else {
        score += 4;
      }
      if (slot.zone === 'membrane') {
        score += 5;
        lysosomeRadius += 24;
      }
    }
  }

  if (types.size === 3) score += 12;

  return {
    score: Math.min(100, Math.round(score)),
    atpConversion,
    glucoseUptake,
    movementSpeed,
    damageReduction: Math.min(0.42, damageReduction),
    viralResistance: Math.min(0.55, viralResistance),
    biomassSynthesis,
    lysosomeRadius,
  };
}

export function firstOpenSlot(architecture: OrganellePlacement[], type: OrganelleType): number | null {
  const occupied = new Set(architecture.map((unit) => unit.slot));
  const preference = type === 'nucleus'
    ? [0, 1, 2, 3, 4, 5, 6, 7, 8]
    : type === 'mitochondrion'
      ? [1, 2, 3, 4, 5, 6, 7, 8, 0]
      : [2, 4, 1, 3, 5, 6, 7, 8, 0];
  return preference.find((slot) => !occupied.has(slot)) ?? null;
}
