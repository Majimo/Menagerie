import { balance } from './data/balance';
import { tileCode } from './data/terrain';
import { type TileCoord, tileIndex } from './world/grid';

// État global de la simulation : de la donnée pure, sérialisable en JSON (règle d'architecture n° 4).
// Il s'enrichit à chaque itération (animaux, visiteurs…).

export const SAVE_VERSION = 1;

export type EnclosureId = number;

export interface Enclosure {
  id: EnclosureId;
  /** Indices des tuiles de l'enclos, triés. */
  tiles: number[];
  /** Surface en tuiles. */
  area: number;
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
