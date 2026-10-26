import { describe, expect, it } from 'vitest';
import { balance } from '../../src/sim/data/balance';
import { createInitialState } from '../../src/sim/state';
import { ratingBreakdown, ratingFromScore, updateRating } from '../../src/sim/systems/rating';
import { buildEnclosure, buyAnimal } from './helpers';

describe('note du zoo', () => {
  it('un zoo qui ouvre part de la note de départ ; vide, il vise une étoile', () => {
    const state = createInitialState(1);
    expect(state.stats.rating).toBe(balance.rating.startRating);
    expect(ratingBreakdown(state).rating).toBe(1);
  });

  it('combine bien-être, satisfaction des visiteurs repartis et diversité', () => {
    const state = createInitialState(1);
    buildEnclosure(state, [2, 2, 12, 12], { biome: 'savanna' });
    for (const [species, x] of [
      ['zebra', 3],
      ['giraffe', 5],
    ] as const)
      buyAnimal(state, species, { x, y: 4 });
    for (const animal of Object.values(state.animals)) animal.wellbeing = 80;
    state.stats.today.satisfactionSum = 90 * 10;
    state.stats.today.departures = 10;
    const { rating, wellbeing, satisfaction, diversity } = ratingBreakdown(state);
    expect(wellbeing).toBe(80);
    expect(satisfaction).toBe(90);
    expect(diversity).toBe(0.5);
    const score = 0.4 * 0.8 + 0.4 * 0.9 + 0.2 * 0.5;
    const floor = balance.rating.scoreFloor;
    expect(rating).toBeCloseTo(1 + (4 * (score - floor)) / (1 - floor));
    expect(rating).toBeCloseTo(ratingFromScore(score, 0));
  });

  it('la note rejoint la note visée peu à peu : vite en baisse, lentement en hausse', () => {
    const state = createInitialState(1);
    buildEnclosure(state, [2, 2, 12, 12], { biome: 'savanna' });
    buyAnimal(state, 'zebra', { x: 3, y: 4 });
    for (const animal of Object.values(state.animals)) animal.wellbeing = 100;
    state.stats.today.satisfactionSum = 100 * 10;
    state.stats.today.departures = 10;
    state.stats.rating = 1;
    const target = ratingBreakdown(state).rating;
    expect(target).toBeGreaterThan(4);
    const { everyTicks } = balance.rating;
    const ticksPerDay = balance.time.ticksPerDay;
    for (let tick = everyTicks; tick <= ticksPerDay; tick += everyTicks) {
      state.tick = tick;
      updateRating(state);
    }
    expect(state.stats.rating).toBeCloseTo(Math.min(target, 1 + balance.rating.risePerDay));
    state.stats.rating = 5;
    for (let tick = ticksPerDay + everyTicks; tick <= ticksPerDay * 1.5; tick += everyTicks) {
      state.tick = tick;
      updateRating(state);
    }
    expect(state.stats.rating).toBeCloseTo(Math.max(target, 5 - balance.rating.fallPerDay / 2));
  });

  it('tient compte des 7 derniers jours de visiteurs', () => {
    const state = createInitialState(1);
    state.stats.history.push({ ...state.stats.today, day: 0, satisfactionSum: 20 * 10, departures: 10 });
    state.stats.today.satisfactionSum = 80 * 30;
    state.stats.today.departures = 30;
    expect(ratingBreakdown(state).satisfaction).toBe(65);
  });

  it('pénalise les morts récentes, puis les oublie', () => {
    const state = createInitialState(1);
    state.stats.today.satisfactionSum = 100;
    state.stats.today.departures = 1;
    const healthy = ratingBreakdown(state).rating;
    state.stats.deathTicks.push(0);
    expect(ratingBreakdown(state).rating).toBeCloseTo(Math.max(1, healthy - balance.rating.deathPenalty));
    state.tick = balance.rating.deathMemoryDays * balance.time.ticksPerDay + 10;
    updateRating(state);
    expect(state.stats.deathTicks).toEqual([]);
  });

  it('reste entre 1 et 5 étoiles', () => {
    const state = createInitialState(1);
    state.stats.deathTicks.push(0, 0, 0, 0, 0, 0);
    expect(ratingBreakdown(state).rating).toBe(1);
  });
});
