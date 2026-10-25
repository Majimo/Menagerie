import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/sim/commands';
import { dispatchCommand, stepSimulation } from '../../src/sim/simulation';
import { createInitialState, SAVE_VERSION } from '../../src/sim/state';
import { rectangleOutline } from './helpers';

/** Partie scriptée : quelques commandes intercalées entre des ticks. */
function play(seed: number): ReturnType<typeof createInitialState> {
  const state = createInitialState(seed);
  const commands: Command[] = [
    ...rectangleOutline(8, 8, 12, 12).map((edge) => ({ type: 'PlaceFence' as const, edge })),
    { type: 'PaintBiome', tile: { x: 9, y: 9 }, biome: 'savanna' },
    { type: 'PlacePath', tile: { x: 8, y: 13 } },
    { type: 'Demolish', target: { kind: 'fence', edge: { axis: 'h', x: 8, y: 8 } } },
  ];
  for (const command of commands) {
    dispatchCommand(state, command);
    for (let i = 0; i < 7; i++) stepSimulation(state);
  }
  return state;
}

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
    const state = play(1);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('déterminisme : même seed et mêmes commandes donnent le même état', () => {
    expect(play(123)).toEqual(play(123));
  });
});

describe('simulation avec animaux', () => {
  function zoo(seed: number): ReturnType<typeof createInitialState> {
    const state = createInitialState(seed);
    state.money = 1_000_000;
    const commands: Command[] = [
      ...rectangleOutline(5, 5, 14, 14).map((edge) => ({ type: 'PlaceFence' as const, edge })),
      { type: 'PaintBiome', tile: { x: 5, y: 5 }, biome: 'water' },
      { type: 'PlaceBuilding', tile: { x: 14, y: 14 }, kind: 'feeder' },
      { type: 'BuyAnimal', tile: { x: 8, y: 8 }, species: 'zebra' },
      { type: 'BuyAnimal', tile: { x: 9, y: 8 }, species: 'zebra' },
      { type: 'BuyAnimal', tile: { x: 10, y: 10 }, species: 'giraffe' },
    ];
    for (const command of commands) dispatchCommand(state, command);
    for (let i = 0; i < 2500; i++) stepSimulation(state);
    return state;
  }

  it('déterminisme avec des animaux qui errent', () => {
    expect(zoo(7)).toEqual(zoo(7));
    expect(zoo(7)).not.toEqual(zoo(8));
  });

  it("l'état avec animaux et objets reste sérialisable", () => {
    const state = zoo(3);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
