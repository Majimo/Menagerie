import { balance } from '../data/balance';
import { SPECIES } from '../data/species';
import { VISITOR_KINDS } from '../data/visitors';
import { currentTile, manhattan, nearest, requestPath } from '../entities/visitors';
import { nextFloat, nextInt } from '../rng';
import type { EnclosureId, GameState, Visitor, VisitorLeaveReason } from '../state';
import { timeOfDay } from '../time';
import { tileAt } from '../world/grid';
import { isVisitorWalkable, type VisitorNetwork, visitorNetwork } from '../world/visitorNetwork';
import { type BenchUse, benchUse, freeBench, isTired, rest, sitDown } from './visitorRest';

// Système `visitorAI` : machine à états des visiteurs (docs/02), déplacement le long des trajets
// calculés par le système `pathfinding`, observation des enclos, snacks, départ.
//
// ARRIVING → WANDERING → WALKING_TO_VIEW → VIEWING → (WALKING_TO_FOOD → EATING)? → WANDERING … → LEAVING → GONE
// Un visiteur fatigué passe par WALKING_TO_BENCH → RESTING avant de choisir un enclos (visitorRest.ts).

/** Ce qu'un enclos offre à voir, calculé une fois par tick. */
export interface EnclosureSight {
  /** Animaux vivants : position et espèce. */
  animals: { x: number; y: number; interest: number; cuteness: number }[];
  avgWellbeing: number;
  /** Un animal mort est encore visible. */
  hasDead: boolean;
}

interface AiContext {
  state: GameState;
  network: VisitorNetwork;
  sights: Map<EnclosureId, EnclosureSight>;
  closing: boolean;
  /** Occupation des bancs, calculée au premier besoin du tick. */
  benches: BenchUse | null;
}

export function enclosureSights(state: Readonly<GameState>): Map<EnclosureId, EnclosureSight> {
  const sights = new Map<EnclosureId, EnclosureSight>();
  const sums = new Map<EnclosureId, number>();
  for (const animal of Object.values(state.animals)) {
    if (animal.enclosureId === 0) continue;
    let sight = sights.get(animal.enclosureId);
    if (!sight) {
      sight = { animals: [], avgWellbeing: 0, hasDead: false };
      sights.set(animal.enclosureId, sight);
    }
    if (animal.diedAt >= 0) {
      sight.hasDead = true;
      continue;
    }
    const def = SPECIES[animal.species];
    sight.animals.push({ x: animal.x, y: animal.y, interest: def.interest, cuteness: def.cuteness });
    sums.set(animal.enclosureId, (sums.get(animal.enclosureId) ?? 0) + animal.wellbeing);
  }
  for (const [id, sight] of sights) {
    if (sight.animals.length > 0) sight.avgWellbeing = (sums.get(id) ?? 0) / sight.animals.length;
  }
  return sights;
}

export function updateVisitorAI(state: GameState): void {
  const { hour } = timeOfDay(state.tick);
  const ctx: AiContext = {
    state,
    network: visitorNetwork(state),
    sights: enclosureSights(state),
    closing: hour >= balance.visitors.closeHour || hour < balance.visitors.openHour,
    benches: null,
  };
  for (const visitor of Object.values(state.visitors)) {
    visitor.prevX = visitor.x;
    visitor.prevY = visitor.y;
    updateVisitor(ctx, visitor);
  }
}

