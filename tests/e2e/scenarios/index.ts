import type { Command } from '../../../src/sim/commands';
import type { TileCoord } from '../../../src/sim/world/grid';

// Scénarios seedés de référence pour les captures (docs/09) : une seed, des commandes, un nombre de ticks.

export interface Scenario {
  seed: number;
  commands: Command[];
  ticks: number;
  /** Tuile au centre de la vue pour les zooms `mid` et `close`. */
  focus?: TileCoord;
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

const paint = (x0: number, y0: number, x1: number, y1: number, biome: 'savanna' | 'forest'): Command[] =>
  line({ x: x0, y: y0 }, { x: x0, y: y1 }).flatMap(({ y }) =>
    line({ x: x0, y }, { x: x1, y }).map((tile): Command => ({ type: 'PaintBiome', tile, biome })),
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
} satisfies Record<string, Scenario>;

export type ScenarioName = keyof typeof scenarios;
