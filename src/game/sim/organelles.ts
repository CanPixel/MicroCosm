import type { AbilityId, CellFate, MutationId, OrganelleType, Player, Traits } from './types';

export type OrganelleDef = {
  type: OrganelleType;
  name: string;
  short: string;
  role: string;
  science: string;
  cost: { biomass: number; dna: number };
  requires: OrganelleType[];
  // First copy comes from engulfing a free-living ancestor; later copies by fission.
  endosymbiont?: 'proteo' | 'cyano';
  ring: 'core' | 'any' | 'membrane';
  max: number;
  ability?: AbilityId;
  // Visual radius as a fraction of the cell radius.
  size: number;
};

export const ORGANELLES: Record<OrganelleType, OrganelleDef> = {
  nucleus: {
    type: 'nucleus',
    name: 'Nucleus',
    short: 'NUC',
    role: 'Genome command center',
    science: 'Holds the genome behind a double membrane studded with pores. All other systems run on its instructions.',
    cost: { biomass: 0, dna: 0 },
    requires: [],
    ring: 'core',
    max: 1,
    size: 0.27,
  },
  mitochondrion: {
    type: 'mitochondrion',
    name: 'Mitochondrion',
    short: 'MITO',
    role: 'ATP power plant',
    science: 'Pumps protons across folded cristae; ATP synthase, a spinning molecular turbine, turns that gradient into ATP.',
    cost: { biomass: 16, dna: 0 },
    requires: ['mitochondrion'],
    endosymbiont: 'proteo',
    ring: 'any',
    max: 8,
    size: 0.17,
  },
  chloroplast: {
    type: 'chloroplast',
    name: 'Chloroplast',
    short: 'CHLR',
    role: 'Light into glucose',
    science: 'Stacks of thylakoid membranes capture photons and fix CO₂ into sugar. Output scales with local light.',
    cost: { biomass: 16, dna: 0 },
    requires: ['chloroplast'],
    endosymbiont: 'cyano',
    ring: 'any',
    max: 6,
    size: 0.17,
  },
  er: {
    type: 'er',
    name: 'Endoplasmic reticulum',
    short: 'ER',
    role: 'Protein factory',
    science: 'A folded membrane maze studded with ribosomes. Builds the proteins for repair, export and RNA interference.',
    cost: { biomass: 18, dna: 0 },
    requires: [],
    ring: 'any',
    max: 2,
    ability: 'rnai',
    size: 0.2,
  },
  golgi: {
    type: 'golgi',
    name: 'Golgi apparatus',
    short: 'GOLGI',
    role: 'Packaging and export',
    science: 'Stacked cisternae that tag, sort and ship proteins in vesicles. It assembles lysosomes and extrusomes.',
    cost: { biomass: 22, dna: 1 },
    requires: ['er'],
    ring: 'any',
    max: 2,
    size: 0.18,
  },
  lysosome: {
    type: 'lysosome',
    name: 'Lysosome',
    short: 'LYSO',
    role: 'Acid digestion, burst attack',
    science: 'Acidic bubbles of digestive enzymes. They break down prey, recycle misfolded proteins (autophagy) and kill invaders.',
    cost: { biomass: 12, dna: 1 },
    requires: ['golgi'],
    ring: 'any',
    max: 4,
    ability: 'lysosome',
    size: 0.1,
  },
  vacuole: {
    type: 'vacuole',
    name: 'Vacuole',
    short: 'VAC',
    role: 'Storage',
    science: 'A membrane-bound reservoir. Stores glucose and water and buffers the cell against starvation.',
    cost: { biomass: 14, dna: 0 },
    requires: [],
    ring: 'any',
    max: 3,
    size: 0.2,
  },
  cytoskeleton: {
    type: 'cytoskeleton',
    name: 'Cytoskeleton hub',
    short: 'CYTO',
    role: 'Speed, toughness, encystment',
    science: 'A centrosome organizing microtubules and actin. Scaffolds the membrane and powers crawling and cyst formation.',
    cost: { biomass: 14, dna: 0 },
    requires: [],
    ring: 'any',
    max: 2,
    ability: 'encyst',
    size: 0.14,
  },
  flagellum: {
    type: 'flagellum',
    name: 'Flagellum',
    short: 'FLAG',
    role: 'Propulsion',
    science: 'A whip of nine microtubule doublets around two singlets (the 9+2 axoneme), beaten by dynein motors.',
    cost: { biomass: 20, dna: 2 },
    requires: ['cytoskeleton'],
    ring: 'membrane',
    max: 3,
    size: 0.12,
  },
  cilia: {
    type: 'cilia',
    name: 'Cilia field',
    short: 'CILIA',
    role: 'Agility and feeding currents',
    science: 'Thousands of short hairs beating in metachronal waves. They row the cell and sweep food toward it.',
    cost: { biomass: 18, dna: 1 },
    requires: ['cytoskeleton'],
    ring: 'membrane',
    max: 4,
    size: 0.12,
  },
  extrusome: {
    type: 'extrusome',
    name: 'Extrusome battery',
    short: 'EXTR',
    role: 'Toxicyst darts',
    science: 'Docked capsules that fire on command, like the toxicysts Didinium uses to harpoon Paramecium.',
    cost: { biomass: 16, dna: 2 },
    requires: ['golgi'],
    ring: 'membrane',
    max: 3,
    ability: 'toxicyst',
    size: 0.12,
  },
  eyespot: {
    type: 'eyespot',
    name: 'Eyespot',
    short: 'EYE',
    role: 'Sensing and phototaxis',
    science: 'A carotenoid-pigmented stigma shading a light sensor, so the cell can steer toward light.',
    cost: { biomass: 10, dna: 1 },
    requires: ['chloroplast'],
    ring: 'membrane',
    max: 1,
    size: 0.1,
  },
};

