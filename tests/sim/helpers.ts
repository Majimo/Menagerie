import type { Command } from '../../src/sim/commands';
import { balance } from '../../src/sim/data/balance';
import type { BuildingKind } from '../../src/sim/data/buildings';
import type { SpeciesId } from '../../src/sim/data/species';
import type { PaintableBiome } from '../../src/sim/data/terrain';
import { dispatchCommand, stepSimulation } from '../../src/sim/simulation';
import { type Animal, createLedger, type GameState } from '../../src/sim/state';
import type { Edge, TileCoord } from '../../src/sim/world/grid';

// Utilitaires des tests de simulation.

/** Arêtes du contour d'un rectangle de tuiles [x0, x1] × [y0, y1] (bornes incluses). */
export function rectangleOutline(x0: number, y0: number, x1: number, y1: number): Edge[] {
  const edges: Edge[] = [];
  for (let x = x0; x <= x1; x++) {
    edges.push({ axis: 'h', x, y: y0 }, { axis: 'h', x, y: y1 + 1 });
  }
  for (let y = y0; y <= y1; y++) {
    edges.push({ axis: 'v', x: x0, y }, { axis: 'v', x: x1 + 1, y });
  }
  return edges;
}

export function placeFences(state: GameState, edges: Edge[]): void {
  for (const edge of edges) {
    const result = dispatchCommand(state, { type: 'PlaceFence', edge });
    if (!result.ok) throw new Error(`Clôture refusée en ${JSON.stringify(edge)} : ${result.error}`);
  }
}

export function dispatchAll(state: GameState, commands: Command[]): void {
  for (const command of commands) dispatchCommand(state, command);
}

export interface EnclosureSetup {
  biome?: PaintableBiome;
  /** Tuiles d'eau, de nourrisseur et de décor. */
  water?: TileCoord[];
  feeders?: TileCoord[];
  decor?: { kind: BuildingKind; tile: TileCoord }[];
}

/** Clôture le rectangle [x0, x1] × [y0, y1], le peint et l'équipe. Donne assez d'argent pour tout payer. */
export function buildEnclosure(
  state: GameState,
  [x0, y0, x1, y1]: [number, number, number, number],
  setup: EnclosureSetup = {},
): void {
  state.money = 10_000_000;
  placeFences(state, rectangleOutline(x0, y0, x1, y1));
  const commands: Command[] = [];
  if (setup.biome) {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        commands.push({ type: 'PaintBiome', tile: { x, y }, biome: setup.biome });
  }
  for (const tile of setup.water ?? []) commands.push({ type: 'PaintBiome', tile, biome: 'water' });
  for (const tile of setup.feeders ?? []) commands.push({ type: 'PlaceBuilding', tile, kind: 'feeder' });
  for (const { kind, tile } of setup.decor ?? []) commands.push({ type: 'PlaceBuilding', tile, kind });
  for (const command of commands) {
    const result = dispatchCommand(state, command);
    if (!result.ok) throw new Error(`Commande refusée ${JSON.stringify(command)} : ${result.error}`);
  }
}

export function buyAnimal(state: GameState, species: SpeciesId, tile: TileCoord): Animal {
  const result = dispatchCommand(state, { type: 'BuyAnimal', species, tile });
  if (!result.ok) throw new Error(`Achat refusé : ${result.error}`);
  return state.animals[state.nextAnimalId - 1] as Animal;
}

export function runDays(state: GameState, days: number): void {
  const ticks = Math.round(days * balance.time.ticksPerDay);
  for (let i = 0; i < ticks; i++) stepSimulation(state);
}

/** Pose un chemin sur chaque tuile du segment (horizontal ou vertical). */
export function placePath(state: GameState, from: TileCoord, to: TileCoord): void {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  for (let x = from.x, y = from.y; ; x += dx, y += dy) {
    dispatchCommand(state, { type: 'PlacePath', tile: { x, y } });
    if (x === to.x && y === to.y) return;
  }
}

/**
 * Petit zoo de référence pour les visiteurs : entrée et sortie reliées à une allée (y = 39) qui longe
 * un enclos de savane bien équipé [17, 32] → [26, 38] avec 3 zèbres. L'argent est remis à 50 000.
 */
export function buildVisitorZoo(state: GameState): void {
  buildEnclosure(state, [17, 32, 26, 38], {
    biome: 'savanna',
    water: [
      { x: 17, y: 32 },
      { x: 18, y: 32 },
    ],
    feeders: [{ x: 26, y: 38 }],
    decor: [
      { kind: 'tree', tile: { x: 19, y: 36 } },
      { kind: 'tree', tile: { x: 24, y: 33 } },
      { kind: 'rock', tile: { x: 21, y: 34 } },
      { kind: 'rock', tile: { x: 25, y: 37 } },
    ],
  });
  placePath(state, { x: 21, y: 46 }, { x: 21, y: 40 });
  placePath(state, { x: 26, y: 46 }, { x: 26, y: 40 });
  placePath(state, { x: 15, y: 39 }, { x: 28, y: 39 });
  for (const tile of [
    { x: 20, y: 35 },
    { x: 22, y: 36 },
    { x: 23, y: 34 },
  ])
    buyAnimal(state, 'zebra', tile);
  state.money = 50_000;
  state.stats.today = createLedger(state.stats.today.day);
}
