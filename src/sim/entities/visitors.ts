import { balance } from '../data/balance';
import { VISITOR_KINDS, type VisitorKind } from '../data/visitors';
import { nextFloat, nextInt } from '../rng';
import type { GameState, Visitor } from '../state';
import { tileAt, tileIndex } from '../world/grid';
import { visitorNetwork } from '../world/visitorNetwork';

// Création des visiteurs, humeur affichée et petits utilitaires de déplacement.

/** Humeur visible (bulle au-dessus du visiteur, panneau d'inspection), de la plus urgente à la plus banale. */
export type VisitorMood = 'blocked' | 'hungry' | 'bored' | 'unhappy' | 'joy' | 'sad' | 'happy' | 'neutral';

export function createVisitor(state: GameState, kind: VisitorKind, tile: number): Visitor {
  const v = balance.visitors;
  const def = VISITOR_KINDS[kind];
  const { x, y } = tileAt(state.world, tile);
  const visitor: Visitor = {
    id: state.nextVisitorId,
    kind,
    variant: nextInt(state, 0, def.variants),
    x: x + 0.5,
    y: y + 0.5,
    prevX: x + 0.5,
    prevY: y + 0.5,
    heading: -Math.PI / 2,
    state: 'arriving',
    stateTicks: 0,
    goal: -1,
    pathStatus: 'none',
    path: [],
    targetEnclosure: 0,
    satisfaction: v.startSatisfaction,
    hunger: v.startHunger[0] + nextFloat(state) * (v.startHunger[1] - v.startHunger[0]),
    patience: v.startPatience,
    viewsWanted: nextInt(state, def.views[0], def.views[1] + 1),
    seen: [],
    blockedTicks: 0,
    reaction: 'none',
    reactionTick: -1,
    leaveReason: null,
    arrivedAt: state.tick,
  };
  state.visitors[visitor.id] = visitor;
  state.nextVisitorId += 1;
  return visitor;
}

/** Le visiteur réagit-il encore (éclat de joie ou tristesse visible) ? */
export function activeReaction(visitor: Readonly<Visitor>, tick: number): Visitor['reaction'] {
  return tick - visitor.reactionTick < balance.visitors.reactionTicks ? visitor.reaction : 'none';
}

/** Le visiteur ne peut plus rejoindre la sortie : aucun trajet, ou chemin coupé entre lui et la sortie. */
export function isVisitorBlocked(state: Readonly<GameState>, visitor: Readonly<Visitor>): boolean {
  if (visitor.blockedTicks > 0) return true;
  return !visitorNetwork(state).exitSide.has(currentTile(state, visitor));
}

/** `blocked` : résultat de `isVisitorBlocked`, calculé par l'appelant (il dépend du réseau de chemins). */
export function visitorMood(visitor: Readonly<Visitor>, tick: number, blocked: boolean): VisitorMood {
  const v = balance.visitors;
  if (blocked) return 'blocked';
  if (visitor.hunger < v.hungryBelow && visitor.state !== 'eating') return 'hungry';
  const reaction = activeReaction(visitor, tick);
  if (reaction !== 'none') return reaction;
  if (visitor.patience < 25) return 'bored';
  if (visitor.satisfaction < 30) return 'unhappy';
  if (visitor.satisfaction >= 70) return 'happy';
  return 'neutral';
}

/** Demande un trajet vers `goal` : le système `pathfinding` le calculera. */
export function requestPath(visitor: Visitor, goal: number): void {
  visitor.goal = goal;
  visitor.path = [];
  visitor.pathStatus = 'pending';
}

export function currentTile(state: Readonly<GameState>, visitor: Readonly<Visitor>): number {
  return tileIndex(state.world, { x: Math.floor(visitor.x), y: Math.floor(visitor.y) });
}

export function manhattan(state: Readonly<GameState>, a: number, b: number): number {
  const { width } = state.world;
  return Math.abs((a % width) - (b % width)) + Math.abs(Math.floor(a / width) - Math.floor(b / width));
}

export function nearest(state: Readonly<GameState>, from: number, tiles: readonly number[]): number {
  let best = tiles[0] as number;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const tile of tiles) {
    const distance = manhattan(state, from, tile);
    if (distance < bestDistance) {
      best = tile;
      bestDistance = distance;
    }
  }
  return best;
}
