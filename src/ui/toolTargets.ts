import type { GroundPoint } from '../render/picking';
import type { Command } from '../sim/commands';
import type { BuildingKind } from '../sim/data/buildings';
import type { SpeciesId } from '../sim/data/species';
import { type PaintableBiome, tileCode } from '../sim/data/terrain';
import type { GameState } from '../sim/state';
import { type Edge, sameTile, type TileCoord } from '../sim/world/grid';

// Ce que vise un outil entre le point d'appui et le point courant : une liste de commandes.
// - Chemin : ligne droite selon l'axe dominant. Biome : rectangle de tuiles.
// - Clôture : arête la plus proche, ou contour du rectangle entre deux coins de tuiles (un trait si aligné).
// - Démolir : clôture proche du pointeur ou tuile ; en glissant, les chemins et clôtures du rectangle.
// - Animal, objet : la tuile sous le pointeur (un seul achat par geste).

export type ToolId = 'path' | 'fence' | 'biome' | 'animal' | 'object' | 'demolish';

export const TOOLS: readonly ToolId[] = ['path', 'fence', 'biome', 'animal', 'object', 'demolish'];

/** Variante choisie pour les outils qui en ont une (biome, espèce, objet). */
export interface ToolOptions {
  biome: PaintableBiome;
  species: SpeciesId;
  building: BuildingKind;
}

/** Distance (en tuiles) en deçà de laquelle « Démolir » vise la clôture plutôt que la tuile. */
const FENCE_GRAB = 0.22;

export function tileUnder(point: GroundPoint): TileCoord {
  return { x: Math.floor(point.x), y: Math.floor(point.z) };
}

export function nearestEdge(point: GroundPoint): { edge: Edge; distance: number } {
  const tile = tileUnder(point);
  const fx = point.x - tile.x;
  const fz = point.z - tile.y;
  const options: [number, Edge][] = [
    [fz, { axis: 'h', x: tile.x, y: tile.y }],
    [1 - fz, { axis: 'h', x: tile.x, y: tile.y + 1 }],
    [fx, { axis: 'v', x: tile.x, y: tile.y }],
    [1 - fx, { axis: 'v', x: tile.x + 1, y: tile.y }],
  ];
  options.sort((a, b) => a[0] - b[0]);
  const [distance, edge] = options[0] as [number, Edge];
  return { edge, distance };
}

function range(a: number, b: number): number[] {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

function hasFence(state: Readonly<GameState>, edge: Edge): boolean {
  const { world } = state;
  return edge.axis === 'h'
    ? world.fencesH[edge.y * world.width + edge.x] === 1
    : world.fencesV[edge.y * (world.width + 1) + edge.x] === 1;
}

export function targetsFor(
  tool: ToolId,
  { biome, species, building }: ToolOptions,
  state: Readonly<GameState>,
  start: GroundPoint | null,
  current: GroundPoint,
): Command[] {
  const end = tileUnder(current);
  const from = start ? tileUnder(start) : end;
  switch (tool) {
    case 'path': {
      const horizontal = Math.abs(end.x - from.x) >= Math.abs(end.y - from.y);
      const tiles = horizontal
        ? range(from.x, end.x).map((x) => ({ x, y: from.y }))
        : range(from.y, end.y).map((y) => ({ x: from.x, y }));
      return tiles.map((tile) => ({ type: 'PlacePath', tile }));
    }
    case 'biome':
      return range(from.y, end.y).flatMap((y) =>
        range(from.x, end.x).map((x): Command => ({ type: 'PaintBiome', tile: { x, y }, biome })),
      );
    case 'fence':
      return fenceTargets(state, start, current).map((edge) => ({ type: 'PlaceFence', edge }));
    case 'demolish':
      return demolishTargets(state, start, current);
    case 'animal':
      return [{ type: 'BuyAnimal', tile: end, species }];
    case 'object':
      return [{ type: 'PlaceBuilding', tile: end, kind: building }];
  }
}

function fenceTargets(state: Readonly<GameState>, start: GroundPoint | null, current: GroundPoint): Edge[] {
  const { width, height } = state.world;
  const corner = (p: GroundPoint) => ({
    x: Math.min(Math.max(Math.round(p.x), 0), width),
    y: Math.min(Math.max(Math.round(p.z), 0), height),
  });
  const a = start ? corner(start) : null;
  const b = corner(current);
  if (!a || (a.x === b.x && a.y === b.y)) return [nearestEdge(current).edge];

  const edges: Edge[] = [];
  const xs = range(a.x, b.x).slice(0, -1);
  const ys = range(a.y, b.y).slice(0, -1);
  for (const y of a.y === b.y ? [a.y] : [a.y, b.y]) for (const x of xs) edges.push({ axis: 'h', x, y });
  for (const x of a.x === b.x ? [a.x] : [a.x, b.x]) for (const y of ys) edges.push({ axis: 'v', x, y });
  return edges;
}

function demolishTargets(
  state: Readonly<GameState>,
  start: GroundPoint | null,
  current: GroundPoint,
): Command[] {
  const tile = tileUnder(current);
  const near = nearestEdge(current);
  if (!start || sameTile(tileUnder(start), tile)) {
    if (near.distance < FENCE_GRAB && hasFence(state, near.edge)) {
      return [{ type: 'Demolish', target: { kind: 'fence', edge: near.edge } }];
    }
    return [{ type: 'Demolish', target: { kind: 'tile', tile } }];
  }

  const from = tileUnder(start);
  const xs = range(from.x, tile.x);
  const ys = range(from.y, tile.y);
  const { world } = state;
  const commands: Command[] = [];
  for (const y of ys) {
    for (const x of xs) {
      if (world.tiles[y * world.width + x] !== tileCode('path')) continue;
      commands.push({ type: 'Demolish', target: { kind: 'tile', tile: { x, y } } });
    }
  }
  const lastY = ys[ys.length - 1] ?? 0;
  const lastX = xs[xs.length - 1] ?? 0;
  const edges: Edge[] = [
    ...[...ys, lastY + 1].flatMap((y) => xs.map((x): Edge => ({ axis: 'h', x, y }))),
    ...[...xs, lastX + 1].flatMap((x) => ys.map((y): Edge => ({ axis: 'v', x, y }))),
  ];
  for (const edge of edges) {
    if (hasFence(state, edge)) commands.push({ type: 'Demolish', target: { kind: 'fence', edge } });
  }
  // Rien à démolir : on vise la tuile sous le pointeur, l'aperçu dira pourquoi c'est impossible.
  return commands.length > 0 ? commands : [{ type: 'Demolish', target: { kind: 'tile', tile } }];
}
