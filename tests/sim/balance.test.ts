import { describe, expect, it } from 'vitest';
import { FIRST_STEPS } from '../../src/sim/data/scenario';
import { BAD, GOOD, playStrategy } from './strategies';

// Test de rentabilité (docs/05, itération 4) : le scénario « Premiers pas » est gagnable avec une bonne stratégie
// et perdable avec une mauvaise. Si un rééquilibrage casse ce test, c'est le ressenti du jeu qui change.

describe('équilibrage du scénario « Premiers pas »', () => {
  it('bonne stratégie : tous les objectifs en moins de 10 jours, jamais dans le rouge, rentable ensuite', () => {
    const { state, days } = playStrategy(GOOD, 20);
    expect(state.scenario.outcome).toBe('playing');
    const lastObjective = Math.max(...state.scenario.completedAt);
    expect(state.scenario.completedAt.every((tick) => tick >= 0)).toBe(true);
    expect(lastObjective).toBeLessThan(10 * 1200);
    expect(days.every((d) => d.money >= 0)).toBe(true);
    // Une fois le zoo complet (jour 6), chaque journée rapporte.
    expect(days.slice(6).every((d) => d.net > 0)).toBe(true);
    expect(state.money).toBeGreaterThan(20_000);
  });

  it('mauvaise stratégie : animaux entassés et billet trop cher, faillite en moins de 20 jours', () => {
    const { state, days } = playStrategy(BAD, 30);
    expect(state.scenario.outcome).toBe('lost');
    expect(days.length).toBeLessThan(20);
    expect(state.scenario.debtDays).toBe(FIRST_STEPS.bankruptcyDays);
  });

  it('même au prix juste, un zoo mal conçu perd de l’argent chaque jour et finit en faillite', () => {
    const { state, days } = playStrategy({ ...BAD, ticket: 'fair' }, 30);
    expect(days.slice(1).every((d) => d.net < 0)).toBe(true);
    expect(state.scenario.outcome).toBe('lost');
  });
});