function updateVisitor(ctx: AiContext, visitor: Visitor): void {
  const v = balance.visitors;
  const def = VISITOR_KINDS[visitor.kind];
  if (visitor.state !== 'eating') visitor.hunger = Math.max(0, visitor.hunger - def.hungerLossPerTick);
  if (visitor.state !== 'eating' && visitor.state !== 'resting') {
    visitor.energy = Math.max(0, visitor.energy - def.energyLossPerTick);
  }
  const patienceLoss = def.patienceLossPerTick * (isTired(visitor) ? v.tiredPatienceFactor : 1);
  if (visitor.hunger < v.hungryBelow && ctx.network.snackSpots.length === 0) {
    visitor.satisfaction = Math.max(0, visitor.satisfaction - v.hungryNoFoodLossPerTick);
  }
  if (ctx.closing && visitor.state !== 'leaving') startLeaving(ctx, visitor, 'closing');
  if (wantsToEat(ctx, visitor)) {
    if (visitor.state === 'viewing') finishView(visitor);
    goEat(ctx, visitor);
  }

  switch (visitor.state) {
    case 'arriving':
    case 'wandering':
      decide(ctx, visitor);
      return;
    case 'walkingToView':
    case 'walkingToFood':
    case 'walkingToBench':
    case 'leaving':
      visitor.patience = Math.max(0, visitor.patience - patienceLoss);
      travel(ctx, visitor);
      return;
    case 'viewing':
      view(ctx, visitor);
      return;
    case 'eating':
      if (--visitor.stateTicks <= 0) visitor.state = 'wandering';
      return;
    case 'resting':
      rest(visitor);
      return;
  }
}

/**
 * Un visiteur affamé qui peut atteindre un stand va manger, même en pleine observation ou sur le chemin
 * de la sortie après sa visite. Seuls la fermeture et un blocage l'en empêchent.
 */
function wantsToEat(ctx: AiContext, visitor: Readonly<Visitor>): boolean {
  if (ctx.closing || visitor.hunger >= balance.visitors.hungryBelow || ctx.network.snackSpots.length === 0) {
    return false;
  }
  switch (visitor.state) {
    case 'walkingToFood':
    case 'eating':
      return false;
    case 'leaving':
      return visitor.leaveReason === 'done' || visitor.leaveReason === 'impatient';
    default:
      return true;
  }
}

function goEat(ctx: AiContext, visitor: Visitor): void {
  visitor.state = 'walkingToFood';
  visitor.targetEnclosure = 0;
  requestPath(visitor, nearest(ctx.state, currentTile(ctx.state, visitor), ctx.network.snackSpots));
}

/** Choisit la suite : partir, se reposer ou aller voir un enclos (la faim est traitée avant, par `wantsToEat`). */
function decide(ctx: AiContext, visitor: Visitor): void {
  const v = balance.visitors;
  if (visitor.seen.length >= visitor.viewsWanted) {
    startLeaving(ctx, visitor, 'done');
    return;
  }
  if (isTired(visitor) && ctx.network.benchSpots.length > 0) {
    ctx.benches ??= benchUse(ctx.state);
    const spot = freeBench(ctx.state, ctx.network, ctx.benches, visitor);
    if (spot >= 0) {
      ctx.benches.set(spot, (ctx.benches.get(spot) ?? 0) + 1);
      visitor.state = 'walkingToBench';
      visitor.targetEnclosure = 0;
      requestPath(visitor, spot);
      return;
    }
  }
  if (visitor.patience <= 0) {
    visitor.satisfaction = Math.max(0, visitor.satisfaction - v.impatientPenalty);
    startLeaving(ctx, visitor, 'impatient');
    return;
  }
  const here = currentTile(ctx.state, visitor);
  const target = pickEnclosure(ctx, visitor, here);
  if (target === 0) {
    // Rien à voir : le visiteur attend en perdant patience.
    visitor.state = 'wandering';
    visitor.patience = Math.max(0, visitor.patience - v.nothingToSeeLossPerTick);
    return;
  }
  const spots = ctx.network.viewSpots.get(target) as number[];
  visitor.state = 'walkingToView';
  visitor.targetEnclosure = target;
  requestPath(visitor, spots[nextInt(ctx.state, 0, spots.length)] as number);
}

/** Intérêt d'un enclos pour ce visiteur : les enfants comptent la « mignonnerie ». */
export function sightInterest(visitor: Readonly<Visitor>, sight: Readonly<EnclosureSight>): number {
  const weight = VISITOR_KINDS[visitor.kind].cutenessWeight;
  let best = 0;
  for (const animal of sight.animals) {
    best = Math.max(best, (1 - weight) * animal.interest + weight * 10 * animal.cuteness);
  }
  return best;
}