export const BUILD_ORDER: OrganelleType[] = [
  'mitochondrion',
  'chloroplast',
  'er',
  'golgi',
  'lysosome',
  'vacuole',
  'cytoskeleton',
  'flagellum',
  'cilia',
  'extrusome',
  'eyespot',
];

export type Slot = { id: number; x: number; y: number; ring: 'core' | 'inner' | 'outer' };

// Normalized slot positions in the prime cell's local frame (+x is the front).
export const SLOTS: Slot[] = (() => {
  const slots: Slot[] = [{ id: 0, x: 0, y: 0, ring: 'core' }];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    slots.push({ id: slots.length, x: Math.cos(a) * 0.5, y: Math.sin(a) * 0.5, ring: 'inner' });
  }
  // Outer ring opens front-first, alternating sides, as the cell grows.
  const order = [0, 5, 1, 9, 4, 6, 2, 8, 3, 7];
  for (const k of order) {
    const a = (k / 10) * Math.PI * 2;
    slots.push({ id: slots.length, x: Math.cos(a) * 0.8, y: Math.sin(a) * 0.8, ring: 'outer' });
  }
  return slots;
})();

export const SLOT_NEIGHBORS: number[][] = SLOTS.map((a) =>
  SLOTS.filter((b) => b.id !== a.id && Math.hypot(a.x - b.x, a.y - b.y) < 0.52).map((b) => b.id),
);

export function availableSlotCount(primeBiomass: number): number {
  const outer = Math.max(2, Math.min(10, 2 + Math.floor((primeBiomass - 40) / 13)));
  return 7 + outer;
}

export function slotAccepts(slotId: number, type: OrganelleType): boolean {
  const slot = SLOTS[slotId];
  if (!slot) return false;
  const ring = ORGANELLES[type].ring;
  if (slot.ring === 'core') return type === 'nucleus';
  if (type === 'nucleus') return false;
  if (ring === 'membrane') return slot.ring === 'outer';
  return true;
}

export function countOrganelles(player: Player, type: OrganelleType, includeMisfolded = false): number {
  let n = 0;
  for (const o of player.organelles) if (o.type === type && (includeMisfolded || !o.misfolded)) n++;
  return n;
}

