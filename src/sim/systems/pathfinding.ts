import { balance } from '../data/balance';
import type { GameState } from '../state';
import { tileIndex } from '../world/grid';
import { cachedPath } from '../world/pathfinding';

// Système `pathfinding` : traite les demandes de trajet des visiteurs, dans la limite d'un budget de recherches
// par tick. Les trajets en cache ne comptent pas ; les demandes en trop attendent le tick suivant.

export function updatePathfinding(state: GameState): void {
  let budget = balance.pathfinding.searchesPerTick;
  for (const visitor of Object.values(state.visitors)) {
    if (visitor.pathStatus !== 'pending') continue;
    const start = tileIndex(state.world, { x: Math.floor(visitor.x), y: Math.floor(visitor.y) });
    const result = cachedPath(state, start, visitor.goal, budget > 0);
    if (!result) continue;
    if (!result.cached) budget -= 1;
    const { path } = result;
    visitor.path = path ? [...path] : [];
    visitor.pathStatus = path ? 'ready' : 'failed';
  }
}
