import { describe, expect, it } from 'vitest';
import { validateCommand } from '../../src/sim/commands';
import { balance } from '../../src/sim/data/balance';
import { SPECIES } from '../../src/sim/data/species';
import { animalStatus } from '../../src/sim/entities';
import { dispatchCommand, stepSimulation } from '../../src/sim/simulation';
import { createInitialState, type GameState } from '../../src/sim/state';
import { buildEnclosure, buyAnimal, runDays } from './helpers';

/** Grand enclos de savane avec eau et nourrisseur. */
function savannaEnclosure(state: GameState, withFeeder = true, withWater = true): void {
  buildEnclosure(state, [10, 10, 19, 19], {
    biome: 'savanna',
    water: withWater ? [{ x: 10, y: 10 }] : [],
    feeders: withFeeder ? [{ x: 19, y: 19 }] : [],
  });
}

describe('achat et cohabitation', () => {
  it('achète un animal dans un enclos et débite son prix', () => {
    const state = createInitialState();
    savannaEnclosure(state);
    const money = state.money;
    const zebra = buyAnimal(state, 'zebra', { x: 14, y: 14 });
    expect(state.money).toBe(money - SPECIES.zebra.price);
    expect(zebra).toMatchObject({ species: 'zebra', x: 14.5, y: 14.5, hunger: 100, health: 100 });
    expect(zebra.enclosureId).toBeGreaterThan(0);
  });

  it('refuse hors enclos, sur l’eau ou sans argent', () => {
    const state = createInitialState();
    savannaEnclosure(state);
    expect(validateCommand(state, { type: 'BuyAnimal', species: 'zebra', tile: { x: 30, y: 30 } })).toEqual({
      ok: false,
      error: 'notInEnclosure',
    });
    expect(validateCommand(state, { type: 'BuyAnimal', species: 'zebra', tile: { x: 10, y: 10 } })).toEqual({
      ok: false,
      error: 'tileIsWater',
    });
    state.money = 100;
    expect(validateCommand(state, { type: 'BuyAnimal', species: 'zebra', tile: { x: 14, y: 14 } })).toEqual({
      ok: false,
      error: 'notEnoughMoney',
    });
  });

  it('un lion ne peut pas être placé avec des zèbres, et inversement', () => {
    const state = createInitialState();
    savannaEnclosure(state);
    buyAnimal(state, 'zebra', { x: 14, y: 14 });
    expect(dispatchCommand(state, { type: 'BuyAnimal', species: 'lion', tile: { x: 15, y: 15 } })).toEqual({
      ok: false,
      error: 'incompatibleSpecies',
      detail: { species: 'lion', other: 'zebra' },
    });

    const other = createInitialState();
    savannaEnclosure(other);
    buyAnimal(other, 'lion', { x: 14, y: 14 });
    expect(
      validateCommand(other, { type: 'BuyAnimal', species: 'zebra', tile: { x: 15, y: 15 } }),
    ).toMatchObject({
      error: 'incompatibleSpecies',
      detail: { species: 'zebra', other: 'lion' },
    });
  });

  it('les herbivores cohabitent', () => {
    const state = createInitialState();
    savannaEnclosure(state);
    buyAnimal(state, 'zebra', { x: 14, y: 14 });
    expect(validateCommand(state, { type: 'BuyAnimal', species: 'giraffe', tile: { x: 15, y: 15 } }).ok).toBe(
      true,
    );
  });

  it('un panda est solitaire : un second est refusé', () => {
    const state = createInitialState();
    buildEnclosure(state, [10, 10, 19, 19], { biome: 'forest' });
    buyAnimal(state, 'panda', { x: 14, y: 14 });
    expect(
      validateCommand(state, { type: 'BuyAnimal', species: 'panda', tile: { x: 15, y: 15 } }),
    ).toMatchObject({
      error: 'groupFull',
    });
  });

  it('fusionner deux enclos qui mêlent lion et zèbres déclenche le malus de cohabitation', () => {
    const state = createInitialState();
    // Un rectangle coupé en deux par une rangée de clôtures en x = 15.
    buildEnclosure(state, [10, 10, 19, 14]);
    for (let y = 10; y <= 14; y++)
      dispatchCommand(state, { type: 'PlaceFence', edge: { axis: 'v', x: 15, y } });
    const lion = buyAnimal(state, 'lion', { x: 12, y: 12 });
    buyAnimal(state, 'zebra', { x: 17, y: 12 });
    for (let y = 10; y <= 14; y++)
      dispatchCommand(state, { type: 'Demolish', target: { kind: 'fence', edge: { axis: 'v', x: 15, y } } });
    runDays(state, 1);
    expect(lion.wellbeing).toBe(0);
  });
});

