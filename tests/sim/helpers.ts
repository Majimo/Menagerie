import type { Command } from '../../src/sim/commands';
import { dispatchCommand } from '../../src/sim/simulation';
import type { GameState } from '../../src/sim/state';
import type { Edge } from '../../src/sim/world/grid';

// Utilitaires des tests de simulation.

/** Arêtes du contour d'un rectangle de tuiles [x0, x1] × [y0, y1] (bornes incluses). */
export function rectangleOutline(x0: number, y0: number, x1: number, y1: number): Edge[] {
  const edges: Edge[] = [];
  for (let x = x0; x <= x1; x++) {
    edges.push({ axis: 'h', x, y: y0 }, { axis: 'h', x, y: y1 + 1 });
  }
  for (let y = y0; y <= y1; y++) {
    edges.push({ axis: 'v', x: x0, y }, { axis: 'v', x: x1 + 1, y });
  }
  return edges;
}

export function placeFences(state: GameState, edges: Edge[]): void {
  for (const edge of edges) {
    const result = dispatchCommand(state, { type: 'PlaceFence', edge });
    if (!result.ok) throw new Error(`Clôture refusée en ${JSON.stringify(edge)} : ${result.error}`);
  }
}

export function dispatchAll(state: GameState, commands: Command[]): void {
  for (const command of commands) dispatchCommand(state, command);
}
