import type { Command } from '../../src/sim/commands';
import { balance } from '../../src/sim/data/balance';
import type { BuildingKind } from '../../src/sim/data/buildings';
import type { SpeciesId } from '../../src/sim/data/species';
import type { PaintableBiome } from '../../src/sim/data/terrain';
import { dispatchCommand, stepSimulation } from '../../src/sim/simulation';
import { createInitialState, type GameState } from '../../src/sim/state';
import { ratingBreakdown } from '../../src/sim/systems/rating';
import { timeOfDay } from '../../src/sim/time';
import type { TileCoord } from '../../src/sim/world/grid';
import { rectangleOutline } from './helpers';

// Parties scriptées de référence pour l'équilibrage (test de rentabilité) : elles partent de l'état initial
// et paient tout au vrai prix. Une commande refusée faute d'argent est simplement réessayée plus tard.

type Rect = [number, number, number, number];

interface EnclosurePlan {
  rect: Rect;
  biome?: PaintableBiome;
  water?: TileCoord[];
  feeder?: TileCoord;
  decor?: { kind: BuildingKind; tile: TileCoord }[];
  animals: { species: SpeciesId; tile: TileCoord }[];
}

/** Une étape : à partir du jour `day`, quand l'argent dépasse `minMoney`, envoyer ces commandes. */
interface Step {
  day: number;
  minMoney: number;
  commands: Command[];
}

export interface Strategy {
  steps: Step[];
  /** Prix du billet fixé chaque matin : nombre, ou `fair` pour le prix juste de la note du jour. */
  ticket: number | 'fair';
}

function line(from: TileCoord, to: TileCoord): Command[] {
  const commands: Command[] = [];
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  for (let x = from.x, y = from.y; ; x += dx, y += dy) {
    commands.push({ type: 'PlacePath', tile: { x, y } });
    if (x === to.x && y === to.y) return commands;
  }
}

function enclosure(plan: EnclosurePlan): Command[] {
  const [x0, y0, x1, y1] = plan.rect;
  const commands: Command[] = rectangleOutline(x0, y0, x1, y1).map((edge) => ({ type: 'PlaceFence', edge }));
  if (plan.biome) {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) commands.push({ type: 'PaintBiome', tile: { x, y }, biome: plan.biome });
  }
  for (const tile of plan.water ?? []) commands.push({ type: 'PaintBiome', tile, biome: 'water' });
  if (plan.feeder) commands.push({ type: 'PlaceBuilding', tile: plan.feeder, kind: 'feeder' });
  for (const { kind, tile } of plan.decor ?? []) commands.push({ type: 'PlaceBuilding', tile, kind });
  for (const { species, tile } of plan.animals) commands.push({ type: 'BuyAnimal', species, tile });
  return commands;
}

/** Allée principale : entrée et sortie reliées à une allée est-ouest (y = 40) qui longe tous les enclos. */
const MAIN_PATHS: Command[] = [
  ...line({ x: 21, y: 46 }, { x: 21, y: 41 }),
  ...line({ x: 26, y: 46 }, { x: 26, y: 41 }),
  ...line({ x: 7, y: 40 }, { x: 42, y: 40 }),
];

/** Enclos adaptés, équipés, sans surpopulation ; un stand et des bancs ; billet au prix juste. */
export const GOOD: Strategy = {
  ticket: 'fair',
  steps: [
    {
      day: 1,
      minMoney: 0,
      commands: [
        ...MAIN_PATHS,
        ...enclosure({
          rect: [8, 31, 15, 39],
          biome: 'savanna',
          water: [
            { x: 8, y: 31 },
            { x: 9, y: 31 },
          ],
          feeder: { x: 15, y: 31 },
          decor: [
            { kind: 'tree', tile: { x: 10, y: 34 } },
            { kind: 'rock', tile: { x: 13, y: 36 } },
            { kind: 'tree', tile: { x: 12, y: 32 } },
            { kind: 'rock', tile: { x: 9, y: 37 } },
          ],
          animals: [
            { species: 'zebra', tile: { x: 11, y: 37 } },
            { species: 'zebra', tile: { x: 12, y: 37 } },
            { species: 'zebra', tile: { x: 13, y: 38 } },
          ],
        }),
        ...enclosure({
          rect: [16, 30, 23, 39],
          biome: 'savanna',
          water: [
            { x: 16, y: 30 },
            { x: 17, y: 30 },
          ],
          feeder: { x: 23, y: 30 },
          decor: [
            { kind: 'tree', tile: { x: 18, y: 33 } },
            { kind: 'tree', tile: { x: 21, y: 35 } },
            { kind: 'tree', tile: { x: 19, y: 37 } },
            { kind: 'tree', tile: { x: 22, y: 32 } },
          ],
          animals: [
            { species: 'giraffe', tile: { x: 19, y: 38 } },
            { species: 'giraffe', tile: { x: 20, y: 38 } },
          ],
        }),
        { type: 'PlaceBuilding', kind: 'snack', tile: { x: 23, y: 41 } },
        { type: 'PlaceBuilding', kind: 'bench', tile: { x: 12, y: 41 } },
        { type: 'PlaceBuilding', kind: 'bench', tile: { x: 30, y: 41 } },
      ],
    },
    {
      day: 3,
      minMoney: 20_000,
      commands: enclosure({
        rect: [25, 30, 33, 39],
        biome: 'savanna',
        water: [
          { x: 25, y: 30 },
          { x: 26, y: 30 },
        ],
        feeder: { x: 33, y: 30 },
        decor: [
          { kind: 'rock', tile: { x: 27, y: 33 } },
          { kind: 'rock', tile: { x: 31, y: 35 } },
          { kind: 'tree', tile: { x: 29, y: 32 } },
          { kind: 'tree', tile: { x: 30, y: 37 } },
        ],
        animals: [
          { species: 'lion', tile: { x: 28, y: 38 } },
          { species: 'lion', tile: { x: 30, y: 38 } },
        ],
      }),
    },
    {
      day: 5,
      minMoney: 14_000,
      commands: [
        ...enclosure({
          rect: [34, 30, 41, 39],
          biome: 'forest',
          water: [
            { x: 40, y: 30 },
            { x: 41, y: 30 },
          ],
          feeder: { x: 34, y: 30 },
          decor: [
            { kind: 'bamboo', tile: { x: 36, y: 33 } },
            { kind: 'bamboo', tile: { x: 39, y: 34 } },
            { kind: 'bamboo', tile: { x: 37, y: 36 } },
            { kind: 'bamboo', tile: { x: 35, y: 37 } },
          ],
          animals: [{ species: 'panda', tile: { x: 37, y: 38 } }],
        }),
        { type: 'PlaceBuilding', kind: 'bench', tile: { x: 38, y: 41 } },
        { type: 'PlaceBuilding', kind: 'snack', tile: { x: 32, y: 41 } },
      ],
    },
  ],
};

