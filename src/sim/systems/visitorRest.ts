import { balance } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { currentTile, manhattan } from '../entities/visitors';
import type { Building, GameState, Visitor } from '../state';
import { tileAt, tileIndex } from '../world/grid';
import type { VisitorNetwork } from '../world/visitorNetwork';

// Bancs : un visiteur fatigué (énergie basse) s'assoit sur un banc libre, retrouve énergie et patience et gagne un
// peu de satisfaction. Sans banc, la fatigue use sa patience : il part plus tôt, voit moins et achète moins.

/** Visiteurs assis ou en route, par tuile de banc (`benchSpots`). Calculé une fois par tick, à la demande. */
export type BenchUse = Map<number, number>;

export function benchUse(state: Readonly<GameState>): BenchUse {
  const use: BenchUse = new Map();
  for (const visitor of Object.values(state.visitors)) {
    if (visitor.state === 'walkingToBench' || visitor.state === 'resting') {
      use.set(visitor.goal, (use.get(visitor.goal) ?? 0) + 1);
    }
  }
  return use;
}

/** Banc servi par une tuile de chemin, s'il y en a un. */
export function benchAt(
  state: Readonly<GameState>,
  network: VisitorNetwork,
  spot: number,
): Building | undefined {
  const tile = network.benchFacing.get(spot);
  if (tile === undefined) return undefined;
  return Object.values(state.buildings).find(
    (b) => BUILDINGS[b.kind].seats > 0 && tileIndex(state.world, b.tile) === tile,
  );
}

/** Le visiteur est-il assez fatigué pour chercher un banc ? */
export function isTired(visitor: Readonly<Visitor>): boolean {
  return visitor.energy < balance.visitors.tiredBelow;
}

/** Tuile de banc libre la plus proche, ou -1. */
export function freeBench(
  state: Readonly<GameState>,
  network: VisitorNetwork,
  use: BenchUse,
  visitor: Readonly<Visitor>,
): number {
  const here = currentTile(state, visitor);
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const spot of network.benchSpots) {
    const bench = benchAt(state, network, spot);
    if (!bench || (use.get(spot) ?? 0) >= BUILDINGS[bench.kind].seats) continue;
    const distance = manhattan(state, here, spot);
    if (distance < bestDistance) {
      best = spot;
      bestDistance = distance;
    }
  }
  return best;
}

/** Arrivée au banc : le visiteur s'assoit face au banc (ou repart si le banc a disparu). */
export function sitDown(state: Readonly<GameState>, network: VisitorNetwork, visitor: Visitor): void {
  const bench = network.benchFacing.get(currentTile(state, visitor));
  if (bench === undefined) {
    visitor.state = 'wandering';
    return;
  }
  const tile = tileAt(state.world, bench);
  visitor.heading = Math.atan2(tile.y + 0.5 - visitor.y, tile.x + 0.5 - visitor.x);
  visitor.state = 'resting';
  visitor.stateTicks = balance.visitors.restTicks;
}

export function rest(visitor: Visitor): void {
  const v = balance.visitors;
  visitor.energy = Math.min(100, visitor.energy + v.restEnergyPerTick);
  visitor.patience = Math.min(100, visitor.patience + v.restPatiencePerTick);
  visitor.satisfaction = Math.min(100, visitor.satisfaction + v.restSatisfactionPerTick);
  if (--visitor.stateTicks <= 0) visitor.state = 'wandering';
}
