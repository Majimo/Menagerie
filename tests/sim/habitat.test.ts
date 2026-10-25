import { describe, expect, it } from 'vitest';
import { balance } from '../../src/sim/data/balance';
import { createInitialState } from '../../src/sim/state';
import { habitatReport } from '../../src/sim/world/habitat';
import { buildEnclosure, buyAnimal } from './helpers';

const enclosureAt = (state: ReturnType<typeof createInitialState>, x: number, y: number) =>
  state.world.enclosureOf[y * state.world.width + x] as number;

describe("score d'habitat", () => {
  it('enclos idéal : 100, aucun problème', () => {
    const state = createInitialState();
    // 6×6 = 36 tuiles pour 2 zèbres (24 requises), savane, eau, nourrisseur, 4 décors aimés.
    buildEnclosure(state, [10, 10, 15, 15], {
      biome: 'savanna',
      water: [{ x: 10, y: 10 }],
      feeders: [{ x: 15, y: 15 }],
      decor: [
        { kind: 'tree', tile: { x: 11, y: 15 } },
        { kind: 'tree', tile: { x: 12, y: 15 } },
        { kind: 'rock', tile: { x: 13, y: 15 } },
        { kind: 'rock', tile: { x: 14, y: 15 } },
      ],
    });
    buyAnimal(state, 'zebra', { x: 12, y: 12 });
    buyAnimal(state, 'zebra', { x: 13, y: 12 });
    const report = habitatReport(state, enclosureAt(state, 12, 12), 'zebra');
    // L'eau occupe une tuile de savane : biome à 35/36.
    expect(report.criteria).toEqual({ space: 1, biome: 35 / 36, water: 1, food: 1, enrichment: 1 });
    expect(report.score).toBe(99);
    expect(report.issues).toEqual([]);
    expect(report.target).toBe(report.score);
  });

  it('pondère chaque critère selon balance.habitat.weights', () => {
    const state = createInitialState();
    buildEnclosure(state, [10, 10, 13, 13], { water: [{ x: 10, y: 10 }] });
    buyAnimal(state, 'lion', { x: 12, y: 12 });
    // 16 tuiles pour un lion (25 requises), herbe, eau, ni nourrisseur ni décor.
    const report = habitatReport(state, enclosureAt(state, 12, 12), 'lion');
    const { weights } = balance.habitat;
    expect(report.score).toBe(Math.round(100 * (weights.space * (16 / 25) + weights.water)));
    expect(report.issues).toEqual(['tooSmall', 'noFood', 'wrongBiome', 'lowEnrichment']);
  });

  it('un enclos trop petit ou sans eau est signalé', () => {
    const state = createInitialState();
    buildEnclosure(state, [10, 10, 12, 12], { biome: 'savanna', feeders: [{ x: 10, y: 10 }] });
    buyAnimal(state, 'giraffe', { x: 11, y: 11 });
    const report = habitatReport(state, enclosureAt(state, 11, 11), 'giraffe');
    expect(report.issues).toContain('tooSmall');
    expect(report.issues).toContain('noWater');
  });

  it('un zèbre seul subit le malus de solitude', () => {
    const state = createInitialState();
    buildEnclosure(state, [10, 10, 15, 15], { biome: 'savanna' });
    buyAnimal(state, 'zebra', { x: 12, y: 12 });
    const report = habitatReport(state, enclosureAt(state, 12, 12), 'zebra');
    expect(report.issues).toContain('lonely');
    expect(report.target).toBe(report.score - balance.habitat.lonelyMalus);
  });

  it("l'enrichissement ne compte que les décors aimés par l'espèce", () => {
    const state = createInitialState();
    buildEnclosure(state, [10, 10, 17, 17], {
      biome: 'forest',
      decor: [
        { kind: 'bamboo', tile: { x: 10, y: 10 } },
        { kind: 'bamboo', tile: { x: 11, y: 10 } },
        { kind: 'rock', tile: { x: 12, y: 10 } },
      ],
    });
    buyAnimal(state, 'panda', { x: 14, y: 14 });
    expect(habitatReport(state, enclosureAt(state, 14, 14), 'panda').criteria.enrichment).toBe(
      2 / balance.habitat.enrichmentCap,
    );
  });

  it('hors enclos : score nul', () => {
    const state = createInitialState();
    expect(habitatReport(state, 0, 'zebra')).toMatchObject({ score: 0, target: 0, issues: ['noEnclosure'] });
  });
});
