import { describe, expect, it } from 'vitest';
import { zooAlerts } from '../../src/sim/alerts';
import { balance } from '../../src/sim/data/balance';
import { createVisitor } from '../../src/sim/entities';
import { dispatchCommand, stepSimulation } from '../../src/sim/simulation';
import { createInitialState, type GameState, type VisitorState } from '../../src/sim/state';
import { updateVisitorSpawn } from '../../src/sim/systems/visitorSpawn';
import { ticksUntilHour } from '../../src/sim/time';
import { tileIndex } from '../../src/sim/world/grid';
import { buildEnclosure, buildVisitorZoo, buyAnimal, placePath, runDays } from './helpers';

const entrance = tileIndex(balance.map, balance.map.entrance);

/** Zoo de référence sans arrivées spontanées : les visiteurs sont créés par le test. */
function quietZoo(): GameState {
  const state = createInitialState(7);
  buildVisitorZoo(state);
  state.ticketPrice = balance.economy.ticketPrice.max;
  state.stats.rating = 1;
  return state;
}

/** Fait avancer en neutralisant les arrivées (prix maximal et note minimale ne suffisent pas toujours). */
function stepWithoutArrivals(state: GameState, ticks: number): void {
  for (let i = 0; i < ticks; i++) {
    const before = state.nextVisitorId;
    stepSimulation(state);
    for (let id = before; id < state.nextVisitorId; id++) delete state.visitors[id];
  }
}

