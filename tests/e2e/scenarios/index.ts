import type { Command } from '../../../src/sim/commands';
import type { BuildingKind } from '../../../src/sim/data/buildings';
import type { SpeciesId } from '../../../src/sim/data/species';
import type { PaintableBiome } from '../../../src/sim/data/terrain';
import { dispatchCommand, stepSimulation } from '../../../src/sim/simulation';
import { createInitialState, type GameState } from '../../../src/sim/state';
import type { TileCoord } from '../../../src/sim/world/grid';

// Scénarios seedés de référence pour les captures (docs/09) : une seed, des commandes, un nombre de ticks,
// puis éventuellement d'autres étapes (commandes puis ticks) pour échelonner des achats dans le temps.

export interface ScenarioStep {
  commands: Command[];
  ticks: number;
}

export interface Scenario {
  seed: number;
  /** Argent de départ, s'il diffère de l'équilibrage (scénarios de démonstration). */
  money?: number;
  commands: Command[];
  ticks: number;
  steps?: ScenarioStep[];
  /** Tuile au centre de la vue pour les zooms `mid` et `close`. */
  focus?: TileCoord;
}

/** Joue un scénario depuis un état neuf. Les commandes refusées sont ignorées, comme en jeu. */
export function runScenario(scenario: Scenario): GameState {
  const state = createInitialState(scenario.seed);
  if (scenario.money !== undefined) state.money = scenario.money;
  for (const step of [{ commands: scenario.commands, ticks: scenario.ticks }, ...(scenario.steps ?? [])]) {
    for (const command of step.commands) dispatchCommand(state, command);
    for (let i = 0; i < step.ticks; i++) stepSimulation(state);
  }
  return state;
}

function line(from: TileCoord, to: TileCoord): TileCoord[] {
  const tiles: TileCoord[] = [];
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  for (let x = from.x, y = from.y; ; x += dx, y += dy) {
    tiles.push({ x, y });
    if (x === to.x && y === to.y) return tiles;
  }
}

function rectangle(x0: number, y0: number, x1: number, y1: number): Command[] {
  const commands: Command[] = [];
  for (let x = x0; x <= x1; x++) {
    commands.push({ type: 'PlaceFence', edge: { axis: 'h', x, y: y0 } });
    commands.push({ type: 'PlaceFence', edge: { axis: 'h', x, y: y1 + 1 } });
  }
  for (let y = y0; y <= y1; y++) {
    commands.push({ type: 'PlaceFence', edge: { axis: 'v', x: x0, y } });
    commands.push({ type: 'PlaceFence', edge: { axis: 'v', x: x1 + 1, y } });
  }
  return commands;
}

const paths = (...segments: [TileCoord, TileCoord][]): Command[] =>
  segments.flatMap(([from, to]) => line(from, to).map((tile): Command => ({ type: 'PlacePath', tile })));

const paint = (x0: number, y0: number, x1: number, y1: number, biome: PaintableBiome): Command[] =>
  line({ x: x0, y: y0 }, { x: x0, y: y1 }).flatMap(({ y }) =>
    line({ x: x0, y }, { x: x1, y }).map((tile): Command => ({ type: 'PaintBiome', tile, biome })),
  );

const water = (x: number, y: number): Command => ({ type: 'PaintBiome', tile: { x, y }, biome: 'water' });
const put = (kind: BuildingKind, x: number, y: number): Command => ({
  type: 'PlaceBuilding',
  tile: { x, y },
  kind,
});
const buy = (species: SpeciesId, x: number, y: number): Command => ({
  type: 'BuyAnimal',
  tile: { x, y },
  species,
});

interface EnclosureSpec {
  rect: [number, number, number, number];
  biome?: PaintableBiome;
  equipment?: Command[];
  animals?: Command[];
}

/** Enclos complet : biome, clôtures, équipement, animaux (dans cet ordre, l'eau et les objets exigent l'enclos). */
function enclosure({
  rect: [x0, y0, x1, y1],
  biome,
  equipment = [],
  animals = [],
}: EnclosureSpec): Command[] {
  return [
    ...(biome ? paint(x0, y0, x1, y1, biome) : []),
    ...rectangle(x0, y0, x1, y1),
    ...equipment,
    ...animals,
  ];
}

/** Chemins de l'entrée et de la sortie jusqu'à une allée horizontale en y. */
const mainAlley = (y: number, x0: number, x1: number): Command[] =>
  paths(
    [
      { x: 21, y: 46 },
      { x: 21, y: y + 1 },
    ],
    [
      { x: 26, y: 46 },
      { x: 26, y: y + 1 },
    ],
    [
      { x: x0, y },
      { x: x1, y },
    ],
  );

