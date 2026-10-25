import { tileCode } from '../data/terrain';
import type { EnclosureId, GameState, World } from '../state';
import { tileIndex } from './grid';

// Déplacements des animaux dans leur enclos : parcours en largeur sur les tuiles praticables (enclos en L compris).

/** Tuiles occupées par un objet (nourrisseur, décor). */
export function occupiedTiles(state: Readonly<GameState>): Set<number> {
  const occupied = new Set<number>();
  for (const building of Object.values(state.buildings)) occupied.add(tileIndex(state.world, building.tile));
  return occupied;
}

/** Un animal de l'enclos peut-il se tenir sur cette tuile ? (ni eau, ni objet) */
export function isWalkable(
  world: Readonly<World>,
  occupied: ReadonlySet<number>,
  enclosureId: EnclosureId,
  index: number,
): boolean {
  return (
    world.enclosureOf[index] === enclosureId &&
    world.tiles[index] !== tileCode('water') &&
    !occupied.has(index)
  );
}

/** Voisins (indices) de la tuile accessibles sans traverser de clôture. */
export function openNeighbours(world: Readonly<World>, index: number): number[] {
  const { width, height } = world;
  const x = index % width;
  const y = (index - x) / width;
  const result: number[] = [];
  if (x > 0 && world.fencesV[y * (width + 1) + x] === 0) result.push(index - 1);
  if (x < width - 1 && world.fencesV[y * (width + 1) + x + 1] === 0) result.push(index + 1);
  if (y > 0 && world.fencesH[y * width + x] === 0) result.push(index - width);
  if (y < height - 1 && world.fencesH[(y + 1) * width + x] === 0) result.push(index + width);
  return result;
}

/**
 * Plus court trajet de `start` vers la première tuile praticable qui satisfait `isGoal`.
 * Renvoie les tuiles à parcourir (sans `start`), [] si `start` convient déjà, null si aucune n'est atteignable.
 */
export function findPath(
  world: Readonly<World>,
  occupied: ReadonlySet<number>,
  enclosureId: EnclosureId,
  start: number,
  isGoal: (index: number) => boolean,
): number[] | null {
  if (isWalkable(world, occupied, enclosureId, start) && isGoal(start)) return [];
  const cameFrom = new Map<number, number>([[start, -1]]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head] as number;
    for (const next of openNeighbours(world, current)) {
      if (cameFrom.has(next) || !isWalkable(world, occupied, enclosureId, next)) continue;
      cameFrom.set(next, current);
      if (isGoal(next)) {
        const path = [next];
        for (let step = current; step !== start; step = cameFrom.get(step) as number) path.unshift(step);
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}
