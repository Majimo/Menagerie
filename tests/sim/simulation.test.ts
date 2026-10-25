import { describe, expect, it } from 'vitest';
import { stepSimulation } from '../../src/sim/simulation';
import { createInitialState, SAVE_VERSION } from '../../src/sim/state';

describe('simulation', () => {
  it('crée un état initial versionné, au tick 0', () => {
    const state = createInitialState();
    expect(state.saveVersion).toBe(SAVE_VERSION);
    expect(state.tick).toBe(0);
  });

  it('avance le compteur de ticks', () => {
    const state = createInitialState();
    for (let i = 0; i < 10; i++) stepSimulation(state);
    expect(state.tick).toBe(10);
  });

  it("l'état est sérialisable en JSON sans perte", () => {
    const state = createInitialState();
    stepSimulation(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