describe('besoins des animaux', () => {
  it('la faim et la soif baissent de foodPerDay et waterPerDay par jour', () => {
    const state = createInitialState();
    // Ni nourrisseur ni eau : rien ne fait remonter les jauges.
    savannaEnclosure(state, false, false);
    const lion = buyAnimal(state, 'lion', { x: 14, y: 14 });
    runDays(state, 0.5);
    expect(lion.hunger).toBeCloseTo(100 - SPECIES.lion.foodPerDay / 2, 5);
    expect(lion.thirst).toBeCloseTo(100 - SPECIES.lion.waterPerDay / 2, 5);
  });

  it('un animal bien installé mange et boit : ses jauges restent hautes', () => {
    const state = createInitialState();
    savannaEnclosure(state);
    const lion = buyAnimal(state, 'lion', { x: 14, y: 14 });
    for (let day = 0; day < 5; day++) {
      runDays(state, 1);
      expect(lion.hunger).toBeGreaterThan(balance.animals.hungryBelow);
      expect(lion.thirst).toBeGreaterThan(balance.animals.thirstyBelow);
    }
    expect(lion.health).toBe(100);
  });

  it("le bien-être rejoint le score d'habitat, sans eau il baisse", () => {
    const state = createInitialState();
    buildEnclosure(state, [10, 10, 12, 12], { biome: 'savanna', feeders: [{ x: 10, y: 10 }] });
    const giraffe = buyAnimal(state, 'giraffe', { x: 11, y: 11 });
    const start = giraffe.wellbeing;
    runDays(state, 2);
    expect(giraffe.wellbeing).toBeLessThan(start);
    expect(giraffe.wellbeing).toBeLessThan(balance.animals.unhappyBelow);
  });

  it('sans nourriture, un animal tombe malade puis meurt, et disparaît plus tard', () => {
    const state = createInitialState();
    savannaEnclosure(state, false, true);
    const zebra = buyAnimal(state, 'zebra', { x: 14, y: 14 });
    buyAnimal(state, 'zebra', { x: 15, y: 14 });
    const statuses = new Set<string>();
    let deathTick = -1;
    for (let tick = 0; tick < 10 * balance.time.ticksPerDay && deathTick < 0; tick++) {
      stepSimulation(state);
      statuses.add(animalStatus(zebra));
      if (zebra.diedAt >= 0) deathTick = state.tick;
    }
    expect(statuses).toContain('hungry');
    expect(statuses).toContain('sick');
    expect(animalStatus(zebra)).toBe('dead');
    expect(zebra.activity).toBe('dead');
    // Faim à 0 après 100 / foodPerDay jours, puis 2 jours de privation, puis 1 jour pour perdre la santé.
    const expectedDays = 100 / SPECIES.zebra.foodPerDay + balance.animals.deprivationDays + 1;
    expect(deathTick / balance.time.ticksPerDay).toBeCloseTo(expectedDays, 1);

    for (let i = 0; i < balance.animals.corpseTicks; i++) stepSimulation(state);
    expect(state.animals[zebra.id]).toBeUndefined();
  });

  it('un animal malade guérit quand la privation cesse', () => {
    const state = createInitialState();
    savannaEnclosure(state, false, true);
    const lion = buyAnimal(state, 'lion', { x: 14, y: 14 });
    runDays(state, 100 / SPECIES.lion.foodPerDay + balance.animals.deprivationDays + 0.3);
    expect(animalStatus(lion)).toBe('sick');
    dispatchCommand(state, { type: 'PlaceBuilding', kind: 'feeder', tile: { x: 18, y: 18 } });
    runDays(state, 3);
    expect(lion.diedAt).toBe(-1);
    expect(lion.health).toBeGreaterThan(50);
  });
});

describe('déplacements', () => {
  it('les animaux restent dans leur enclos, même en L', () => {
    const state = createInitialState();
    state.money = 1_000_000;
    // Enclos en L : 10..19 × 10..13 et 10..13 × 14..19.
    const fences = [
      ...Array.from({ length: 10 }, (_, i) => ({ axis: 'h' as const, x: 10 + i, y: 10 })),
      ...Array.from({ length: 6 }, (_, i) => ({ axis: 'h' as const, x: 14 + i, y: 14 })),
      ...Array.from({ length: 4 }, (_, i) => ({ axis: 'h' as const, x: 10 + i, y: 20 })),
      ...Array.from({ length: 10 }, (_, i) => ({ axis: 'v' as const, x: 10, y: 10 + i })),
      ...Array.from({ length: 4 }, (_, i) => ({ axis: 'v' as const, x: 20, y: 10 + i })),
      ...Array.from({ length: 6 }, (_, i) => ({ axis: 'v' as const, x: 14, y: 14 + i })),
    ];
    for (const edge of fences) dispatchCommand(state, { type: 'PlaceFence', edge });
    const zebra = buyAnimal(state, 'zebra', { x: 11, y: 18 });
    const enclosureId = zebra.enclosureId;
    const visited = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      stepSimulation(state);
      const tile = { x: Math.floor(zebra.x), y: Math.floor(zebra.y) };
      expect(state.world.enclosureOf[tile.y * 48 + tile.x]).toBe(enclosureId);
      visited.add(`${tile.x},${tile.y}`);
    }
    expect(visited.size).toBeGreaterThan(10);
  });

  it('ils dorment la nuit', () => {
    const state = createInitialState();
    savannaEnclosure(state);
    const zebra = buyAnimal(state, 'zebra', { x: 14, y: 14 });
    // Départ à 8 h ; 23 h = 15 heures plus tard.
    runDays(state, 15 / 24);
    expect(zebra.activity).toBe('sleep');
    expect(animalStatus(zebra)).toBe('sleeping');
    runDays(state, 9 / 24);
    expect(zebra.activity).not.toBe('sleep');
  });
});
