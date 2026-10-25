import { describe, expect, it } from 'vitest';
import { animalStatus } from '../../src/sim/entities';
import { timeOfDay } from '../../src/sim/time';
import { runScenario, scenarios } from '../e2e/scenarios';

// Les scénarios de capture doivent montrer ce pour quoi ils existent : on le vérifie sans navigateur.

describe('scénarios de capture', () => {
  it('four-species : les 4 espèces, toutes contentes, en plein jour', () => {
    const state = runScenario(scenarios['four-species']);
    const animals = Object.values(state.animals);
    expect(new Set(animals.map((a) => a.species))).toEqual(new Set(['zebra', 'giraffe', 'lion', 'panda']));
    expect(animals.map(animalStatus).every((s) => s === 'content')).toBe(true);
    expect(timeOfDay(state.tick).night).toBe(false);
  });

  it('animal-needs : chaque état visible est représenté, de jour', () => {
    const state = runScenario(scenarios['animal-needs']);
    const statuses = Object.values(state.animals).map((a) => `${a.species}:${animalStatus(a)}`);
    expect(statuses).toEqual(
      expect.arrayContaining([
        'zebra:dead',
        'lion:sick',
        'giraffe:thirsty',
        'panda:hungry',
        'zebra:unhappy',
        'zebra:content',
      ]),
    );
    expect(timeOfDay(state.tick).sleeping).toBe(false);
  });
});