export function firstFreeSlot(player: Player, type: OrganelleType): number | null {
  const limit = player.traits.slots;
  const used = new Set(player.organelles.map((o) => o.slot));
  // Prefer the outer ring for membrane-hungry systems, inner otherwise.
  const preferOuter = ORGANELLES[type].ring === 'membrane' || type === 'chloroplast';
  const candidates = SLOTS.slice(0, limit).filter((s) => slotAccepts(s.id, type) && !used.has(s.id));
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const ra = a.ring === 'outer' ? 1 : 0;
    const rb = b.ring === 'outer' ? 1 : 0;
    return preferOuter ? rb - ra : ra - rb;
  });
  return candidates[0].id;
}

export type BuildCheck = { ok: boolean; reason: string; cost: { biomass: number; dna: number } };

export function buildCost(player: Player, type: OrganelleType) {
  const def = ORGANELLES[type];
  const owned = countOrganelles(player, type, true);
  const scale = 1 + owned * 0.35;
  const discount = Math.min(0.45, player.traits.buildDiscount);
  return {
    biomass: Math.round(def.cost.biomass * scale * (1 - discount)),
    dna: def.cost.dna + Math.floor(owned / 2),
  };
}

export function canBuild(player: Player, type: OrganelleType, storedBiomass: number): BuildCheck {
  const def = ORGANELLES[type];
  const cost = buildCost(player, type);
  if (type === 'nucleus') return { ok: false, reason: 'One genome per cell', cost };
  const owned = countOrganelles(player, type, true);
  if (owned >= def.max) return { ok: false, reason: 'At capacity', cost };
  for (const req of def.requires) {
    if (countOrganelles(player, req) === 0) {
      if (def.endosymbiont && req === type) {
        return {
          ok: false,
          reason: def.endosymbiont === 'proteo' ? 'Engulf an α-proteobacterium first' : 'Engulf a cyanobacterium first',
          cost,
        };
      }
      return { ok: false, reason: `Needs ${ORGANELLES[req].name}`, cost };
    }
  }
  if (firstFreeSlot(player, type) === null) return { ok: false, reason: 'No free slot. Grow larger', cost };
  // Building must leave enough cytoplasm to stay viable.
  if (storedBiomass < cost.biomass) return { ok: false, reason: `Needs ${cost.biomass} spare biomass`, cost };
  if (player.dna < cost.dna) return { ok: false, reason: `Needs ${cost.dna} DNA`, cost };
  return { ok: true, reason: '', cost };
}

export type FateDef = { id: CellFate; name: string; role: string; science: string; color: string };

export const FATES: Record<Exclude<CellFate, 'prime'>, FateDef> = {
  photocyte: {
    id: 'photocyte',
    name: 'Photocyte',
    role: '+Glucose from light',
    science: 'A daughter packed with chloroplasts, like the green cells of Volvox.',
    color: '#7be04a',
  },
  ciliocyte: {
    id: 'ciliocyte',
    name: 'Ciliocyte',
    role: '+Speed and agility',
    science: 'A motor cell fringed with cilia that rows the colony along.',
    color: '#4fd8ff',
  },
  phagocyte: {
    id: 'phagocyte',
    name: 'Phagocyte',
    role: 'Engulfs larger prey, digests faster',
    science: 'A hunter-gatherer cell specialized for phagocytosis, the ancestor of macrophages.',
    color: '#ffb43d',
  },
  cnidocyte: {
    id: 'cnidocyte',
    name: 'Cnidocyte',
    role: 'Stings attackers, +burst damage',
    science: 'A stinging cell loaded with nematocysts, borrowed from the Hydra playbook.',
    color: '#ff4f8b',
  },
  germ: {
    id: 'germ',
    name: 'Germ cell',
    role: '+DNA over time, cheaper builds',
    science: "A reproductive cell that keeps the lineage's genome pristine.",
    color: '#b07bff',
  },
};

export type MutationDef = { id: MutationId; name: string; effect: string; science: string; maxStacks: number };

