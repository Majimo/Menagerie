import { describe, expect, it } from 'vitest';
import { balance } from '../../src/sim/data/balance';
import { BUILDINGS } from '../../src/sim/data/buildings';
import { createVisitor } from '../../src/sim/entities/visitors';
import { dispatchCommand, stepSimulation } from '../../src/sim/simulation';
import { createInitialState, type GameState } from '../../src/sim/state';
import { benchUse } from '../../src/sim/systems/visitorRest';
import { tileIndex } from '../../src/sim/world/grid';
import { visitorNetwork } from '../../src/sim/world/visitorNetwork';
import { buildVisitorZoo } from './helpers';

const BENCH = { x: 20, y: 40 };

function zooWithBench(seed: number): GameState {
  const state = createInitialState(seed);
  buildVisitorZoo(state);
  const result = dispatchCommand(state, { type: 'PlaceBuilding', kind: 'bench', tile: BENCH });
  if (!result.ok) throw new Error(result.error);
  return state;
}

describe('bancs', () => {
  it('se posent au bord d’un chemin et créent une place assise', () => {
    const state = zooWithBench(1);
    const network = visitorNetwork(state);
    expect(network.benchSpots).toContain(tileIndex(state.world, { x: 21, y: 40 }));
    expect(dispatchCommand(state, { type: 'PlaceBuilding', kind: 'bench', tile: { x: 5, y: 5 } }).ok).toBe(
      false,
    );
  });

  it('un visiteur fatigué va s’asseoir, puis repart reposé et plus satisfait', () => {
    const state = zooWithBench(1);
    const network = visitorNetwork(state);
    const visitor = createVisitor(state, 'adult', network.entrance);
    visitor.energy = 10;
    visitor.hunger = 100;
    const states = new Set<string>();
    for (let i = 0; i < 200; i++) {
      stepSimulation(state);
      states.add(visitor.state);
      if (visitor.state === 'resting') break;
    }
    expect(states).toContain('walkingToBench');
    expect(visitor.state).toBe('resting');
    const satisfaction = visitor.satisfaction;
    for (let i = 0; i < balance.visitors.restTicks; i++) stepSimulation(state);
    expect(visitor.energy).toBeGreaterThan(balance.visitors.tiredBelow);
    expect(visitor.satisfaction).toBeGreaterThan(satisfaction);
  });

  it('ne dépasse jamais le nombre de places', () => {
    const state = zooWithBench(2);
    const network = visitorNetwork(state);
    const seats = BUILDINGS.bench.seats;
    for (let i = 0; i < 8; i++) {
      const visitor = createVisitor(state, 'adult', network.entrance);
      visitor.energy = 5;
      visitor.hunger = 100;
    }
    let maxUse = 0;
    for (let i = 0; i < 300; i++) {
      stepSimulation(state);
      for (const count of benchUse(state).values()) maxUse = Math.max(maxUse, count);
    }
    expect(maxUse).toBe(seats);
  });

  it('fatigué et à bout de patience : sans banc il part mécontent, avec un banc il se repose et reste', () => {
    const outcome = (withBench: boolean) => {
      const state = withBench ? zooWithBench(3) : createInitialState(3);
      if (!withBench) buildVisitorZoo(state);
      const visitor = createVisitor(state, 'adult', visitorNetwork(state).entrance);
      visitor.patience = 0;
      visitor.energy = 10;
      visitor.hunger = 100;
      stepSimulation(state);
      return { state: visitor.state, reason: visitor.leaveReason };
    };
    expect(outcome(false)).toEqual({ state: 'leaving', reason: 'impatient' });
    expect(outcome(true)).toEqual({ state: 'walkingToBench', reason: null });
  });
});

describe('fatigue', () => {
  it('l’enfant se fatigue plus vite que l’adulte ; fatigué et sans banc, il perd patience deux fois plus vite', () => {
    const state = createInitialState(1);
    buildVisitorZoo(state);
    const entrance = visitorNetwork(state).entrance;
    const adult = createVisitor(state, 'adult', entrance);
    const child = createVisitor(state, 'child', entrance);
    for (const v of [adult, child]) v.hunger = 100;
    for (let i = 0; i < 100; i++) stepSimulation(state);
    expect(child.energy).toBeLessThan(adult.energy);
    const tired = createVisitor(state, 'adult', entrance);
    const rested = createVisitor(state, 'adult', entrance);
    tired.energy = 0;
    for (const v of [tired, rested]) {
      v.hunger = 100;
      v.state = 'leaving';
      v.goal = visitorNetwork(state).exit;
      v.pathStatus = 'pending';
    }
    const before = { tired: tired.patience, rested: rested.patience };
    for (let i = 0; i < 20; i++) stepSimulation(state);
    expect(before.tired - tired.patience).toBeCloseTo(2 * (before.rested - rested.patience));
  });
});
