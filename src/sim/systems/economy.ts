import { balance } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { SPECIES } from '../data/species';
import { tileCode } from '../data/terrain';
import { createLedger, type DayLedger, type GameState } from '../state';
import { timeOfDay } from '../time';
import { tileIndex } from '../world/grid';

// Système `economy` : à minuit, dépenses du jour (nourriture des animaux, entretien) et clôture du bilan.
// Les recettes (billets, snacks) sont inscrites au fil de la journée par les systèmes des visiteurs.

/** Valeur de construction du zoo : chemins (hors entrée et sortie), clôtures, eau, objets. */
export function constructionValue(state: Readonly<GameState>): number {
  const { world } = state;
  const { costs } = balance;
  let value = 0;
  const free = new Set([tileIndex(world, world.entrance), tileIndex(world, world.exit)]);
  world.tiles.forEach((code, index) => {
    if (code === tileCode('path') && !free.has(index)) value += costs.path;
    else if (code === tileCode('water')) value += costs.water;
  });
  for (const fence of world.fencesH) value += fence * costs.fence;
  for (const fence of world.fencesV) value += fence * costs.fence;
  for (const building of Object.values(state.buildings)) value += BUILDINGS[building.kind].cost;
  return value;
}

/** Dépenses quotidiennes prévues, telles qu'elles seront prélevées à minuit. */
export function dailyCosts(state: Readonly<GameState>): { animalFood: number; upkeep: number } {
  let animalFood = 0;
  for (const animal of Object.values(state.animals)) {
    if (animal.diedAt < 0) animalFood += SPECIES[animal.species].foodCostPerDay;
  }
  return { animalFood, upkeep: Math.round(constructionValue(state) * balance.economy.upkeepRatio) };
}

/** Solde d'une journée : recettes moins dépenses. */
export function ledgerNet(ledger: Readonly<DayLedger>): number {
  return (
    ledger.tickets +
    ledger.snacks -
    ledger.construction -
    ledger.animalPurchases -
    ledger.animalFood -
    ledger.upkeep
  );
}

export function updateEconomy(state: GameState): void {
  const { day } = timeOfDay(state.tick);
  const { stats } = state;
  if (day === stats.today.day) return;
  const { animalFood, upkeep } = dailyCosts(state);
  state.money -= animalFood + upkeep;
  stats.today.animalFood += animalFood;
  stats.today.upkeep += upkeep;
  stats.history.push(stats.today);
  if (stats.history.length > balance.rating.historyDays) stats.history.shift();
  stats.today = createLedger(day);
}
