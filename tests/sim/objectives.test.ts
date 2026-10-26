import { describe, expect, it } from 'vitest';
import { FIRST_STEPS } from '../../src/sim/data/scenario';
import { stepSimulation } from '../../src/sim/simulation';
import { createInitialState } from '../../src/sim/state';
import { currentObjective, daysBeforeBankruptcy, updateObjectives } from '../../src/sim/systems/objectives';
import { buildEnclosure, buildVisitorZoo, buyAnimal, runDays } from './helpers';

/** Avance jusqu'à la prochaine vérification des objectifs. */
function checkObjectives(state: ReturnType<typeof createInitialState>): void {
  for (let i = 0; i < FIRST_STEPS.checkEveryTicks; i++) stepSimulation(state);
}

describe('objectifs du scénario « Premiers pas »', () => {
  it('commence au premier objectif, aucun atteint', () => {
    const state = createInitialState(1);
    expect(currentObjective(state)).toBe(0);
    expect(state.scenario.completedAt.every((t) => t === -1)).toBe(true);
  });

  it('valide « 2 espèces » quand deux espèces vivent dans le zoo, et passe au suivant', () => {
    const state = createInitialState(1);
    buildVisitorZoo(state);
    checkObjectives(state);
    expect(currentObjective(state)).toBe(0);
    buildEnclosure(state, [5, 5, 14, 14], { biome: 'savanna' });
    buyAnimal(state, 'giraffe', { x: 8, y: 8 });
    checkObjectives(state);
    expect(state.scenario.completedAt[0]).toBeGreaterThan(0);
    expect(currentObjective(state)).toBe(1);
  });

  it('les objectifs se valident dans l’ordre : un seul par vérification', () => {
    const state = createInitialState(1);
    state.stats.today.visitors = 150;
    state.stats.rating = 4.5;
    buildEnclosure(state, [5, 5, 14, 14], { biome: 'savanna' });
    for (const species of ['zebra', 'giraffe'] as const) buyAnimal(state, species, { x: 8, y: 8 });
    buildEnclosure(state, [20, 5, 30, 15], { biome: 'savanna' });
    buyAnimal(state, 'lion', { x: 24, y: 9 });
    buildEnclosure(state, [35, 5, 45, 15], { biome: 'forest' });
    buyAnimal(state, 'panda', { x: 40, y: 9 });
    const done = [];
    for (let i = 0; i < 4; i++) {
      state.tick += FIRST_STEPS.checkEveryTicks;
      state.stats.rating = 4.5;
      updateObjectives(state);
      done.push(currentObjective(state));
    }
    expect(done).toEqual([1, 2, 3, -1]);
  });

  it('« 4 espèces et 4 étoiles » demande les deux conditions en même temps', () => {
    const state = createInitialState(1);
    state.scenario.completedAt = [1, 1, 1, -1];
    buildEnclosure(state, [5, 5, 14, 14], { biome: 'savanna' });
    for (const species of ['zebra', 'giraffe'] as const) buyAnimal(state, species, { x: 8, y: 8 });
    buildEnclosure(state, [20, 5, 30, 15], { biome: 'savanna' });
    buyAnimal(state, 'lion', { x: 24, y: 9 });
    state.tick = FIRST_STEPS.checkEveryTicks;
    state.stats.rating = 4.5;
    updateObjectives(state);
    expect(currentObjective(state)).toBe(3);
  });
});

describe('faillite', () => {
  it('perd après 10 fins de journée consécutives dans le rouge', () => {
    const state = createInitialState(1);
    buildVisitorZoo(state);
    state.money = -1_000_000;
    runDays(state, 1);
    expect(state.scenario.debtDays).toBe(1);
    expect(daysBeforeBankruptcy(state)).toBe(FIRST_STEPS.bankruptcyDays - 1);
    runDays(state, FIRST_STEPS.bankruptcyDays - 2);
    expect(state.scenario.outcome).toBe('playing');
    runDays(state, 1);
    expect(state.scenario.outcome).toBe('lost');
  });

  it('un jour terminé dans le vert remet le compteur à zéro', () => {
    const state = createInitialState(1);
    buildVisitorZoo(state);
    state.money = -1_000_000;
    runDays(state, 3);
    expect(state.scenario.debtDays).toBe(3);
    state.money = 1_000_000;
    runDays(state, 1);
    expect(state.scenario.debtDays).toBe(0);
    expect(daysBeforeBankruptcy(state)).toBeNull();
  });
});
