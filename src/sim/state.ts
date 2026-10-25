import { balance } from './data/balance';
import type { BuildingKind } from './data/buildings';
import type { SpeciesId } from './data/species';
import { tileCode } from './data/terrain';
import { type TileCoord, tileIndex } from './world/grid';

// État global de la simulation : de la donnée pure, sérialisable en JSON (règle d'architecture n° 4).
// Il s'enrichit à chaque itération (animaux, visiteurs…).

export const SAVE_VERSION = 2;

export type EnclosureId = number;

export interface Enclosure {
  id: EnclosureId;
  /** Indices des tuiles de l'enclos, triés. */
  tiles: number[];
  /** Surface en tuiles. */
  area: number;
}

export type AnimalId = number;
export type BuildingId = number;

/** Ce que fait l'animal en ce moment (pilote l'animation). */
export type AnimalActivity = 'idle' | 'walk' | 'eat' | 'drink' | 'sleep' | 'dead';

/** But du trajet en cours. */
export type AnimalGoal = 'wander' | 'eat' | 'drink';

export interface Animal {
  id: AnimalId;
  species: SpeciesId;
  /** Enclos qui contient l'animal, 0 s'il n'est dans aucun (clôture démolie). */
  enclosureId: EnclosureId;
  /** Position continue en tuiles : le centre de la tuile (x, y) est (x + 0,5 ; y + 0,5). */
  x: number;
  y: number;
  /** Position au tick précédent, pour l'interpolation au rendu. */
  prevX: number;
  prevY: number;
  /** Direction du regard, en radians dans le plan (0 = vers l'est, sens horaire vu de dessus). */
  heading: number;
  activity: AnimalActivity;
  /** Ticks restants de l'activité en cours (pause, repas, boisson). */
  activityTicks: number;
  goal: AnimalGoal;
  /** Tuiles restantes du trajet (indices), la prochaine en tête. */
  path: number[];
  /** Jauges de 0 à 100. */
  hunger: number;
  thirst: number;
  wellbeing: number;
  health: number;
  /** Ticks consécutifs avec au moins une jauge à 0. */
  deprivationTicks: number;
  /** Tick de la mort, -1 si vivant. */
  diedAt: number;
}

export interface Building {
  id: BuildingId;
  kind: BuildingKind;
  tile: TileCoord;
}

export interface World {
  width: number;
  height: number;
  /** Type de sol de chaque tuile : indice dans `TILE_TYPES` (data/terrain.ts). */
  tiles: number[];
  /** Clôture (1) ou non (0) sur chaque arête horizontale, voir world/grid.ts. */
  fencesH: number[];
  /** Clôture (1) ou non (0) sur chaque arête verticale. */
  fencesV: number[];
  entrance: TileCoord;
  exit: TileCoord;
  /** Enclos de chaque tuile, 0 si aucun. Recalculé quand les clôtures changent. */
  enclosureOf: number[];
  /** Les clôtures ont changé depuis la dernière détection d'enclos. */
  enclosuresDirty: boolean;
}

export interface GameState {
  saveVersion: number;
  seed: number;
  /** Compteur de ticks écoulés depuis le début de la partie (10 Hz). */
  tick: number;
  rngState: number;
  money: number;
  world: World;
  enclosures: Record<EnclosureId, Enclosure>;
  nextEnclosureId: EnclosureId;
  animals: Record<AnimalId, Animal>;
  nextAnimalId: AnimalId;
  buildings: Record<BuildingId, Building>;
  nextBuildingId: BuildingId;
}

export function createInitialState(seed = 1): GameState {
  return {
    saveVersion: SAVE_VERSION,
    seed,
    tick: 0,
    rngState: seed >>> 0,
    money: balance.startingMoney,
    world: createWorld(),
    enclosures: {},
    nextEnclosureId: 1,
    animals: {},
    nextAnimalId: 1,
    buildings: {},
    nextBuildingId: 1,
  };
}

function createWorld(): World {
  const { width, height, entrance, exit } = balance.map;
  const size = { width, height };
  const tiles = new Array<number>(width * height).fill(tileCode('grass'));
  tiles[tileIndex(size, entrance)] = tileCode('path');
  tiles[tileIndex(size, exit)] = tileCode('path');
  return {
    width,
    height,
    tiles,
    fencesH: new Array<number>(width * (height + 1)).fill(0),
    fencesV: new Array<number>((width + 1) * height).fill(0),
    entrance: { ...entrance },
    exit: { ...exit },
    enclosureOf: new Array<number>(width * height).fill(0),
    enclosuresDirty: false,
  };
}
