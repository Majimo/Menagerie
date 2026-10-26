import { BUILDINGS, type BuildingKind } from '../data/buildings';
import { tileCode } from '../data/terrain';
import type { EnclosureId, GameState, World } from '../state';
import { tileIndex } from './grid';
import { openNeighbours } from './paths';

// Réseau des visiteurs : les chemins hors enclos reliés à l'entrée, et ce qu'on peut y faire.
// Donnée dérivée de l'état, recalculée seulement quand le monde change (`world.revision`).

export interface VisitorNetwork {
  revision: number;
  /** Tuiles de chemin atteignables depuis l'entrée (entrée comprise). */
  reachable: Set<number>;
  entrance: number;
  exit: number;
  /** La sortie est atteignable depuis l'entrée. */
  exitReachable: boolean;
  /** Tuiles de chemin d'où l'on peut rejoindre la sortie (sortie comprise). */
  exitSide: Set<number>;
  /** Zones d'observation atteignables de chaque enclos : tuiles de chemin qui le longent. */
  viewSpots: Map<EnclosureId, number[]>;
  /** Pour chaque zone d'observation, la tuile d'enclos qu'elle regarde (orientation du visiteur). */
  viewFacing: Map<number, number>;
  /** Tuiles de chemin atteignables voisines d'un stand de snacks. */
  snackSpots: number[];
  /** Pour chaque tuile de `snackSpots`, le stand qu'elle dessert. */
  snackFacing: Map<number, number>;
  /** Tuiles de chemin atteignables voisines d'un banc. */
  benchSpots: number[];
  /** Pour chaque tuile de `benchSpots`, le banc qu'elle dessert. */
  benchFacing: Map<number, number>;
}

/** Le visiteur peut-il marcher sur cette tuile ? (chemin hors enclos) */
export function isVisitorWalkable(world: Readonly<World>, index: number): boolean {
  return world.tiles[index] === tileCode('path') && world.enclosureOf[index] === 0;
}

/** Voisins d'une tuile dans les 4 directions, sans tenir compte des clôtures. */
function adjacentTiles(world: Readonly<World>, index: number): number[] {
  const { width, height } = world;
  const x = index % width;
  const y = (index - x) / width;
  const result: number[] = [];
  if (x > 0) result.push(index - 1);
  if (x < width - 1) result.push(index + 1);
  if (y > 0) result.push(index - width);
  if (y < height - 1) result.push(index + width);
  return result;
}

/** Tuiles de chemin reliées à `start` (parcours en largeur, sans traverser de clôture). */
function connectedTiles(world: Readonly<World>, start: number): Set<number> {
  const tiles = new Set<number>([start]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    for (const next of openNeighbours(world, queue[head] as number)) {
      if (tiles.has(next) || !isVisitorWalkable(world, next)) continue;
      tiles.add(next);
      queue.push(next);
    }
  }
  return tiles;
}

const cache = new WeakMap<Readonly<GameState>, VisitorNetwork>();

export function visitorNetwork(state: Readonly<GameState>): VisitorNetwork {
  const cached = cache.get(state);
  if (cached && cached.revision === state.world.revision) return cached;
  const network = computeNetwork(state);
  cache.set(state, network);
  return network;
}

function computeNetwork(state: Readonly<GameState>): VisitorNetwork {
  const { world } = state;
  const entrance = tileIndex(world, world.entrance);
  const exit = tileIndex(world, world.exit);
  const reachable = connectedTiles(world, entrance);

  const viewSpots = new Map<EnclosureId, number[]>();
  const viewFacing = new Map<number, number>();
  const sorted = [...reachable].sort((a, b) => a - b);
  for (const spot of sorted) {
    for (const next of adjacentTiles(world, spot)) {
      const enclosureId = world.enclosureOf[next] ?? 0;
      if (enclosureId === 0) continue;
      const spots = viewSpots.get(enclosureId) ?? [];
      if (spots[spots.length - 1] !== spot) spots.push(spot);
      viewSpots.set(enclosureId, spots);
      if (!viewFacing.has(spot)) viewFacing.set(spot, next);
    }
  }

  const snack = serviceSpots(state, sorted, (kind) => BUILDINGS[kind].sellsSnacks);
  const bench = serviceSpots(state, sorted, (kind) => BUILDINGS[kind].seats > 0);

  return {
    revision: world.revision,
    reachable,
    entrance,
    exit,
    exitReachable: reachable.has(exit),
    exitSide: connectedTiles(world, exit),
    viewSpots,
    viewFacing,
    snackSpots: snack.spots,
    snackFacing: snack.facing,
    benchSpots: bench.spots,
    benchFacing: bench.facing,
  };
}

/** Tuiles de chemin (triées) voisines d'un objet choisi par `accepts`, et l'objet que chacune dessert. */
function serviceSpots(
  state: Readonly<GameState>,
  sorted: readonly number[],
  accepts: (kind: BuildingKind) => boolean,
): { spots: number[]; facing: Map<number, number> } {
  const { world } = state;
  const tiles = new Set<number>();
  for (const building of Object.values(state.buildings)) {
    if (accepts(building.kind)) tiles.add(tileIndex(world, building.tile));
  }
  const spots: number[] = [];
  const facing = new Map<number, number>();
  for (const spot of sorted) {
    const target = openNeighbours(world, spot).find((n) => tiles.has(n));
    if (target === undefined) continue;
    spots.push(spot);
    facing.set(spot, target);
  }
  return { spots, facing };
}
