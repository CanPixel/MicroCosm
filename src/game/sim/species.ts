import type { Behavior, BiomeId, HostClass, InfectionStyle, OrganelleType, SpeciesGroup, SpeciesId } from './types';

export type SpeciesDef = {
  id: SpeciesId;
  name: string;
  latin: string;
  group: SpeciesGroup;
  // Position on the design bible's "aliveness" spectrum (agents only, 0..5).
  aliveness: number;
  radius: [number, number];
  speed: number;
  turn: number;
  // Hit points per unit of radius.
  hpPerRadius: number;
  behavior: Behavior;
  edible: boolean;
  // Hidden agents are faint under brightfield and revealed by darkfield/fluorescence.
  hidden?: boolean;
  invulnerable?: boolean;
  // Solid organisms block movement instead of being passable.
  solid?: boolean;
  contactDamage: number;
  // Yields when fully digested, scaled by (radius / mean radius), or per unit
  // of radius for large organisms flagged `perRadius`.
  yields: { biomass: number; glucose: number; dna: number; lipid: number };
  perRadius?: boolean;
  sense: number;
  hostClass?: HostClass[];
  infects?: HostClass[];
  infection?: InfectionStyle;
  endosymbiont?: OrganelleType;
  carrierChance?: number;
  biomes: Partial<Record<BiomeId, number>>;
  group_size: [number, number];
  minPressure: number;
  threat: 0 | 1 | 2 | 3;
  codex: { size: string; fact: string; role: string };
};

