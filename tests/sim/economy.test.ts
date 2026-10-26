import { describe, expect, it } from 'vitest';
import { balance } from '../../src/sim/data/balance';
import { SPECIES } from '../../src/sim/data/species';
import { VISITOR_KINDS } from '../../src/sim/data/visitors';
import { dispatchCommand, stepSimulation } from '../../src/sim/simulation';
import { createInitialState } from '../../src/sim/state';
import { constructionValue, dailyCosts, ledgerNet } from '../../src/sim/systems/economy';
import { buildVisitorZoo, runDays } from './helpers';

describe('économie', () => {
  it('chaque arrivée paie son billet : plein tarif pour un adulte, moitié pour un enfant', () => {
    const state = createInitialState(3);
    buildVisitorZoo(state);
    dispatchCommand(state, { type: 'SetTicketPrice', price: 15 });
    const money = state.money;
    let expected = 0;
    for (let i = 0; i < 300; i++) {
      const before = state.nextVisitorId;
      stepSimulation(state);
      for (let id = before; id < state.nextVisitorId; id++) {
        const kind = state.visitors[id]?.kind ?? 'adult';
        expected += Math.round(15 * VISITOR_KINDS[kind].ticketRatio);
      }
    }
    expect(state.stats.today.visitors).toBeGreaterThan(10);
    expect(state.stats.today.tickets).toBe(expected);
    expect(state.money).toBe(money + expected + state.stats.today.snacks);
  });

  it('à minuit, prélève nourriture et entretien et clôt le bilan de la journée', () => {
    const state = createInitialState(3);
    buildVisitorZoo(state);
    const { animalFood, upkeep } = dailyCosts(state);
    expect(animalFood).toBe(3 * SPECIES.zebra.foodCostPerDay);
    expect(upkeep).toBe(Math.round(constructionValue(state) * balance.economy.upkeepRatio));
    runDays(state, 1);
    const [day1] = state.stats.history;
    expect(day1?.day).toBe(1);
    expect(day1?.animalFood).toBe(animalFood);
    expect(day1?.upkeep).toBe(upkeep);
    expect(day1?.tickets).toBeGreaterThan(0);
    expect(state.money).toBe(50_000 + (day1 ? ledgerNet(day1) : 0) + ledgerNet(state.stats.today));
    expect(state.stats.today.day).toBe(2);
  });

  it('la valeur de construction compte chemins, clôtures, eau et objets (pas l’entrée ni la sortie)', () => {
    const state = createInitialState(1);
    expect(constructionValue(state)).toBe(0);
    dispatchCommand(state, { type: 'PlacePath', tile: { x: 21, y: 46 } });
    dispatchCommand(state, { type: 'PlaceFence', edge: { axis: 'h', x: 3, y: 3 } });
    dispatchCommand(state, { type: 'PlaceBuilding', kind: 'tree', tile: { x: 5, y: 5 } });
    expect(constructionValue(state)).toBe(balance.costs.path + balance.costs.fence + 20);
  });

  it('les constructions et les achats d’animaux sont inscrits au bilan, démolitions déduites', () => {
    const state = createInitialState(1);
    dispatchCommand(state, { type: 'PlacePath', tile: { x: 21, y: 46 } });
    dispatchCommand(state, { type: 'PlacePath', tile: { x: 21, y: 45 } });
    dispatchCommand(state, { type: 'Demolish', target: { kind: 'tile', tile: { x: 21, y: 45 } } });
    const refund = Math.floor(balance.costs.path * balance.demolishRefundRatio);
    expect(state.stats.today.construction).toBe(2 * balance.costs.path - refund);
  });

  it('le prix du billet se règle de 5 à 50, en entiers', () => {
    const state = createInitialState(1);
    for (const price of [4, 51, 20.5]) {
      expect(dispatchCommand(state, { type: 'SetTicketPrice', price })).toEqual({
        ok: false,
        error: 'invalidPrice',
      });
    }
    expect(dispatchCommand(state, { type: 'SetTicketPrice', price: 35 }).ok).toBe(true);
    expect(state.ticketPrice).toBe(35);
  });

  it('le stand de snacks se pose hors enclos, au bord d’un chemin', () => {
    const state = createInitialState(1);
    buildVisitorZoo(state);
    const place = (x: number, y: number) =>
      dispatchCommand(state, { type: 'PlaceBuilding', kind: 'snack', tile: { x, y } });
    expect(place(10, 10)).toEqual({ ok: false, error: 'notBesidePath' });
    expect(place(20, 38)).toEqual({ ok: false, error: 'insideEnclosure' });
    expect(place(22, 41).ok).toBe(true);
  });
});
