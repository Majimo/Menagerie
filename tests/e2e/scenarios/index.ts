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
  /**
   * Itération 3 : journée chargée, ~150 visiteurs et 40 animaux (mesure de performance). Deux rangées d'enclos
   * de part et d'autre d'une promenade double, une allée au sud, un anneau qui relie le tout, trois stands de snacks.
   */
  'busy-day': {
    seed: 5,
    money: 500_000,
    commands: busyDay(),
    ticks: 270,
    focus: { x: 23, y: 31 },
  },
  /**
   * Issue #4 : le zoo de `busy-day` en fin d'après-midi (17 h 36), quand la faim gagne. Les visiteurs affamés
   * vont aux stands de snacks au lieu de rester devant les enclos ; vue centrée sur les deux stands de l'entrée.
   */
  'snack-time': {
    seed: 5,
    money: 500_000,
    commands: busyDay(),
    ticks: 480,
    focus: { x: 23, y: 43 },
  },
  /**
   * Itération 3 : zoo en crise, de jour. Argent négatif (dépenses > recettes), zèbres morts et affamés (ni eau ni
   * nourrisseur), lions sans chemin (enclos invisible), pas de stand de snacks, billet cher, puis l'allée de la
   * sortie est coupée : des visiteurs sont bloqués.
   */
  crisis: {
    seed: 6,
    money: 44_850,
    commands: [
      ...enclosure({ rect: [10, 31, 17, 38], biome: 'savanna', equipment: [put('tree', 11, 32)] }),
      ...enclosure({
        rect: [19, 30, 27, 38],
        biome: 'savanna',
        equipment: [water(19, 30), put('feeder', 27, 38), put('tree', 20, 36), put('tree', 26, 31)],
        animals: [buy('giraffe', 23, 33), buy('giraffe', 24, 34)],
      }),
      ...enclosure({
        rect: [30, 22, 37, 29],
        biome: 'savanna',
        equipment: [water(30, 22), put('feeder', 37, 29), put('rock', 33, 24)],
        animals: [buy('lion', 33, 26), buy('lion', 35, 27)],
      }),
      ...mainAlley(39, 9, 29),
      { type: 'SetTicketPrice', price: 50 },
    ],
    // Jour 1, 22 h 43 : achat des zèbres, sans eau ni nourrisseur ; ils meurent le jour 6 vers 9 h.
    // L'argent de départ est réglé pour payer le zèbre du jour 2 et finir dans le rouge le jour 6.
    ticks: 736,
    steps: [
      { commands: [buy('zebra', 13, 34), buy('zebra', 14, 35), buy('zebra', 15, 33)], ticks: 464 },
      // Jour 2, 8 h : un zèbre de plus, encore vivant le jour 6 : les visiteurs viennent le voir et trouvent les corps.
      { commands: [buy('zebra', 12, 36)], ticks: 4800 },
      // Jour 6, 8 h : le joueur brade le billet pour attirer du monde.
      { commands: [{ type: 'SetTicketPrice', price: 5 }], ticks: 110 },
      // 10 h 12 : l'allée est coupée au milieu ; à l'ouest de la coupure, les visiteurs ne peuvent plus sortir.
      { commands: [{ type: 'Demolish', target: { kind: 'tile', tile: { x: 24, y: 39 } } }], ticks: 40 },
    ],
    focus: { x: 20, y: 37 },
  },
  /** Carte pleine (mesure de performance) : 36 enclos peints, quadrillage de chemins. */
  'full-map': { seed: 1, commands: fullMap(), ticks: 10 },
} satisfies Record<string, Scenario>;

function busyDay(): Command[] {
  const commands: Command[] = [];
  const decor = (x0: number, y0: number, x1: number, y1: number, kind: BuildingKind) => [
    put(kind, x0 + 1, y0 + 1),
    put(kind, x1 - 1, y0 + 1),
    put(kind, x0 + 1, y1 - 1),
    put(kind, x1 - 2, y1 - 2),
  ];
  // Rangée nord (y 17 → 28) et rangée sud (y 31 → 42) ; promenade double en y 29 et 30, allée en y 43.
  for (const [y0, y1] of [
    [17, 28],
    [31, 42],
  ] as const) {
    const zebras = Array.from({ length: 8 }, (_, i) =>
      buy('zebra', 5 + (i % 4) * 2, y0 + 3 + Math.floor(i / 4) * 4),
    );
    commands.push(
      ...enclosure({
        rect: [3, y0, 12, y1],
        biome: 'savanna',
        equipment: [
          water(3, y0 + 5),
          water(3, y0 + 6),
          put('feeder', 12, y0 + 5),
          ...decor(3, y0, 12, y1, 'tree'),
        ],
        animals: zebras,
      }),
    );
    const giraffes = Array.from({ length: 6 }, (_, i) =>
      buy('giraffe', 16 + (i % 3) * 3, y0 + 3 + Math.floor(i / 3) * 5),
    );
    commands.push(
      ...enclosure({
        rect: [14, y0, 24, y1],
        biome: 'savanna',
        equipment: [
          water(24, y0 + 5),
          water(24, y0 + 6),
          put('feeder', 14, y0 + 5),
          ...decor(14, y0, 24, y1, 'tree'),
        ],
        animals: giraffes,
      }),
    );
    const lions = Array.from({ length: 4 }, (_, i) =>
      buy('lion', 28 + (i % 2) * 4, y0 + 4 + Math.floor(i / 2) * 4),
    );
    commands.push(
      ...enclosure({
        rect: [26, y0, 35, y1],
        biome: 'savanna',
        equipment: [water(35, y0 + 5), put('feeder', 26, y0 + 6), ...decor(26, y0, 35, y1, 'rock')],
        animals: lions,
      }),
    );
    for (const [py0, py1] of [
      [y0, y0 + 5],
      [y0 + 6, y1],
    ] as const) {
      commands.push(
        ...enclosure({
          rect: [37, py0, 44, py1],
          biome: 'forest',
          equipment: [water(44, py0), put('feeder', 37, py1), ...decor(37, py0, 44, py1, 'bamboo')],
          animals: [buy('panda', 40, py0 + 3)],
        }),
      );
    }
  }
  const segment = (x0: number, y0: number, x1: number, y1: number): [TileCoord, TileCoord] => [
    { x: x0, y: y0 },
    { x: x1, y: y1 },
  ];
  commands.push(
    ...paths(
      segment(2, 29, 45, 29),
      segment(2, 30, 45, 30),
      segment(2, 43, 45, 43),
      // Anneau et passages entre les enclos de la rangée sud : la promenade et l'allée sont reliées.
      segment(2, 31, 2, 42),
      segment(45, 31, 45, 42),
      segment(45, 17, 45, 28),
      segment(13, 31, 13, 42),
      segment(25, 31, 25, 42),
      segment(36, 31, 36, 42),
      segment(21, 46, 21, 44),
      segment(26, 46, 26, 44),
    ),
    put('snack', 22, 44),
    put('snack', 25, 45),
    put('snack', 1, 36),
    put('snack', 46, 36),
  );
  return commands;
}

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
