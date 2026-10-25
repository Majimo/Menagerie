import { balance } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { canCohabit, SPECIES, type SpeciesId } from '../data/species';
import { tileCode } from '../data/terrain';
import type { Animal, EnclosureId, GameState } from '../state';
import { tileIndex } from './grid';

// Score d'habitat (docs/02) : fonction pure de l'état, utilisée par la simulation et par le panneau d'inspection.

export type HabitatCriterion = 'space' | 'biome' | 'water' | 'food' | 'enrichment';

export const HABITAT_CRITERIA: readonly HabitatCriterion[] = [
  'space',
  'biome',
  'water',
  'food',
  'enrichment',
];

/** Ce qui fait baisser le bien-être. L'UI affiche la clé i18n `habitat.issue.<problème>`. */
export type HabitatIssue =
  | 'noEnclosure'
  | 'incompatible'
  | 'tooSmall'
  | 'noWater'
  | 'noFood'
  | 'wrongBiome'
  | 'lowEnrichment'
  | 'lonely'
  | 'overcrowded';

export interface HabitatReport {
  /** Score de 0 à 100. */
  score: number;
  /** Satisfaction de chaque critère, de 0 à 1. */
  criteria: Record<HabitatCriterion, number>;
  /** Problèmes, du plus grave au moins grave. */
  issues: HabitatIssue[];
  /** Bien-être cible : le score moins les malus (solitude, surpopulation, cohabitation). */
  target: number;
}

export function isAlive(animal: Animal): boolean {
  return animal.diedAt < 0;
}

/** Animaux vivants d'un enclos, par id croissant. */
export function animalsIn(state: Readonly<GameState>, enclosureId: EnclosureId): Animal[] {
  return Object.values(state.animals).filter((a) => a.enclosureId === enclosureId && isAlive(a));
}

const NO_HABITAT: HabitatReport = {
  score: 0,
  criteria: { space: 0, biome: 0, water: 0, food: 0, enrichment: 0 },
  issues: ['noEnclosure'],
  target: 0,
};

/** Score d'habitat de l'enclos pour l'espèce `species`, compte tenu des animaux qui y vivent. */
export function habitatReport(
  state: Readonly<GameState>,
  enclosureId: EnclosureId,
  species: SpeciesId,
): HabitatReport {
  const enclosure = state.enclosures[enclosureId];
  if (!enclosure) return NO_HABITAT;
  const def = SPECIES[species];
  const { world } = state;
  const { weights, enrichmentCap, wrongBiomeBelow, lowEnrichmentBelow } = balance.habitat;

  const preferred = tileCode(def.preferredBiome);
  const water = tileCode('water');
  let preferredTiles = 0;
  let waterTiles = 0;
  for (const index of enclosure.tiles) {
    const code = world.tiles[index];
    if (code === preferred) preferredTiles++;
    if (code === water) waterTiles++;
  }

  let feeders = 0;
  let likedDecor = 0;
  for (const building of Object.values(state.buildings)) {
    if (world.enclosureOf[tileIndex(world, building.tile)] !== enclosureId) continue;
    if (BUILDINGS[building.kind].feeds) feeders++;
    if ((def.likedDecor as readonly string[]).includes(building.kind)) likedDecor++;
  }

  const residents = animalsIn(state, enclosureId);
  const requiredArea = residents.reduce((sum, a) => sum + SPECIES[a.species].minAreaPerAnimal, 0);
  const sameSpecies = residents.filter((a) => a.species === species).length;
  const incompatible = residents.some((a) => !canCohabit(a.species, species));

  const criteria: Record<HabitatCriterion, number> = {
    space: requiredArea === 0 ? 1 : Math.min(1, enclosure.area / requiredArea),
    biome: preferredTiles / enclosure.area,
    water: waterTiles > 0 ? 1 : 0,
    food: feeders > 0 ? 1 : 0,
    enrichment: Math.min(1, likedDecor / enrichmentCap),
  };
  const score = Math.round(
    100 * HABITAT_CRITERIA.reduce((sum, criterion) => sum + weights[criterion] * criteria[criterion], 0),
  );

  const issues: HabitatIssue[] = [];
  let malus = 0;
  if (incompatible) {
    issues.push('incompatible');
    malus += balance.habitat.incompatibleMalus;
  }
  if (criteria.space < 1) issues.push('tooSmall');
  if (criteria.water === 0) issues.push('noWater');
  if (criteria.food === 0) issues.push('noFood');
  if (criteria.biome < wrongBiomeBelow) issues.push('wrongBiome');
  if (criteria.enrichment < lowEnrichmentBelow) issues.push('lowEnrichment');
  if (sameSpecies > 0 && sameSpecies < def.minGroup) {
    issues.push('lonely');
    malus += balance.habitat.lonelyMalus;
  }
  if (sameSpecies > def.maxGroup) {
    issues.push('overcrowded');
    malus += balance.habitat.overcrowdedMalus;
  }
  return { score, criteria, issues, target: Math.max(0, score - malus) };
}