describe('visiteurs : machine à états', () => {
  it("arrive, va voir l'enclos, l'observe en réagissant, puis repart par la sortie", () => {
    const state = quietZoo();
    const visitor = createVisitor(state, 'adult', entrance);
    visitor.viewsWanted = 1;
    const states: VisitorState[] = [];
    for (let i = 0; i < 600 && state.visitors[visitor.id]; i++) {
      stepWithoutArrivals(state, 1);
      if (states[states.length - 1] !== visitor.state) states.push(visitor.state);
      if (visitor.state === 'viewing') expect(visitor.y).toBeCloseTo(39.5);
    }
    expect(states).toEqual(['walkingToView', 'viewing', 'wandering', 'leaving']);
    expect(state.visitors[visitor.id]).toBeUndefined();
    expect(visitor.reaction).toBe('joy');
    expect(visitor.satisfaction).toBeGreaterThan(balance.visitors.startSatisfaction);
    expect(state.stats.today.departures).toBe(1);
  });

  it('un visiteur affamé va au stand de snacks, mange et paie', () => {
    const state = quietZoo();
    expect(dispatchCommand(state, { type: 'PlaceBuilding', kind: 'snack', tile: { x: 22, y: 41 } }).ok).toBe(
      true,
    );
    const visitor = createVisitor(state, 'child', entrance);
    visitor.hunger = 10;
    const money = state.money;
    const tickets = state.stats.today.tickets;
    const seen = new Set<VisitorState>();
    for (let i = 0; i < 200; i++) {
      stepWithoutArrivals(state, 1);
      seen.add(visitor.state);
    }
    expect(seen).toContain('walkingToFood');
    expect(seen).toContain('eating');
    const income = Math.round(balance.economy.snackPrice * balance.economy.snackMargin);
    expect(state.stats.today.snacks).toBe(income);
    // Les billets des visiteurs arrivés spontanément (puis retirés) sont aussi encaissés.
    expect(state.money).toBe(money + income + state.stats.today.tickets - tickets);
    expect(visitor.hunger).toBeGreaterThan(balance.visitors.hungryBelow);
  });

  it('plusieurs visiteurs affamés, deux stands voisins dans un coin du chemin : tous mangent (issue #4)', () => {
    const state = quietZoo();
    for (const x of [22, 23]) {
      expect(dispatchCommand(state, { type: 'PlaceBuilding', kind: 'snack', tile: { x, y: 40 } }).ok).toBe(
        true,
      );
    }
    const visitors = Array.from({ length: 8 }, (_, i) => {
      const visitor = createVisitor(state, i % 2 ? 'child' : 'adult', entrance);
      visitor.hunger = 10;
      visitor.viewsWanted = 10;
      return visitor;
    });
    const ate = new Set<number>();
    for (let i = 0; i < 300; i++) {
      stepWithoutArrivals(state, 1);
      for (const visitor of visitors) if (visitor.state === 'eating') ate.add(visitor.id);
    }
    expect(ate.size).toBe(visitors.length);
    const income = Math.round(balance.economy.snackPrice * balance.economy.snackMargin);
    expect(state.stats.today.snacks).toBe(visitors.length * income);
  });

  it('un visiteur qui a faim en pleine observation écourte sa visite et va manger', () => {
    const state = quietZoo();
    dispatchCommand(state, { type: 'PlaceBuilding', kind: 'snack', tile: { x: 22, y: 40 } });
    const visitor = createVisitor(state, 'adult', entrance);
    visitor.viewsWanted = 3;
    for (let i = 0; i < 300 && visitor.state !== 'viewing'; i++) stepWithoutArrivals(state, 1);
    expect(visitor.state).toBe('viewing');
    visitor.hunger = 10;
    stepWithoutArrivals(state, 1);
    expect(visitor.state).toBe('walkingToFood');
    expect(visitor.seen).toHaveLength(1);
  });

  it('un visiteur affamé en fin de visite mange avant de partir', () => {
    const state = quietZoo();
    dispatchCommand(state, { type: 'PlaceBuilding', kind: 'snack', tile: { x: 25, y: 40 } });
    const visitor = createVisitor(state, 'adult', entrance);
    visitor.viewsWanted = 0;
    stepWithoutArrivals(state, 1);
    expect(visitor.state).toBe('leaving');
    // La faim le prend sur le chemin de la sortie.
    visitor.hunger = 10;
    const states: VisitorState[] = [];
    for (let i = 0; i < 600 && state.visitors[visitor.id]; i++) {
      stepWithoutArrivals(state, 1);
      if (states[states.length - 1] !== visitor.state) states.push(visitor.state);
    }
    expect(states).toEqual(['walkingToFood', 'eating', 'wandering', 'leaving']);
    expect(state.visitors[visitor.id]).toBeUndefined();
    expect(visitor.leaveReason).toBe('done');
  });

  it('à la fermeture, un visiteur affamé rentre sans passer au stand', () => {
    const state = quietZoo();
    dispatchCommand(state, { type: 'PlaceBuilding', kind: 'snack', tile: { x: 22, y: 40 } });
    stepWithoutArrivals(state, ticksUntilHour(state.tick, balance.visitors.closeHour));
    const visitor = createVisitor(state, 'adult', entrance);
    visitor.hunger = 10;
    stepWithoutArrivals(state, 20);
    expect(visitor.state).toBe('leaving');
    expect(visitor.leaveReason).toBe('closing');
    expect(state.stats.today.snacks).toBe(0);
  });

  it('sans stand de snacks, la faim fait baisser la satisfaction et le joueur est prévenu', () => {
    const state = quietZoo();
    const visitor = createVisitor(state, 'adult', entrance);
    visitor.hunger = 5;
    visitor.viewsWanted = 10;
    stepWithoutArrivals(state, 1);
    expect(zooAlerts(state).hungryWithoutFood).toBe(1);
    const fed = createVisitor(state, 'adult', entrance);
    fed.viewsWanted = 10;
    stepWithoutArrivals(state, 150);
    expect(visitor.satisfaction).toBeLessThan(fed.satisfaction);
  });

  it('à bout de patience (rien à voir), il part mécontent', () => {
    const state = createInitialState(7);
    placePath(state, { x: 21, y: 46 }, { x: 21, y: 45 });
    placePath(state, { x: 22, y: 45 }, { x: 26, y: 45 });
    dispatchCommand(state, { type: 'PlacePath', tile: { x: 26, y: 46 } });
    const visitor = createVisitor(state, 'adult', entrance);
    let reason = null;
    for (let i = 0; i < 1000 && state.visitors[visitor.id]; i++) {
      stepWithoutArrivals(state, 1);
      reason = visitor.leaveReason;
    }
    expect(reason).toBe('impatient');
    expect(visitor.satisfaction).toBeLessThan(balance.visitors.startSatisfaction);
  });

  it('les visiteurs bloqués (chemin coupé) sont signalés puis abandonnent', () => {
    const state = quietZoo();
    const visitor = createVisitor(state, 'adult', tileIndex(state.world, { x: 15, y: 39 }));
    visitor.viewsWanted = 0;
    // Coupe l'allée : le visiteur est isolé à l'ouest.
    dispatchCommand(state, { type: 'Demolish', target: { kind: 'tile', tile: { x: 16, y: 39 } } });
    stepWithoutArrivals(state, 5);
    expect(visitor.blockedTicks).toBeGreaterThan(0);
    expect(zooAlerts(state).blockedVisitors).toBe(1);
    stepWithoutArrivals(state, balance.visitors.blockedGiveUpTicks);
    expect(state.visitors[visitor.id]).toBeUndefined();
    expect(visitor.leaveReason).toBe('blocked');
  });
});