export const MUTATIONS: Record<MutationId, MutationDef> = {
  pellicle: {
    id: 'pellicle',
    name: 'Pellicle',
    effect: '+25% max integrity, -6% damage',
    science: "A protein lattice under the membrane, like a ciliate's armor.",
    maxStacks: 3,
  },
  contractileVacuole: {
    id: 'contractileVacuole',
    name: 'Contractile vacuole',
    effect: '+0.8 integrity regen/s',
    science: 'A pump that bails out excess water so the cell never bursts.',
    maxStacks: 2,
  },
  cytostome: {
    id: 'cytostome',
    name: 'Cytostome',
    effect: 'Engulf 10% larger prey',
    science: 'A permanent "cell mouth" that widens phagocytosis.',
    maxStacks: 2,
  },
  cristae: {
    id: 'cristae',
    name: 'Deep cristae',
    effect: '+35% ATP per mitochondrion',
    science: 'More inner-membrane folds mean more ATP synthase turbines.',
    maxStacks: 2,
  },
  phototaxis: {
    id: 'phototaxis',
    name: 'Light-harvesting antennae',
    effect: '+45% photosynthesis',
    science: 'Extra pigment complexes funnel more photons to the reaction centers.',
    maxStacks: 2,
  },
  interferon: {
    id: 'interferon',
    name: 'Antiviral cascade',
    effect: 'Viruses replicate 30% slower',
    science: 'Innate sensors detect viral RNA and throttle the hijacked machinery.',
    maxStacks: 2,
  },
  chaperonin: {
    id: 'chaperonin',
    name: 'Chaperonins',
    effect: 'Prions misfold half as often; organelles refold slowly',
    science: 'HSP60 barrels give misfolded proteins a private chamber to refold.',
    maxStacks: 1,
  },
  dsup: {
    id: 'dsup',
    name: 'Dsup gene',
    effect: '-12% damage taken',
    science: 'The tardigrade damage-suppressor protein that shields DNA.',
    maxStacks: 2,
  },
  glycogen: {
    id: 'glycogen',
    name: 'Glycogen granules',
    effect: '+50% glucose storage, +15 ATP cap',
    science: 'Branched glucose polymers packed for lean times.',
    maxStacks: 2,
  },
  hydrolase: {
    id: 'hydrolase',
    name: 'Hydrolases',
    effect: '+40% digestion speed',
    science: 'Sharper digestive enzymes inside every food vacuole.',
    maxStacks: 2,
  },
  flagellarMotor: {
    id: 'flagellarMotor',
    name: 'Turbo dynein',
    effect: '+12% speed',
    science: 'Faster motor proteins along every microtubule.',
    maxStacks: 2,
  },
  cadherin: {
    id: 'cadherin',
    name: 'Cadherin junctions',
    effect: 'Colony cells take 25% less damage',
    science: 'Calcium-dependent adhesion proteins, the glue of animal tissue.',
    maxStacks: 1,
  },
  bioluminescence: {
    id: 'bioluminescence',
    name: 'Bioluminescence',
    effect: 'Glow reveals hidden agents nearby',
    science: 'Luciferase oxidizes luciferin to emit cold light, as dinoflagellates do.',
    maxStacks: 1,
  },
  venom: {
    id: 'venom',
    name: 'Toxicyst venom',
    effect: 'Darts +30% damage, +0.8s stun',
    science: 'Paralytic toxins packed into each extrusome capsule.',
    maxStacks: 2,
  },
  endosymbiontPact: {
    id: 'endosymbiontPact',
    name: 'Endosymbiont pact',
    effect: 'Intracellular bacteria make ATP instead of stealing',
    science: 'Parasite becomes partner, the same deal that made mitochondria.',
    maxStacks: 1,
  },
  pseudopodSurge: {
    id: 'pseudopodSurge',
    name: 'Pseudopod surge',
    effect: 'Dash recharges 30% faster',
    science: 'Explosive actin polymerization at the leading edge.',
    maxStacks: 2,
  },
  hgt: {
    id: 'hgt',
    name: 'Horizontal gene transfer',
    effect: 'Copy a random trait, +3 DNA',
    science: 'Genes jump between unrelated organisms. Bacteria do it constantly.',
    maxStacks: 3,
  },
  quorum: {
    id: 'quorum',
    name: 'Quorum sensing',
    effect: '+DNA trickle, +5% build discount',
    science: 'Chemical chatter that lets cells act together.',
    maxStacks: 2,
  },
};

export const MUTATION_POOL = Object.keys(MUTATIONS) as MutationId[];