export const scenarios = {
  /** Itération 0 : la scène de démarrage. */
  boot: { seed: 1, commands: [], ticks: 0 },
  /** Carte vierge : entrée et sortie seulement. */
  'empty-map': { seed: 1, commands: [], ticks: 0, focus: { x: 23, y: 44 } },
  /** Un enclos de savane fermé, longé par une boucle de chemin reliant l'entrée à la sortie. */
  'first-enclosure': {
    seed: 1,
    commands: [
      ...paint(17, 32, 26, 38, 'savanna'),
      ...paint(19, 34, 21, 36, 'forest'),
      ...rectangle(17, 32, 26, 38),
      ...paths(
        [
          { x: 21, y: 46 },
          { x: 21, y: 40 },
        ],
        [
          { x: 26, y: 46 },
          { x: 26, y: 40 },
        ],
        [
          { x: 15, y: 39 },
          { x: 28, y: 39 },
        ],
      ),
    ],
    ticks: 10,
    focus: { x: 22, y: 38 },
  },
  /** Itération 2 : les quatre espèces dans des enclos bien équipés (animaux contents, test de silhouette). */
  'four-species': {
    seed: 2,
    money: 200_000,
    commands: [
      ...enclosure({
        rect: [12, 21, 19, 28],
        biome: 'forest',
        equipment: [
          water(12, 21),
          put('feeder', 19, 28),
          put('bamboo', 13, 27),
          put('bamboo', 18, 22),
          put('bamboo', 14, 22),
          put('bamboo', 18, 26),
        ],
        animals: [buy('panda', 16, 25)],
      }),
      ...enclosure({
        rect: [12, 30, 19, 37],
        biome: 'savanna',
        equipment: [
          water(12, 30),
          water(13, 30),
          put('feeder', 19, 37),
          put('tree', 13, 36),
          put('tree', 18, 31),
          put('rock', 16, 36),
          put('rock', 12, 33),
        ],
        animals: [buy('zebra', 15, 33), buy('zebra', 16, 34), buy('zebra', 14, 35)],
      }),
      ...enclosure({
        rect: [21, 30, 28, 37],
        biome: 'savanna',
        equipment: [
          water(28, 30),
          put('feeder', 21, 37),
          put('tree', 22, 31),
          put('tree', 27, 36),
          put('tree', 25, 31),
          put('tree', 23, 35),
        ],
        animals: [buy('giraffe', 24, 33), buy('giraffe', 26, 34)],
      }),
      ...enclosure({
        rect: [30, 30, 37, 37],
        biome: 'savanna',
        equipment: [
          water(37, 30),
          put('feeder', 30, 37),
          put('rock', 31, 31),
          put('rock', 36, 36),
          put('rock', 34, 31),
          put('tree', 32, 35),
        ],
        animals: [buy('lion', 33, 33), buy('lion', 35, 34)],
      }),
      ...mainAlley(39, 10, 39),
    ],
    ticks: 300,
    focus: { x: 23, y: 29 },
  },
  /**
   * Itération 2 : un animal par état visible, sans ouvrir de panneau. Achats échelonnés pour que tout se voie à
   * 18 h 48 du jour 5 : zèbres morts (ni eau ni nourriture), lion malade (pas de nourrisseur), girafes assoiffées
   * (petit enclos sans eau), panda affamé (pas de nourrisseur), zèbre seul malheureux (enclos minuscule), zèbres contents.
   */
  'animal-needs': {
    seed: 3,
    money: 200_000,
    commands: [
      ...enclosure({ rect: [10, 26, 15, 31], animals: [buy('zebra', 12, 28), buy('zebra', 13, 29)] }),
      ...enclosure({
        rect: [17, 26, 23, 31],
        biome: 'savanna',
        equipment: [water(17, 26), put('rock', 22, 30)],
        animals: [buy('lion', 20, 28)],
      }),
      ...enclosure({ rect: [25, 28, 27, 31], biome: 'savanna', equipment: [put('feeder', 27, 31)] }),
      ...enclosure({
        rect: [10, 33, 15, 38],
        biome: 'forest',
        equipment: [water(10, 33), put('bamboo', 14, 37)],
      }),
      ...enclosure({
        rect: [17, 33, 19, 35],
        equipment: [water(17, 33), put('feeder', 19, 35)],
        animals: [buy('zebra', 18, 34)],
      }),
      ...enclosure({
        rect: [22, 33, 29, 38],
        biome: 'savanna',
        equipment: [
          water(22, 33),
          put('feeder', 29, 38),
          put('tree', 23, 37),
          put('tree', 28, 34),
          put('rock', 25, 38),
          put('rock', 27, 33),
        ],
        animals: [buy('zebra', 25, 35), buy('zebra', 26, 36)],
      }),
      ...mainAlley(40, 9, 31),
    ],
    ticks: 3540,
    steps: [
      { commands: [buy('giraffe', 25, 29), buy('giraffe', 26, 30), buy('panda', 12, 35)], ticks: 1800 },
    ],
    focus: { x: 20, y: 32 },
  },
  /** Carte pleine (mesure de performance) : 36 enclos peints, quadrillage de chemins. */
  'full-map': { seed: 1, commands: fullMap(), ticks: 10 },
} satisfies Record<string, Scenario>;

function fullMap(): Command[] {
  const commands: Command[] = [];
  const biomes = ['savanna', 'forest', 'sand'] as const;
  for (let by = 0; by < 48; by += 8) {
    for (let bx = 0; bx < 48; bx += 8) {
      const biome = biomes[(bx + by) % 3] ?? 'savanna';
      commands.push(...paint(bx + 1, by + 1, bx + 7, by + 7, biome));
      commands.push(...rectangle(bx + 1, by + 1, bx + 7, by + 7));
    }
  }
  for (let i = 0; i < 48; i += 8) {
    commands.push(
      ...paths(
        [
          { x: i, y: 0 },
          { x: i, y: 47 },
        ],
        [
          { x: 0, y: i },
          { x: 47, y: i },
        ],
      ),
    );
  }
  return commands;
}

export type ScenarioName = keyof typeof scenarios;
