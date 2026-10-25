import { balance } from '../data/balance';
import type { GameState, World } from '../state';
import { openNeighbours } from './paths';
import { isVisitorWalkable } from './visitorNetwork';

// A* sur les chemins des visiteurs (4 voisins, coût 1, heuristique de Manhattan), avec cache par révision du monde.

/**
 * Trajet de `start` à `goal` : tuiles à parcourir (sans `start`), [] si on y est, null si inatteignable.
 * `start` peut ne plus être un chemin (chemin démoli sous les pieds du visiteur) ; les autres tuiles doivent l'être.
 */
export function aStar(world: Readonly<World>, start: number, goal: number): number[] | null {
  if (start === goal) return [];
  if (!isVisitorWalkable(world, goal)) return null;
  const { width } = world;
  const gx = goal % width;
  const gy = (goal - gx) / width;
  const heuristic = (index: number): number => {
    const x = index % width;
    return Math.abs(x - gx) + Math.abs((index - x) / width - gy);
  };
  const cost = new Map<number, number>([[start, 0]]);
  const cameFrom = new Map<number, number>();
  const open = new MinHeap();
  open.push(start, heuristic(start));
  while (open.size > 0) {
    const current = open.pop();
    if (current === goal) {
      const path = [goal];
      for (let step = cameFrom.get(goal) as number; step !== start; step = cameFrom.get(step) as number)
        path.unshift(step);
      return path;
    }
    const currentCost = cost.get(current) as number;
    for (const next of openNeighbours(world, current)) {
      if (!isVisitorWalkable(world, next)) continue;
      const nextCost = currentCost + 1;
      if (nextCost >= (cost.get(next) ?? Number.POSITIVE_INFINITY)) continue;
      cost.set(next, nextCost);
      cameFrom.set(next, current);
      // Départage par indice : l'ordre d'exploration (donc le trajet) est déterministe.
      open.push(next, nextCost + heuristic(next) + next * 1e-7);
    }
  }
  return null;
}

/** Tas binaire minimal (indice de tuile, priorité). */
class MinHeap {
  private readonly items: number[] = [];
  private readonly priorities: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, priority: number): void {
    const { items, priorities } = this;
    let i = items.length;
    items.push(item);
    priorities.push(priority);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if ((priorities[parent] as number) <= priority) break;
      items[i] = items[parent] as number;
      priorities[i] = priorities[parent] as number;
      i = parent;
    }
    items[i] = item;
    priorities[i] = priority;
  }

  pop(): number {
    const { items, priorities } = this;
    const top = items[0] as number;
    const lastItem = items.pop() as number;
    const lastPriority = priorities.pop() as number;
    const n = items.length;
    if (n === 0) return top;
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      if (left >= n) break;
      const right = left + 1;
      const child = right < n && (priorities[right] as number) < (priorities[left] as number) ? right : left;
      if ((priorities[child] as number) >= lastPriority) break;
      items[i] = items[child] as number;
      priorities[i] = priorities[child] as number;
      i = child;
    }
    items[i] = lastItem;
    priorities[i] = lastPriority;
    return top;
  }
}

interface PathCache {
  revision: number;
  paths: Map<number, readonly number[] | null>;
}

const caches = new WeakMap<Readonly<GameState>, PathCache>();

/**
 * Trajet avec cache : le résultat est partagé, il faut le copier avant de le consommer.
 * Sans `allowSearch`, renvoie `undefined` si le trajet n'est pas déjà en cache.
 */
export function cachedPath(
  state: Readonly<GameState>,
  start: number,
  goal: number,
  allowSearch: boolean,
): { path: readonly number[] | null; cached: boolean } | undefined {
  const { world } = state;
  let cache = caches.get(state);
  if (!cache || cache.revision !== world.revision) {
    cache = { revision: world.revision, paths: new Map() };
    caches.set(state, cache);
  }
  const key = start * world.width * world.height + goal;
  const hit = cache.paths.get(key);
  if (hit !== undefined) return { path: hit, cached: true };
  if (!allowSearch) return undefined;
  if (cache.paths.size >= balance.pathfinding.cacheSize) cache.paths.clear();
  const path = aStar(world, start, goal);
  cache.paths.set(key, path);
  return { path, cached: false };
}