/** Tirage pondéré d'un enclos à voir : intérêt, bien-être, distance, lassitude. 0 si aucun. */
function pickEnclosure(ctx: AiContext, visitor: Visitor, here: number): EnclosureId {
  const v = balance.visitors;
  const candidates: EnclosureId[] = [];
  const weights: number[] = [];
  let total = 0;
  for (const [enclosureId, spots] of ctx.network.viewSpots) {
    const sight = ctx.sights.get(enclosureId);
    if (!sight || sight.animals.length === 0) continue;
    const seenCount = visitor.seen.filter((id) => id === enclosureId).length;
    const distance = manhattan(ctx.state, here, nearest(ctx.state, here, spots));
    const weight =
      sightInterest(visitor, sight) *
      Math.max(0.1, sight.avgWellbeing / 100) *
      v.boredomFactor ** seenCount *
      (1 / (1 + distance / v.distanceScale));
    candidates.push(enclosureId);
    weights.push(weight);
    total += weight;
  }
  if (candidates.length === 0) return 0;
  let roll = nextFloat(ctx.state) * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i] as number;
    if (roll < 0) return candidates[i] as EnclosureId;
  }
  return candidates[candidates.length - 1] as EnclosureId;
}

function startLeaving(ctx: AiContext, visitor: Visitor, reason: VisitorLeaveReason): void {
  visitor.state = 'leaving';
  visitor.leaveReason ??= reason;
  visitor.targetEnclosure = 0;
  requestPath(visitor, ctx.network.exit);
}

/** Avance le long du trajet ; gère l'attente du calcul, l'échec (visiteur bloqué) et l'arrivée. */
function travel(ctx: AiContext, visitor: Visitor): void {
  const { world } = ctx.state;
  switch (visitor.pathStatus) {
    case 'none':
      requestPath(visitor, visitor.goal);
      return;
    case 'pending':
      return;
    case 'failed':
      blocked(ctx, visitor);
      return;
    case 'ready':
      break;
  }
  let step: number = VISITOR_KINDS[visitor.kind].walkSpeed;
  while (step > 0) {
    const next = visitor.path[0];
    if (next === undefined) {
      arrive(ctx, visitor);
      return;
    }
    if (!isVisitorWalkable(world, next)) {
      // Le chemin a changé sous ses pieds : nouveau calcul.
      requestPath(visitor, visitor.goal);
      return;
    }
    const tile = tileAt(world, next);
    const dx = tile.x + 0.5 - visitor.x;
    const dy = tile.y + 0.5 - visitor.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0) visitor.heading = Math.atan2(dy, dx);
    if (distance <= step) {
      visitor.x = tile.x + 0.5;
      visitor.y = tile.y + 0.5;
      visitor.path.shift();
      step -= distance;
    } else {
      visitor.x += (dx / distance) * step;
      visitor.y += (dy / distance) * step;
      step = 0;
    }
  }
  if (visitor.blockedTicks > 0) visitor.blockedTicks = 0;
}

/** Aucun trajet : le visiteur tente de sortir, réessaie régulièrement, puis abandonne. */
function blocked(ctx: AiContext, visitor: Visitor): void {
  const v = balance.visitors;
  visitor.blockedTicks += 1;
  if (visitor.blockedTicks >= v.blockedGiveUpTicks) {
    visitor.satisfaction = Math.min(visitor.satisfaction, 10);
    visitor.leaveReason = 'blocked';
    depart(ctx.state, visitor);
    return;
  }
  if (visitor.state !== 'leaving') {
    startLeaving(ctx, visitor, 'blocked');
    return;
  }
  if (visitor.blockedTicks % 20 === 0) requestPath(visitor, ctx.network.exit);
}

