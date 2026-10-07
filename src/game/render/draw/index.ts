import type { Entity, SpeciesId } from '../../sim/types';
import { drawAgent } from './agents';
import { drawCollotheca, drawGastrotrich, drawHydra, drawRotifer, drawTardigrade } from './animals';
import { drawNeoplasm, drawPollen } from './large';
import { drawBacillus, drawCocci, drawCyano, drawDebris, drawDna, drawGlucose, drawLipid, drawProteo, drawSpirillum } from './microbes';
import { drawAmoeba, drawDidinium, drawDiatom, drawEuglena, drawLacrymaria, drawParamecium, drawStentor, drawTestate } from './protists';
import type { DrawCtx, EntityLook } from './util';

export type Drawer = (dc: DrawCtx, e: Entity, look: EntityLook) => void;

export const DRAWERS: Record<SpeciesId, Drawer> = {
  glucose: drawGlucose,
  debris: drawDebris,
  dna: drawDna,
  lipid: drawLipid,
  cocci: drawCocci,
  bacillus: drawBacillus,
  spirillum: drawSpirillum,
  proteo: drawProteo,
  cyano: drawCyano,
  diatom: drawDiatom,
  euglena: drawEuglena,
  paramecium: drawParamecium,
  didinium: drawDidinium,
  lacrymaria: drawLacrymaria,
  amoeba: drawAmoeba,
  testate: drawTestate,
  stentor: drawStentor,
  gastrotrich: drawGastrotrich,
  rotifer: drawRotifer,
  hydra: drawHydra,
  collotheca: drawCollotheca,
  tardigrade: drawTardigrade,
  prion: drawAgent,
  viroid: drawAgent,
  satellite: drawAgent,
  adenovirus: drawAgent,
  retrovirus: drawAgent,
  tmv: drawAgent,
  phage: drawAgent,
  mimivirus: drawAgent,
  virophage: drawAgent,
  neoplasm: drawNeoplasm,
  pollen: drawPollen,
};

// Draw order: big sessile/background organisms first, small and agents last.
export const LAYER: Record<SpeciesId, number> = {
  pollen: 0,
  hydra: 1,
  stentor: 1,
  collotheca: 1,
  amoeba: 2,
  neoplasm: 2,
  tardigrade: 2,
  rotifer: 2,
  testate: 3,
  gastrotrich: 3,
  lacrymaria: 3,
  paramecium: 3,
  didinium: 3,
  euglena: 3,
  diatom: 3,
  cyano: 4,
  proteo: 4,
  bacillus: 4,
  spirillum: 4,
  cocci: 4,
  debris: 5,
  lipid: 5,
  glucose: 5,
  dna: 5,
  phage: 6,
  adenovirus: 6,
  retrovirus: 6,
  tmv: 6,
  mimivirus: 6,
  virophage: 6,
  viroid: 7,
  prion: 7,
  satellite: 7,
};
