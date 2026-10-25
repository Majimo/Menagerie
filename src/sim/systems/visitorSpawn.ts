import { balance } from '../data/balance';
import { SPECIES_IDS, type SpeciesId } from '../data/species';
import { VISITOR_KINDS, VISITOR_KINDS_LIST, type VisitorKind } from '../data/visitors';
import { createVisitor } from '../entities/visitors';
import { nextFloat } from '../rng';
import type { GameState } from '../state';
import { timeOfDay } from '../time';
import { visitorNetwork } from '../world/visitorNetwork';

// Système `visitorSpawn` : arrivées à l'entrée pendant les heures d'ouverture, paiement du billet.
// visiteurs par jour = base × f(note) × f(prix du billet) × f(diversité des espèces visibles) (docs/02).

/** Pourquoi personne ne vient, le cas échéant. */
export type NoVisitorsReason = 'nothingToSee' | 'exitUnreachable';

export interface VisitorDemand {
  perDay: number;
  ratingFactor: number;
  priceFactor: number;
  diversityFactor: number;
  /** Prix au-delà duquel les arrivées baissent. */
  fairPrice: number;
  /** Espèces vivantes visibles depuis un chemin relié à l'entrée. */
  visibleSpecies: SpeciesId[];
  reason: NoVisitorsReason | null;
}

/** Facteur prix : 1 au prix juste, plus bas au-dessus, un peu plus haut en dessous. */
export function priceFactor(price: number, rating: number): number {
  const v = balance.visitors;
  const fair = v.fairPriceBase + v.fairPricePerStar * rating;
  const factor = 1 - (v.priceSensitivity * (price - fair)) / fair;
  return Math.min(v.priceFactorMax, Math.max(v.priceFactorMin, factor));
}

export function visitorDemand(state: Readonly<GameState>, price = state.ticketPrice): VisitorDemand {
  const v = balance.visitors;
  const network = visitorNetwork(state);
  const visible = new Set<SpeciesId>();
  for (const animal of Object.values(state.animals)) {
    if (animal.diedAt < 0 && network.viewSpots.has(animal.enclosureId)) visible.add(animal.species);
  }
  const visibleSpecies = SPECIES_IDS.filter((id) => visible.has(id));
  const rating = state.stats.rating;
  const ratingFactor = rating / 3;
  const priceFx = priceFactor(price, rating);
  const diversityFactor = 0.4 + 0.6 * Math.min(1, visibleSpecies.length / v.diversityCap);
  const reason: NoVisitorsReason | null =
    visibleSpecies.length === 0 ? 'nothingToSee' : network.exitReachable ? null : 'exitUnreachable';
  return {
    perDay: reason ? 0 : v.basePerDay * ratingFactor * priceFx * diversityFactor,
    ratingFactor,
    priceFactor: priceFx,
    diversityFactor,
    fairPrice: v.fairPriceBase + v.fairPricePerStar * rating,
    visibleSpecies,
    reason,
  };
}

/** Le zoo accueille de nouveaux visiteurs à cette heure. */
export function arrivalsOpen(tick: number): boolean {
  const { hour } = timeOfDay(tick);
  return hour >= balance.visitors.openHour && hour < balance.visitors.lastArrivalHour;
}

export function updateVisitorSpawn(state: GameState): void {
  const v = balance.visitors;
  if (!arrivalsOpen(state.tick)) return;
  const { perDay } = visitorDemand(state);
  if (perDay <= 0) return;
  const arrivalTicks = ((v.lastArrivalHour - v.openHour) / 24) * balance.time.ticksPerDay;
  const rate = perDay / arrivalTicks;
  let count = Math.floor(rate) + (nextFloat(state) < rate % 1 ? 1 : 0);
  const network = visitorNetwork(state);
  while (count-- > 0 && Object.keys(state.visitors).length < v.maxActive) {
    const kind = pickKind(nextFloat(state));
    createVisitor(state, kind, network.entrance);
    const ticket = Math.round(state.ticketPrice * VISITOR_KINDS[kind].ticketRatio);
    state.money += ticket;
    state.stats.today.tickets += ticket;
    state.stats.today.visitors += 1;
  }
}

function pickKind(roll: number): VisitorKind {
  let acc = 0;
  for (const kind of VISITOR_KINDS_LIST) {
    acc += VISITOR_KINDS[kind].share;
    if (roll < acc) return kind;
  }
  return 'adult';
}