/** Trop d'animaux, entassés dans des enclos trop petits, sans le bon sol ni décor ; billet trop cher, aucun service. */
export const BAD: Strategy = {
  ticket: 45,
  steps: [
    {
      day: 1,
      minMoney: 0,
      commands: [
        ...MAIN_PATHS,
        ...enclosure({
          rect: [10, 34, 15, 39],
          water: [{ x: 10, y: 34 }],
          feeder: { x: 15, y: 34 },
          animals: [
            { species: 'zebra', tile: { x: 12, y: 37 } },
            { species: 'zebra', tile: { x: 13, y: 37 } },
            { species: 'zebra', tile: { x: 12, y: 38 } },
            { species: 'giraffe', tile: { x: 13, y: 38 } },
            { species: 'giraffe', tile: { x: 14, y: 38 } },
          ],
        }),
        ...enclosure({
          rect: [27, 35, 31, 39],
          water: [{ x: 27, y: 35 }],
          feeder: { x: 31, y: 35 },
          animals: [
            { species: 'lion', tile: { x: 29, y: 38 } },
            { species: 'lion', tile: { x: 30, y: 38 } },
          ],
        }),
        ...enclosure({
          rect: [34, 35, 38, 39],
          water: [{ x: 34, y: 35 }],
          feeder: { x: 38, y: 35 },
          animals: [{ species: 'panda', tile: { x: 36, y: 38 } }],
        }),
      ],
    },
  ],
};

export interface DayReport {
  day: number;
  money: number;
  rating: number;
  visitors: number;
  net: number;
  objectives: number;
  satisfaction: number;
  wellbeing: number;
}

/** Joue `days` jours de la stratégie depuis l'état initial ; s'arrête à la faillite. */
export function playStrategy(
  strategy: Strategy,
  days: number,
  seed = 7,
): { state: GameState; days: DayReport[] } {
  const state = createInitialState(seed);
  const pending = strategy.steps.map((step) => ({ ...step, commands: [...step.commands] }));
  const reports: DayReport[] = [];
  let lastDay = 0;
  const totalTicks = days * balance.time.ticksPerDay;
  for (let t = 0; t < totalTicks && state.scenario.outcome === 'playing'; t++) {
    const { day, hour } = timeOfDay(state.tick);
    if (day !== lastDay && hour >= 7) {
      lastDay = day;
      const price = strategy.ticket === 'fair' ? fairTicket(state.stats.rating) : strategy.ticket;
      dispatchCommand(state, { type: 'SetTicketPrice', price });
    }
    for (const step of pending) {
      if (step.day > day || state.money < step.minMoney) continue;
      step.commands = step.commands.filter((command) => !dispatchCommand(state, command).ok);
    }
    stepSimulation(state);
    const ended = state.stats.history[state.stats.history.length - 1];
    if (ended && ended.day > (reports[reports.length - 1]?.day ?? 0)) {
      reports.push({
        day: ended.day,
        money: state.money,
        rating: Math.round(state.stats.rating * 100) / 100,
        visitors: ended.visitors,
        net:
          ended.tickets +
          ended.snacks -
          ended.construction -
          ended.animalPurchases -
          ended.animalFood -
          ended.upkeep,
        objectives: state.scenario.completedAt.filter((t) => t >= 0).length,
        satisfaction: Math.round(ended.satisfactionSum / Math.max(1, ended.departures)),
        wellbeing: Math.round(ratingBreakdown(state).wellbeing),
      });
    }
  }
  return { state, days: reports };
}

/** Prix juste arrondi à l'unité, dans les bornes du billet. */
function fairTicket(rating: number): number {
  const v = balance.visitors;
  const { min, max } = balance.economy.ticketPrice;
  return Math.min(max, Math.max(min, Math.round(v.fairPriceBase + v.fairPricePerStar * rating)));
}