describe('visiteurs : arrivées et choix des enclos', () => {
  it("n'arrivent que s'il y a des animaux visibles depuis un chemin relié à l'entrée et à la sortie", () => {
    const state = createInitialState(7);
    runDays(state, 0.3);
    expect(state.nextVisitorId).toBe(1);
    buildVisitorZoo(state);
    dispatchCommand(state, { type: 'Demolish', target: { kind: 'tile', tile: { x: 26, y: 44 } } });
    expect(zooAlerts(state).exitUnreachable).toBe(true);
    for (let i = 0; i < 100; i++) updateVisitorSpawn(state);
    expect(state.nextVisitorId).toBe(1);
    dispatchCommand(state, { type: 'PlacePath', tile: { x: 26, y: 44 } });
    for (let i = 0; i < 100; i++) updateVisitorSpawn(state);
    expect(state.nextVisitorId).toBeGreaterThan(1);
  });

  it("un enclos sans chemin n'attire aucun visiteur et l'alerte le désigne", () => {
    const state = createInitialState(11);
    buildVisitorZoo(state);
    // Enclos de lions isolé, loin de tout chemin.
    buildEnclosure(state, [4, 10, 11, 17], {
      biome: 'savanna',
      water: [{ x: 4, y: 10 }],
      feeders: [{ x: 11, y: 17 }],
    });
    buyAnimal(state, 'lion', { x: 7, y: 13 });
    const lionEnclosure = state.world.enclosureOf[tileIndex(state.world, { x: 7, y: 13 })] as number;
    state.money = 50_000;
    expect(zooAlerts(state).unreachableEnclosures).toEqual([lionEnclosure]);
    const targets = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      stepSimulation(state);
      for (const visitor of Object.values(state.visitors)) targets.add(visitor.targetEnclosure);
    }
    expect(state.nextVisitorId).toBeGreaterThan(10);
    expect(targets).not.toContain(lionEnclosure);
  });

  it('un prix de billet trop élevé réduit nettement les arrivées', () => {
    const arrivals = (price: number) => {
      const state = createInitialState(5);
      buildVisitorZoo(state);
      dispatchCommand(state, { type: 'SetTicketPrice', price });
      runDays(state, 1);
      return state.stats.history[0]?.visitors ?? 0;
    };
    const fair = arrivals(balance.economy.ticketPrice.default);
    const expensive = arrivals(50);
    expect(fair).toBeGreaterThan(30);
    expect(expensive).toBeLessThan(fair * 0.2);
  });

  it("le zoo se vide à la fermeture et n'accueille personne la nuit", () => {
    const state = createInitialState(5);
    buildVisitorZoo(state);
    stepSimulation(state);
    const untilNight = Math.round(((23.75 - balance.time.startHour) / 24) * balance.time.ticksPerDay);
    for (let i = 0; i < untilNight; i++) stepSimulation(state);
    expect(Object.keys(state.visitors)).toHaveLength(0);
    expect(state.stats.today.departures).toBe(state.stats.today.visitors);
  });

  it('déterminisme : même seed et mêmes commandes donnent le même état avec visiteurs', () => {
    const run = () => {
      const state = createInitialState(42);
      buildVisitorZoo(state);
      dispatchCommand(state, { type: 'PlaceBuilding', kind: 'snack', tile: { x: 22, y: 41 } });
      runDays(state, 1.2);
      return state;
    };
    const a = run();
    expect(a.stats.history[0]?.visitors).toBeGreaterThan(0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(run()));
  });
});