export const ABILITY_INFO: Record<AbilityId, { name: string; atp: number; cooldown: number; key: string; description: string }> = {
  dash: {
    name: 'Pseudopod dash',
    atp: 9,
    cooldown: 2.4,
    key: 'SPACE',
    description: 'Burst of speed. Shakes off attached viruses and breaks grips.',
  },
  lysosome: {
    name: 'Lysosome burst',
    atp: 24,
    cooldown: 7,
    key: '1',
    description: 'Acid shockwave: damages hostiles, clears agents, recycles misfolded organelles.',
  },
  toxicyst: {
    name: 'Toxicyst volley',
    atp: 12,
    cooldown: 2.6,
    key: '2',
    description: 'Fires harpoon darts toward your aim that damage and stun.',
  },
  rnai: {
    name: 'RNA interference',
    atp: 22,
    cooldown: 10,
    key: '3',
    description: 'Shreds viral RNA: cuts viral load, excises a provirus, strips viroids.',
  },
  encyst: {
    name: 'Encyst',
    atp: 18,
    cooldown: 16,
    key: '4',
    description: 'Harden into a cyst: invulnerable and immobile for 3.5s. Breaks any grip.',
  },
  virophage: {
    name: 'Release virophages',
    atp: 6,
    cooldown: 4,
    key: '5',
    description: 'Releases your stored virophage swarm against giant viruses.',
  },
};

export function baseTraits(): Traits {
  return {
    atpCap: 100,
    glucoseCap: 60,
    glycolysis: 0.9,
    mitoRate: 0,
    atpPerGlucoseMito: 12,
    photoRate: 0,
    speed: 205,
    accel: 6,
    maxIntegrity: 100,
    regen: 0.5,
    digestion: 1,
    vacuoleSlots: 2,
    engulfRatio: 0.8,
    viralResistance: 0,
    prionResistance: 0,
    damageReduction: 0,
    dashCooldown: 2.4,
    lysoRadius: 0,
    lysoDamage: 0,
    dartCount: 0,
    dartDamage: 0,
    dartStun: 0,
    senseRadius: 1100,
    buildDiscount: 0,
    maxCells: 6,
    glow: 0,
    dnaRate: 0,
    slots: 9,
    abilities: ['dash'],
  };
}

const stacks = (player: Player, id: MutationId) => player.mutations.find((m) => m.id === id)?.stacks ?? 0;
export const mutationStacks = stacks;