function arrive(ctx: AiContext, visitor: Visitor): void {
  const { state } = ctx;
  const v = balance.visitors;
  visitor.pathStatus = 'none';
  switch (visitor.state) {
    case 'walkingToView': {
      const facing = ctx.network.viewFacing.get(visitor.goal);
      if (facing !== undefined) {
        const tile = tileAt(state.world, facing);
        visitor.heading = Math.atan2(tile.y + 0.5 - visitor.y, tile.x + 0.5 - visitor.x);
      }
      visitor.state = 'viewing';
      visitor.stateTicks = nextInt(state, v.viewTicks[0], v.viewTicks[1]);
      const sight = ctx.sights.get(visitor.targetEnclosure);
      if (sight && isSad(sight)) react(state, visitor, 'sad');
      else if (sight && visibility(visitor, sight) > 0) react(state, visitor, 'joy');
      return;
    }
    case 'walkingToFood': {
      // Même source que `snackSpots` : un visiteur arrivé sur une tuile de stand trouve toujours son stand.
      const stand = ctx.network.snackFacing.get(currentTile(state, visitor));
      if (stand === undefined) {
        // Le stand a disparu pendant le trajet : `decide` (ou `wantsToEat`) choisira la suite.
        visitor.state = 'wandering';
        return;
      }
      const tile = tileAt(state.world, stand);
      visitor.heading = Math.atan2(tile.y + 0.5 - visitor.y, tile.x + 0.5 - visitor.x);
      visitor.state = 'eating';
      visitor.stateTicks = v.eatTicks;
      visitor.hunger = 100;
      const income = Math.round(balance.economy.snackPrice * balance.economy.snackMargin);
      state.money += income;
      state.stats.today.snacks += income;
      return;
    }
    case 'walkingToBench':
      sitDown(state, ctx.network, visitor);
      return;
    case 'leaving':
      if (currentTile(state, visitor) === ctx.network.exit) depart(state, visitor);
      else requestPath(visitor, ctx.network.exit);
      return;
    default:
      visitor.state = 'wandering';
  }
}

function isSad(sight: Readonly<EnclosureSight>): boolean {
  return (
    sight.hasDead || (sight.animals.length > 0 && sight.avgWellbeing < balance.visitors.sadWellbeingBelow)
  );
}

/** Part des animaux de l'enclos visibles depuis la position du visiteur (0 à 1, saturée à 2 animaux). */
export function visibility(visitor: Readonly<Visitor>, sight: Readonly<EnclosureSight>): number {
  const radius = balance.visitors.visibleRadius;
  let visible = 0;
  for (const animal of sight.animals) {
    if (Math.hypot(animal.x - visitor.x, animal.y - visitor.y) <= radius) visible++;
  }
  return Math.min(1, visible / 2);
}

/** Satisfaction gagnée par tick devant cet enclos (docs/02 : bien-être et visibilité). */
export function viewGain(visitor: Readonly<Visitor>, sight: Readonly<EnclosureSight>): number {
  if (sight.animals.length === 0) return 0;
  return (
    balance.visitors.viewGainPerTick *
    (sight.avgWellbeing / 100) *
    (0.3 + 0.7 * visibility(visitor, sight)) *
    (sightInterest(visitor, sight) / 10)
  );
}

function view(ctx: AiContext, visitor: Visitor): void {
  const v = balance.visitors;
  const sight = ctx.sights.get(visitor.targetEnclosure);
  if (sight) {
    const sad = isSad(sight);
    const delta = sad ? -v.sadViewLossPerTick : viewGain(visitor, sight);
    visitor.satisfaction = Math.min(100, Math.max(0, visitor.satisfaction + delta));
    // Éclats de joie de temps en temps quand un animal est tout près.
    if (!sad && visibility(visitor, sight) >= 1 && nextFloat(ctx.state) < 0.01)
      react(ctx.state, visitor, 'joy');
  }
  if (--visitor.stateTicks > 0) return;
  finishView(visitor);
}

/** Fin d'observation (complète ou écourtée par la faim) : l'enclos compte comme vu. */
function finishView(visitor: Visitor): void {
  visitor.seen.push(visitor.targetEnclosure);
  visitor.patience = Math.min(100, visitor.patience + balance.visitors.viewPatienceGain);
  visitor.state = 'wandering';
}

function react(state: GameState, visitor: Visitor, reaction: Visitor['reaction']): void {
  visitor.reaction = reaction;
  visitor.reactionTick = state.tick;
}

/** Le visiteur sort du zoo (GONE) : sa satisfaction finale alimente la note. */
function depart(state: GameState, visitor: Visitor): void {
  state.stats.today.satisfactionSum += visitor.satisfaction;
  state.stats.today.departures += 1;
  delete state.visitors[visitor.id];
}
