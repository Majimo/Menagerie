import { balance } from '../data/balance';
import { VISITOR_KINDS, type VisitorKind } from '../data/visitors';
import { nextFloat, nextInt } from '../rng';
import type { GameState, Visitor } from '../state';
import { tileAt } from '../world/grid';

// Création des visiteurs et humeur affichée.

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

export function visitorMood(visitor: Readonly<Visitor>, tick: number): VisitorMood {
  const v = balance.visitors;
  if (visitor.blockedTicks > 0) return 'blocked';
  if (visitor.hunger < v.hungryBelow && visitor.state !== 'eating') return 'hungry';
  const reaction = activeReaction(visitor, tick);
  if (reaction !== 'none') return reaction;
  if (visitor.patience < 25) return 'bored';
  if (visitor.satisfaction < 30) return 'unhappy';
  if (visitor.satisfaction >= 70) return 'happy';
  return 'neutral';
}