// Recompute every derived stat from organelles, placement synergies, colony
// fates and mutations. Cheap enough to run whenever anything changes.
export function computeTraits(player: Player): Traits {
  const t = baseTraits();
  const prime = player.units[0];
  t.slots = availableSlotCount(prime ? prime.biomass : 40);

  const bySlot = new Map<number, OrganelleType>();
  for (const o of player.organelles) if (!o.misfolded) bySlot.set(o.slot, o.type);
  const adjacent = (slot: number, type: OrganelleType) => SLOT_NEIGHBORS[slot]?.some((n) => bySlot.get(n) === type) ?? false;

  let speedMult = 1;
  let flagella = 0;
  for (const o of player.organelles) {
    if (o.misfolded) continue;
    const outer = SLOTS[o.slot]?.ring === 'outer';
    switch (o.type) {
      case 'mitochondrion':
        t.mitoRate += 0.5;
        t.atpCap += 12;
        if (adjacent(o.slot, 'mitochondrion')) t.mitoRate += 0.1;
        if (adjacent(o.slot, 'flagellum') || adjacent(o.slot, 'cilia') || adjacent(o.slot, 'cytoskeleton')) speedMult += 0.05;
        break;
      case 'chloroplast':
        t.photoRate += outer ? 0.75 : 0.5;
        break;
      case 'er':
        t.regen += 0.4;
        t.buildDiscount += 0.05;
        if (adjacent(o.slot, 'nucleus')) t.buildDiscount += 0.1;
        break;
      case 'golgi':
        t.digestion += 0.25;
        if (adjacent(o.slot, 'er')) {
          t.lysoDamage += 8;
          t.dartDamage += 3;
        }
        break;
      case 'lysosome':
        t.digestion += 0.3;
        t.lysoRadius = t.lysoRadius === 0 ? 150 : t.lysoRadius + 26;
        t.lysoDamage += 20;
        if (adjacent(o.slot, 'golgi')) t.digestion += 0.2;
        break;
      case 'vacuole':
        t.glucoseCap += 40;
        t.atpCap += 10;
        t.vacuoleSlots += 1;
        if (adjacent(o.slot, 'chloroplast')) t.glucoseCap += 15;
        break;
      case 'cytoskeleton':
        speedMult += 0.1;
        t.maxIntegrity += 15;
        t.dashCooldown -= 0.35;
        break;
      case 'flagellum':
        flagella++;
        speedMult += flagella === 1 ? 0.24 : 0.12;
        if (adjacent(o.slot, 'eyespot')) speedMult += 0.06;
        break;
      case 'cilia':
        speedMult += 0.08;
        t.accel += 2.5;
        break;
      case 'extrusome':
        t.dartCount += t.dartCount === 0 ? 3 : 2;
        t.dartDamage += 10;
        t.dartStun = Math.max(t.dartStun, 0.9);
        break;
      case 'eyespot':
        t.senseRadius += 500;
        speedMult += 0.04;
        break;
      default:
        break;
    }
  }

  for (const unit of player.units.slice(1)) {
    if (unit.dead) continue;
    switch (unit.fate) {
      case 'photocyte':
        t.photoRate += 0.45;
        break;
      case 'ciliocyte':
        speedMult += 0.09;
        t.accel += 1.5;
        break;
      case 'phagocyte':
        t.digestion += 0.3;
        t.vacuoleSlots += 1;
        break;
      case 'cnidocyte':
        t.lysoDamage += 6;
        break;
      case 'germ':
        t.dnaRate += 0.04;
        t.buildDiscount += 0.04;
        break;
      default:
        break;
    }
  }

  // Mutations.
  t.maxIntegrity *= 1 + 0.25 * stacks(player, 'pellicle');
  t.damageReduction += 0.06 * stacks(player, 'pellicle') + 0.12 * stacks(player, 'dsup');
  t.regen += 0.8 * stacks(player, 'contractileVacuole');
  t.engulfRatio += 0.08 * stacks(player, 'cytostome');
  t.atpPerGlucoseMito *= 1 + 0.35 * stacks(player, 'cristae');
  t.photoRate *= 1 + 0.45 * stacks(player, 'phototaxis');
  t.viralResistance += 0.3 * stacks(player, 'interferon');
  t.prionResistance += 0.5 * stacks(player, 'chaperonin');
  t.glucoseCap *= 1 + 0.5 * stacks(player, 'glycogen');
  t.atpCap += 15 * stacks(player, 'glycogen');
  t.digestion *= 1 + 0.4 * stacks(player, 'hydrolase');
  speedMult += 0.12 * stacks(player, 'flagellarMotor');
  t.glow = stacks(player, 'bioluminescence') > 0 ? 300 : 0;
  t.dartDamage *= 1 + 0.3 * stacks(player, 'venom');
  t.dartStun += 0.8 * stacks(player, 'venom');
  t.dashCooldown *= Math.pow(0.7, stacks(player, 'pseudopodSurge'));
  t.dnaRate += 0.03 * stacks(player, 'quorum');
  t.buildDiscount += 0.05 * stacks(player, 'quorum');

  t.speed *= speedMult;
  t.dashCooldown = Math.max(0.8, t.dashCooldown);
  t.damageReduction = Math.min(0.6, t.damageReduction);
  t.viralResistance = Math.min(0.75, t.viralResistance);
  t.prionResistance = Math.min(0.9, t.prionResistance);

  const abilities: AbilityId[] = ['dash'];
  if (countOrganelles(player, 'lysosome') > 0) abilities.push('lysosome');
  if (countOrganelles(player, 'extrusome') > 0) abilities.push('toxicyst');
  if (countOrganelles(player, 'er') > 0) abilities.push('rnai');
  if (countOrganelles(player, 'cytoskeleton') > 0) abilities.push('encyst');
  if (player.storedVirophages > 0) abilities.push('virophage');
  t.abilities = abilities;
  return t;
}
