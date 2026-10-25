import { balance } from '../data/balance';
import type { GameState } from '../state';

// Système `rating` : note du zoo (1 à 5 étoiles), docs/02. Moyenne pondérée du bien-être des animaux,
// de la satisfaction des visiteurs repartis (7 derniers jours) et de la diversité, moins les morts récentes.

export interface RatingBreakdown {
  rating: number;
  /** Bien-être moyen des animaux vivants (0 à 100). */
  wellbeing: number;
  /** Satisfaction moyenne des visiteurs repartis sur 7 jours (0 à 100). */
  satisfaction: number;
  /** Diversité, 0 à 1. */
  diversity: number;
  recentDeaths: number;
}

export function ratingBreakdown(state: Readonly<GameState>): RatingBreakdown {
  const r = balance.rating;
  let wellbeingSum = 0;
  let alive = 0;
  const species = new Set<string>();
  for (const animal of Object.values(state.animals)) {
    if (animal.diedAt >= 0) continue;
    wellbeingSum += animal.wellbeing;
    alive++;
    species.add(animal.species);
  }
  const wellbeing = alive > 0 ? wellbeingSum / alive : 0;
  let satisfactionSum = 0;
  let departures = 0;
  for (const ledger of [...state.stats.history, state.stats.today]) {
    satisfactionSum += ledger.satisfactionSum;
    departures += ledger.departures;
  }
  const satisfaction = departures > 0 ? satisfactionSum / departures : r.defaultSatisfaction;
  const diversity = Math.min(1, species.size / balance.visitors.diversityCap);
  const since = state.tick - r.deathMemoryDays * balance.time.ticksPerDay;
  const recentDeaths = state.stats.deathTicks.filter((tick) => tick > since).length;
  const score =
    r.weights.wellbeing * (wellbeing / 100) +
    r.weights.satisfaction * (satisfaction / 100) +
    r.weights.diversity * diversity;
  const rating = Math.min(5, Math.max(1, 1 + 4 * score - r.deathPenalty * recentDeaths));
  return { rating, wellbeing, satisfaction, diversity, recentDeaths };
}

export function updateRating(state: GameState): void {
  if (state.tick % balance.rating.everyTicks !== 0) return;
  const breakdown = ratingBreakdown(state);
  state.stats.rating = breakdown.rating;
  const since = state.tick - balance.rating.deathMemoryDays * balance.time.ticksPerDay;
  if (state.stats.deathTicks.some((tick) => tick <= since))
    state.stats.deathTicks = state.stats.deathTicks.filter((tick) => tick > since);
}
