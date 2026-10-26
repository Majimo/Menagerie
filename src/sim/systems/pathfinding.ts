import { balance } from '../data/balance';
import type { GameState } from '../state';
import { tileIndex } from '../world/grid';
import { cachedPath } from '../world/pathfinding';

// Système `pathfinding` : traite les demandes de trajet des visiteurs, dans la limite d'un budget de demandes
// par tick ; les demandes en trop attendent le tick suivant. Le budget compte aussi les trajets en cache : ainsi le
// cache (non sauvegardé) ne change jamais le déroulement, et une partie rechargée se poursuit à l'identique.

export function updatePathfinding(state: GameState): void {
  let budget = balance.pathfinding.requestsPerTick;
  for (const visitor of Object.values(state.visitors)) {
    if (visitor.pathStatus !== 'pending') continue;
    if (budget-- <= 0) return;
    const start = tileIndex(state.world, { x: Math.floor(visitor.x), y: Math.floor(visitor.y) });
    const { path } = cachedPath(state, start, visitor.goal);
    visitor.path = path ? [...path] : [];
    visitor.pathStatus = path ? 'ready' : 'failed';
  }
}