const S = (def: SpeciesDef) => def;

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  glucose: S({
    id: 'glucose', name: 'Glucose', latin: 'C₆H₁₂O₆', group: 'resource', aliveness: -1,
    radius: [3.4, 6], speed: 0, turn: 0, hpPerRadius: 1, behavior: 'drift', edible: true,
    contactDamage: 0, yields: { biomass: 0.25, glucose: 5, dna: 0, lipid: 0 }, sense: 0,
    biomes: {}, group_size: [4, 10], minPressure: 0, threat: 0,
    codex: {
      size: '~1 nm molecule (shown as crystals)',
      fact: 'A six-carbon ring sugar. Glycolysis splits one for 2 ATP; a mitochondrion squeezes out roughly 30 more.',
      role: 'Fuel. Glucose becomes ATP, and ATP powers everything you do.',
    },
  }),
  debris: S({
    id: 'debris', name: 'Cell debris', latin: 'lysate', group: 'resource', aliveness: -1,
    radius: [3.5, 7.5], speed: 0, turn: 0, hpPerRadius: 1, behavior: 'drift', edible: true,
    contactDamage: 0, yields: { biomass: 3.2, glucose: 0.6, dna: 0, lipid: 0 }, sense: 0,
    biomes: {}, group_size: [1, 1], minPressure: 0, threat: 0,
    codex: {
      size: 'fragments',
      fact: 'Proteins, lipids and nucleic acids spilled when a cell bursts. Nothing in the microcosmos goes to waste.',
      role: 'Free biomass, the building material for organelles and growth.',
    },
  }),
  dna: S({
    id: 'dna', name: 'DNA fragment', latin: 'extracellular DNA', group: 'resource', aliveness: -1,
    radius: [5, 7], speed: 0, turn: 0, hpPerRadius: 1, behavior: 'drift', edible: true,
    contactDamage: 0, yields: { biomass: 0.3, glucose: 0, dna: 0.6, lipid: 0 }, sense: 0,
    biomes: { bloom: 0.6, biofilm: 0.15 }, group_size: [1, 3], minPressure: 0, threat: 0,
    codex: {
      size: 'nanometres wide, microns long',
      fact: 'Free DNA is everywhere in pond water. Many bacteria scavenge it by natural transformation, absorbing new genes.',
      role: 'Nucleotides fuel mutations and RNA interference.',
    },
  }),
  lipid: S({
    id: 'lipid', name: 'Lipid droplet', latin: 'phospholipid vesicle', group: 'resource', aliveness: -1,
    radius: [4, 7], speed: 0, turn: 0, hpPerRadius: 1, behavior: 'drift', edible: true,
    contactDamage: 0, yields: { biomass: 0.5, glucose: 1, dna: 0, lipid: 12 }, sense: 0,
    biomes: { shallows: 0.3, abyss: 0.4, biofilm: 0.2 }, group_size: [1, 2], minPressure: 0, threat: 0,
    codex: {
      size: '1–5 μm',
      fact: 'Phospholipids self-assemble into bilayers, the bricks of every membrane on Earth.',
      role: 'Patches tears in your membrane.',
    },
  }),

  cocci: S({
    id: 'cocci', name: 'Coccus', latin: 'Micrococcus', group: 'bacteria', aliveness: 6,
    radius: [4, 5.5], speed: 12, turn: 2, hpPerRadius: 0.8, behavior: 'drift', edible: true,
    contactDamage: 0, yields: { biomass: 1.6, glucose: 0.8, dna: 0, lipid: 0 }, sense: 0,
    hostClass: ['bacteria'], carrierChance: 0,
    biomes: { biofilm: 3, shallows: 1.4, bloom: 1, abyss: 0.5, rift: 0.6 }, group_size: [2, 5], minPressure: 0, threat: 0,
    codex: {
      size: '~1 μm',
      fact: 'Spherical bacteria, alone, in pairs, chains (strepto-) or grape-like clusters (staphylo-).',
      role: 'A dependable snack for a young cell.',
    },
  }),
  bacillus: S({
    id: 'bacillus', name: 'Bacillus', latin: 'Bacillus subtilis', group: 'bacteria', aliveness: 6,
    radius: [6, 8], speed: 70, turn: 2.2, hpPerRadius: 0.9, behavior: 'swim', edible: true,
    contactDamage: 0, yields: { biomass: 2.6, glucose: 1, dna: 0.1, lipid: 0 }, sense: 120,
    hostClass: ['bacteria'],
    biomes: { biofilm: 3, shallows: 2, bloom: 1, rift: 0.6 }, group_size: [1, 3], minPressure: 0, threat: 0,
    codex: {
      size: '2–4 μm',
      fact: 'Rod-shaped and driven by flagella: rotary protein motors that spin hundreds of times per second.',
      role: 'Fast food. It flees, so cut it off.',
    },
  }),
  spirillum: S({
    id: 'spirillum', name: 'Spirillum', latin: 'Spirillum volutans', group: 'bacteria', aliveness: 6,
    radius: [7, 10], speed: 125, turn: 3, hpPerRadius: 0.8, behavior: 'corkscrew', edible: true,
    contactDamage: 0, yields: { biomass: 3, glucose: 1, dna: 0.1, lipid: 0 }, sense: 150,
    hostClass: ['bacteria'],
    biomes: { shallows: 1, biofilm: 1.5, bloom: 1 }, group_size: [1, 2], minPressure: 0, threat: 0,
    codex: {
      size: 'up to 60 μm long',
      fact: 'A corkscrew bacterium that drills through viscous water with tufts of flagella at both ends.',
      role: 'Quick and twisting. Worth the chase.',
    },
  }),
  proteo: S({
    id: 'proteo', name: 'α-proteobacterium', latin: 'Rickettsiales ancestor', group: 'bacteria', aliveness: 6,
    radius: [6, 8], speed: 55, turn: 2, hpPerRadius: 0.9, behavior: 'swim', edible: true,
    contactDamage: 0, yields: { biomass: 3, glucose: 1.5, dna: 0.2, lipid: 0 }, sense: 110,
    hostClass: ['bacteria'], endosymbiont: 'mitochondrion',
    biomes: { shallows: 1.6, biofilm: 1.3, bloom: 0.4, abyss: 0.4 }, group_size: [1, 3], minPressure: 0, threat: 0,
    codex: {
      size: '~1–2 μm',
      fact: 'About 2 billion years ago, a cell swallowed one of these and never digested it. It became the mitochondrion.',
      role: 'Engulf one to acquire mitochondria by endosymbiosis.',
    },
  }),
  cyano: S({
    id: 'cyano', name: 'Cyanobacterium', latin: 'Synechococcus', group: 'bacteria', aliveness: 6,
    radius: [7, 10], speed: 14, turn: 1, hpPerRadius: 0.9, behavior: 'drift', edible: true,
    contactDamage: 0, yields: { biomass: 3, glucose: 3, dna: 0.2, lipid: 0 }, sense: 0,
    hostClass: ['bacteria'], endosymbiont: 'chloroplast',
    biomes: { shallows: 2.6, biofilm: 0.5 }, group_size: [1, 2], minPressure: 0, threat: 0,
    codex: {
      size: '1–10 μm',
      fact: 'Cyanobacteria invented oxygen-producing photosynthesis. An engulfed one became the chloroplast of every plant.',
      role: 'Engulf one to acquire chloroplasts. Light becomes glucose.',
    },
  }),

  diatom: S({
    id: 'diatom', name: 'Diatom', latin: 'Navicula', group: 'protist', aliveness: 6,
    radius: [12, 20], speed: 18, turn: 0.6, hpPerRadius: 2.4, behavior: 'drift', edible: true,
    contactDamage: 0, yields: { biomass: 7, glucose: 6, dna: 0.3, lipid: 3 }, sense: 0,
    hostClass: ['eukaryote', 'plant'],
    biomes: { shallows: 2.2, biofilm: 1 }, group_size: [1, 2], minPressure: 0, threat: 0,
    codex: {
      size: '2–200 μm',
      fact: 'Algae living in glass houses of silica called frustules. Diatoms make roughly a fifth of the oxygen you breathe.',
      role: 'Slow to digest behind its glass, but rich.',
    },
  }),
  euglena: S({
    id: 'euglena', name: 'Euglena', latin: 'Euglena gracilis', group: 'protist', aliveness: 6,
    radius: [13, 18], speed: 80, turn: 2, hpPerRadius: 1.6, behavior: 'swim', edible: true,
    contactDamage: 0, yields: { biomass: 9, glucose: 4, dna: 0.4, lipid: 0 }, sense: 160,
    hostClass: ['eukaryote', 'plant'], carrierChance: 0.12,
    biomes: { shallows: 2.4, bloom: 0.5, biofilm: 0.5 }, group_size: [1, 2], minPressure: 0, threat: 0,
    codex: {
      size: '15–500 μm',
      fact: 'Part plant, part animal: it photosynthesizes but also swims and eats. A red eyespot shades its light sensor to steer toward the sun.',
      role: 'Nutritious prey. Fluorescence shows whether it carries parasites.',
    },
  }),
  paramecium: S({
    id: 'paramecium', name: 'Paramecium', latin: 'Paramecium caudatum', group: 'protist', aliveness: 6,
    radius: [20, 28], speed: 105, turn: 1.8, hpPerRadius: 1.5, behavior: 'swim', edible: true,
    contactDamage: 0, yields: { biomass: 16, glucose: 5, dna: 0.6, lipid: 2 }, sense: 200,
    hostClass: ['eukaryote'], carrierChance: 0.18,
    biomes: { shallows: 1.5, biofilm: 1.5, bloom: 1 }, group_size: [1, 2], minPressure: 0.1, threat: 1,
    codex: {
      size: '50–330 μm',
      fact: 'Covered in thousands of cilia beating in waves. Under attack it fires trichocysts: spring-loaded protein harpoons.',
      role: 'Big prey that fights back with darts. Corner it.',
    },
  }),
  didinium: S({
    id: 'didinium', name: 'Didinium', latin: 'Didinium nasutum', group: 'protist', aliveness: 6,
    radius: [14, 18], speed: 175, turn: 3, hpPerRadius: 1.6, behavior: 'hunter', edible: true,
    contactDamage: 9, yields: { biomass: 10, glucose: 3, dna: 0.5, lipid: 0 }, sense: 340,
    hostClass: ['eukaryote'],
    biomes: { biofilm: 1.1, shallows: 0.7, bloom: 1 }, group_size: [1, 2], minPressure: 0.35, threat: 2,
    codex: {
      size: '50–150 μm',
      fact: 'A barrel-shaped ciliate that hunts Paramecium, prey bigger than itself, harpooning it with toxicysts and swallowing it whole.',
      role: 'Charges in bursts. Sidestep the lunge, then eat it.',
    },
  }),
  lacrymaria: S({
    id: 'lacrymaria', name: 'Lacrymaria', latin: 'Lacrymaria olor', group: 'protist', aliveness: 6,
    radius: [18, 24], speed: 60, turn: 1.6, hpPerRadius: 1.7, behavior: 'neck', edible: true,
    contactDamage: 6, yields: { biomass: 18, glucose: 4, dna: 0.8, lipid: 0 }, sense: 260,
    hostClass: ['eukaryote'],
    biomes: { abyss: 1.4, biofilm: 1, bloom: 0.8, shallows: 0.25 }, group_size: [1, 1], minPressure: 0.45, threat: 2,
    codex: {
      size: '~100 μm body',
      fact: '"Tear of the swan". Its neck can stretch to many times its body length, striking prey with a mouth at the tip.',
      role: 'Watch the neck coil, then dodge the strike.',
    },
  }),
  amoeba: S({
    id: 'amoeba', name: 'Amoeba proteus', latin: 'Amoeba proteus', group: 'protist', aliveness: 6,
    radius: [45, 110], speed: 30, turn: 0.8, hpPerRadius: 5.5, behavior: 'engulfer', edible: true,
    perRadius: true,
    contactDamage: 4, yields: { biomass: 0.62, glucose: 0.2, dna: 0.02, lipid: 0.08 }, sense: 420,
    hostClass: ['eukaryote', 'amoeboid'],
    biomes: { abyss: 2, biofilm: 1, bloom: 0.5, shallows: 0.15 }, group_size: [1, 1], minPressure: 0.4, threat: 3,
    codex: {
      size: '250–750 μm',
      fact: 'Crawls on pseudopods, "false feet" of streaming cytoplasm, and engulfs prey whole by phagocytosis. Just like you.',
      role: 'A bigger version of you. Flee, or grow until you can eat it.',
    },
  }),
  testate: S({
    id: 'testate', name: 'Testate amoeba', latin: 'Arcella vulgaris', group: 'protist', aliveness: 6,
    radius: [26, 40], speed: 24, turn: 0.9, hpPerRadius: 2.4, behavior: 'testate', edible: true,
    contactDamage: 10, yields: { biomass: 14, glucose: 3, dna: 0.6, lipid: 2 }, sense: 240,
    hostClass: ['eukaryote', 'amoeboid'],
    biomes: { biofilm: 1.8, abyss: 1.1 }, group_size: [1, 1], minPressure: 0.25, threat: 1,
    codex: {
      size: '30–250 μm',
      fact: 'Arcella secretes a domed shell, the test, and reaches out through one opening. Its machinery stays armored inside.',
      role: 'The shell is immune. Strike the aperture where the pseudopods emerge.',
    },
  }),
  stentor: S({
    id: 'stentor', name: 'Stentor', latin: 'Stentor coeruleus', group: 'protist', aliveness: 6,
    radius: [60, 88], speed: 0, turn: 0.3, hpPerRadius: 4, behavior: 'vortex', edible: true,
    perRadius: true,
    contactDamage: 4, yields: { biomass: 0.6, glucose: 0.2, dna: 0.02, lipid: 0.05 }, sense: 380,
    hostClass: ['eukaryote'],
    biomes: { shallows: 0.9, biofilm: 1 }, group_size: [1, 1], minPressure: 0.2, threat: 2,
    codex: {
      size: 'up to 2 mm',
      fact: 'A trumpet-shaped giant ciliate with a beaded "moniliform" nucleus like a string of pearls. A small fragment can regrow a whole cell.',
      role: 'Its oral vortex pulls in anything small. Stay out of the current.',
    },
  }),

  gastrotrich: S({
    id: 'gastrotrich', name: 'Gastrotrich', latin: 'Chaetonotus', group: 'animal', aliveness: 7,
    radius: [30, 42], speed: 55, turn: 1.4, hpPerRadius: 1.6, behavior: 'grazer', edible: true,
    perRadius: true,
    contactDamage: 0, yields: { biomass: 0.75, glucose: 0.2, dna: 0.03, lipid: 0.1 }, sense: 180,
    carrierChance: 0.3,
    biomes: { biofilm: 2, shallows: 1, abyss: 0.4 }, group_size: [1, 2], minPressure: 0.1, threat: 0,
    codex: {
      size: '~60 μm',
      fact: 'One of the smallest animals: a brain of a few dozen neurons and a coat of cat-whisker bristles. Some carry unicellular hitchhikers inside.',
      role: 'A grazer. Eat it, but its hitchhikers come along.',
    },
  }),
  rotifer: S({
    id: 'rotifer', name: 'Rotifer', latin: 'Brachionus calyciflorus', group: 'animal', aliveness: 7,
    radius: [34, 55], speed: 40, turn: 1, hpPerRadius: 2.4, behavior: 'vortex', edible: true,
    perRadius: true,
    contactDamage: 6, yields: { biomass: 0.85, glucose: 0.3, dna: 0.04, lipid: 0.15 }, sense: 300,
    biomes: { shallows: 1.4, biofilm: 1, bloom: 0.7 }, group_size: [1, 1], minPressure: 0.2, threat: 2,
    codex: {
      size: '100–300 μm',
      fact: 'A whole animal smaller than many protists. Its ciliated corona spins a vortex that feeds a grinding jaw called the mastax.',
      role: 'Avoid its current until you outsize it, then it is a feast.',
    },
  }),
  hydra: S({
    id: 'hydra', name: 'Hydra', latin: 'Hydra viridissima', group: 'animal', aliveness: 7,
    radius: [62, 88], speed: 0, turn: 0.2, hpPerRadius: 5, behavior: 'tentacles', edible: false,
    perRadius: true,
    contactDamage: 10, yields: { biomass: 0.9, glucose: 0.4, dna: 0.04, lipid: 0.2 }, sense: 330,
    biomes: { biofilm: 1.1, abyss: 0.8, shallows: 0.3 }, group_size: [1, 1], minPressure: 0.6, threat: 3,
    codex: {
      size: '~1 cm',
      fact: 'A freshwater cnidarian that fires stinging nematocysts. Its stem cells renew it constantly, and it shows no measurable aging.',
      role: 'Tentacles grab and sting. It regenerates, so burn it down fast or go around.',
    },
  }),
  collotheca: S({
    id: 'collotheca', name: 'Collotheca', latin: 'Collotheca ornata', group: 'animal', aliveness: 7,
    radius: [34, 48], speed: 0, turn: 0.2, hpPerRadius: 2, behavior: 'trap', edible: true,
    perRadius: true,
    contactDamage: 8, yields: { biomass: 0.7, glucose: 0.3, dna: 0.04, lipid: 0.1 }, sense: 220,
    biomes: { abyss: 1.3, biofilm: 0.7 }, group_size: [1, 1], minPressure: 0.55, threat: 2,
    codex: {
      size: '~500 μm',
      fact: 'A sessile rotifer whose funnel is crowned by long, near-invisible bristles. When prey swims in, the funnel snaps shut.',
      role: 'An ambush trap. Darkfield makes the bristles easier to see.',
    },
  }),
  tardigrade: S({
    id: 'tardigrade', name: 'Tardigrade', latin: 'Hypsibius dujardini', group: 'animal', aliveness: 7,
    radius: [50, 68], speed: 22, turn: 0.7, hpPerRadius: 10, behavior: 'lumber', edible: false, invulnerable: true, solid: true,
    contactDamage: 0, yields: { biomass: 0, glucose: 0, dna: 0, lipid: 0 }, sense: 0,
    biomes: { abyss: 1.1, biofilm: 0.6, shallows: 0.25 }, group_size: [1, 1], minPressure: 0, threat: 0,
    codex: {
      size: '0.3–0.5 mm',
      fact: 'Water bears survive freezing, drying, vacuum and intense radiation. Their Dsup protein physically shields DNA.',
      role: 'Indestructible and harmless. Brush against it to borrow its Dsup protection.',
    },
  }),

  prion: S({
    id: 'prion', name: 'Prion', latin: 'PrPˢᶜ', group: 'agent', aliveness: 0,
    radius: [3, 5], speed: 6, turn: 1, hpPerRadius: 1, behavior: 'drift', edible: false, hidden: true,
    contactDamage: 0, yields: { biomass: 0, glucose: 0, dna: 0, lipid: 0 }, sense: 0,
    infects: ['eukaryote'], infection: 'prion',
    biomes: { bloom: 1.6, rift: 1.4, abyss: 0.6 }, group_size: [4, 9], minPressure: 0.6, threat: 2,
    codex: {
      size: '~10 nm',
      fact: 'Misfolded proteins that template their misfolding onto healthy copies. No genome at all: the least "alive" infectious agent.',
      role: 'Misfolds organelles, and it spreads. Hard to see in brightfield. Autophagy (lysosome burst) clears it.',
    },
  }),
  viroid: S({
    id: 'viroid', name: 'Viroid', latin: 'PSTVd', group: 'agent', aliveness: 1,
    radius: [2.4, 3.2], speed: 95, turn: 4, hpPerRadius: 1, behavior: 'swarm', edible: false, hidden: true,
    contactDamage: 0, yields: { biomass: 0, glucose: 0, dna: 0.05, lipid: 0 }, sense: 260,
    infects: ['plant'], infection: 'viroid',
    biomes: { bloom: 1.5, shallows: 0.5, biofilm: 0.6 }, group_size: [6, 11], minPressure: 0.55, threat: 1,
    codex: {
      size: '246–401 nucleotides',
      fact: 'Naked circular RNA that codes for no protein. It hijacks host enzymes to copy itself, and it infects plants.',
      role: 'Swarms photosynthetic cells and siphons ATP. Shake them off with a dash.',
    },
  }),
  satellite: S({
    id: 'satellite', name: 'Satellite RNA', latin: 'satRNA', group: 'agent', aliveness: 2,
    radius: [1.6, 2.4], speed: 5, turn: 1, hpPerRadius: 1, behavior: 'drift', edible: false, hidden: true,
    contactDamage: 0, yields: { biomass: 0, glucose: 0, dna: 0.05, lipid: 0 }, sense: 0,
    biomes: { bloom: 1 }, group_size: [3, 6], minPressure: 0.6, threat: 1,
    codex: {
      size: 'a few hundred bases',
      fact: 'Satellite RNAs cannot replicate alone. They ride along with a helper virus and change how severe its infection is.',
      role: 'Inert alone, but amplifies the next virus that infects you.',
    },
  }),
  adenovirus: S({
    id: 'adenovirus', name: 'Adenovirus', latin: 'Mastadenovirus', group: 'agent', aliveness: 3,
    radius: [6, 8], speed: 42, turn: 2, hpPerRadius: 0.5, behavior: 'virus', edible: false,
    contactDamage: 0, yields: { biomass: 0, glucose: 0, dna: 0.2, lipid: 0 }, sense: 210,
    infects: ['eukaryote'], infection: 'lytic',
    biomes: { bloom: 2.4, biofilm: 0.7, shallows: 0.4, rift: 0.8 }, group_size: [2, 5], minPressure: 0.4, threat: 2,
    codex: {
      size: '~90 nm',
      fact: 'An icosahedral (20-faced) capsid with fiber proteins jutting from its 12 vertices. Lytic: it hijacks the cell, replicates and bursts out.',
      role: 'Attaches, injects and replicates. Shake it off before it injects, or use RNAi.',
    },
  }),
  retrovirus: S({
    id: 'retrovirus', name: 'Retrovirus', latin: 'Retroviridae', group: 'agent', aliveness: 3,
    radius: [6.5, 9], speed: 34, turn: 1.6, hpPerRadius: 0.6, behavior: 'virus', edible: false,
    contactDamage: 0, yields: { biomass: 0, glucose: 0, dna: 0.3, lipid: 0 }, sense: 200,
    infects: ['eukaryote'], infection: 'lysogenic',
    biomes: { bloom: 1.4, abyss: 0.6, rift: 0.7 }, group_size: [1, 3], minPressure: 0.75, threat: 2,
    codex: {
      size: '~100 nm',
      fact: 'An enveloped virus that reverse-transcribes its RNA into DNA and splices it into the host genome as a dormant provirus.',
      role: 'A sleeper. It hides in your genome until stress wakes it. Fluorescence reveals proviruses.',
    },
  }),
  tmv: S({
    id: 'tmv', name: 'Tobacco mosaic virus', latin: 'Tobamovirus', group: 'agent', aliveness: 3,
    radius: [4, 5], speed: 30, turn: 1.4, hpPerRadius: 0.6, behavior: 'virus', edible: false,
    contactDamage: 0, yields: { biomass: 0, glucose: 0, dna: 0.2, lipid: 0 }, sense: 200,
    infects: ['plant'], infection: 'lytic',
    biomes: { shallows: 0.8, bloom: 0.8 }, group_size: [2, 4], minPressure: 0.5, threat: 1,
    codex: {
      size: '300 × 18 nm',
      fact: 'A rigid helical rod built from 2,130 identical coat proteins, the first virus ever discovered. It infects plants.',
      role: 'Only infects cells carrying chloroplasts.',
    },
  }),
  phage: S({
    id: 'phage', name: 'Bacteriophage', latin: 'Enterobacteria phage T4', group: 'agent', aliveness: 3,
    radius: [5, 6], speed: 50, turn: 2.4, hpPerRadius: 0.5, behavior: 'virus', edible: true,
    contactDamage: 0, yields: { biomass: 0.2, glucose: 0, dna: 0.22, lipid: 0 }, sense: 240,
    infects: ['bacteria'], infection: 'lytic',
    biomes: { biofilm: 2.4, bloom: 1.5, shallows: 0.5 }, group_size: [3, 7], minPressure: 0.1, threat: 0,
    codex: {
      size: '~200 nm',
      fact: 'A capsid head, contractile tail and spidery tail fibers. It infects only bacteria, and phages are probably the most abundant biological entities on Earth.',
      role: 'Harmless to you. Watch it burst bacteria, then collect the DNA.',
    },
  }),
  mimivirus: S({
    id: 'mimivirus', name: 'Mimivirus', latin: 'Acanthamoeba polyphaga mimivirus', group: 'agent', aliveness: 4,
    radius: [14, 18], speed: 26, turn: 1, hpPerRadius: 1.2, behavior: 'virus', edible: false,
    contactDamage: 0, yields: { biomass: 0.5, glucose: 0, dna: 1.2, lipid: 0 }, sense: 260,
    infects: ['amoeboid'], infection: 'lytic',
    biomes: { bloom: 1, abyss: 0.7 }, group_size: [1, 2], minPressure: 0.9, threat: 3,
    codex: {
      size: '~750 nm with fibers',
      fact: 'A giant virus, bigger than some bacteria, with a hairy capsid. It infects amoebae, and you are amoeboid.',
      role: 'A heavy infection. Virophages are your natural allies against it.',
    },
  }),
  virophage: S({
    id: 'virophage', name: 'Virophage', latin: 'Sputnik', group: 'agent', aliveness: 4,
    radius: [3, 4], speed: 80, turn: 3, hpPerRadius: 1, behavior: 'virophage', edible: false,
    contactDamage: 0, yields: { biomass: 0, glucose: 0, dna: 0.1, lipid: 0 }, sense: 380,
    infects: ['giantVirus'],
    biomes: { bloom: 0.9 }, group_size: [3, 6], minPressure: 0.5, threat: 0,
    codex: {
      size: '~50 nm',
      fact: 'A virus that parasitizes other viruses. Sputnik hijacks a giant virus\'s replication factory and cripples it.',
      role: 'An ally. Absorb them, then release the swarm on giant viruses.',
    },
  }),

  neoplasm: S({
    id: 'neoplasm', name: 'Neoplasm', latin: 'transformed cell mass', group: 'boss', aliveness: 6,
    radius: [70, 120], speed: 70, turn: 1.6, hpPerRadius: 9, behavior: 'neoplasm', edible: true,
    perRadius: true,
    contactDamage: 18, yields: { biomass: 0.75, glucose: 0.9, dna: 0.12, lipid: 0.1 }, sense: 520,
    biomes: { rift: 0.35 }, group_size: [1, 1], minPressure: 1.2, threat: 3,
    codex: {
      size: 'unbounded',
      fact: 'Cells that ignore every "stop dividing" signal. Tumors gorge on glucose even when oxygen is present: the Warburg effect.',
      role: 'Mini-boss. It splits when wounded. Rich in DNA if you can burn it down.',
    },
  }),
  pollen: S({
    id: 'pollen', name: 'Pollen grain', latin: 'sporopollenin wall', group: 'obstacle', aliveness: -1,
    radius: [40, 86], speed: 4, turn: 0.1, hpPerRadius: 100, behavior: 'drift', edible: false, invulnerable: true, solid: true,
    contactDamage: 0, yields: { biomass: 0, glucose: 0, dna: 0, lipid: 0 }, sense: 0,
    biomes: { shallows: 0.5, biofilm: 0.35 }, group_size: [1, 1], minPressure: 0, threat: 0,
    codex: {
      size: '10–100 μm',
      fact: 'Wrapped in sporopollenin, one of the toughest biopolymers known, sculpted with spikes and ridges unique to each plant.',
      role: 'Drifting terrain. Too tough to digest.',
    },
  }),
};

export const SPECIES_LIST = Object.values(SPECIES);

export const meanRadius = (id: SpeciesId) => (SPECIES[id].radius[0] + SPECIES[id].radius[1]) / 2;

// Host classes an organism (or the player) belongs to, for infection targeting.
export function hostClassesOf(id: SpeciesId): HostClass[] {
  if (id === 'mimivirus') return ['giantVirus'];
  return SPECIES[id].hostClass ?? [];
}

export const isAgent = (id: SpeciesId) => SPECIES[id].group === 'agent';
export const isResource = (id: SpeciesId) => SPECIES[id].group === 'resource';
