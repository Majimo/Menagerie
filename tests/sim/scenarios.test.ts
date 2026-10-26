import { describe, expect, it } from 'vitest';
import { zooAlerts } from '../../src/sim/alerts';
import { balance } from '../../src/sim/data/balance';
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

  it('busy-day : ~150 visiteurs, adultes et enfants, ~40 animaux contents, sans alerte, de jour', () => {
    const state = runScenario(scenarios['busy-day']);
    const visitors = Object.values(state.visitors);
    expect(visitors.length).toBeGreaterThanOrEqual(130);
    expect(visitors.length).toBeLessThanOrEqual(190);
    expect(visitors.some((v) => v.kind === 'child')).toBe(true);
    expect(visitors.filter((v) => v.state === 'viewing').length).toBeGreaterThan(20);
    const animals = Object.values(state.animals);
    expect(animals).toHaveLength(40);
    expect(animals.every((a) => animalStatus(a) === 'content')).toBe(true);
    const alerts = zooAlerts(state);
    expect(alerts.unreachableEnclosures).toEqual([]);
    expect(alerts.blockedVisitors).toBe(0);
    expect(timeOfDay(state.tick).night).toBe(false);
  });

  it('snack-time : les visiteurs affamés vont aux stands, certains mangent, la recette snacks monte', () => {
    const state = runScenario(scenarios['snack-time']);
    const visitors = Object.values(state.visitors);
    const hungry = visitors.filter((v) => v.hunger < balance.visitors.hungryBelow && v.state !== 'eating');
    expect(hungry.length).toBeGreaterThan(0);
    expect(hungry.every((v) => v.state === 'walkingToFood')).toBe(true);
    expect(visitors.filter((v) => v.state === 'eating').length).toBeGreaterThan(0);
    expect(state.stats.today.snacks).toBeGreaterThan(0);
    expect(timeOfDay(state.tick).night).toBe(false);
  });

  it('crisis : argent négatif, animaux morts, enclos sans chemin, visiteurs bloqués, de jour', () => {
    const state = runScenario(scenarios.crisis);
    expect(state.money).toBeLessThan(0);
    const statuses = Object.values(state.animals).map(animalStatus);
    expect(statuses).toContain('dead');
    const alerts = zooAlerts(state);
    expect(alerts.unreachableEnclosures).toHaveLength(1);
    expect(alerts.blockedVisitors).toBeGreaterThan(5);
    expect(alerts.deficit).toBe(true);
    expect(timeOfDay(state.tick).night).toBe(false);
  });
});
