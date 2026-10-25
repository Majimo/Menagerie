import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { type TileType, tileCode, tileTypeOf } from '../sim/data/terrain';
import type { World } from '../sim/state';
import { palette } from './palette';

// Maillage du sol par chunks de 16×16 tuiles, reconstruit uniquement quand une tuile du chunk change.
// Les chemins sont une dalle légèrement surélevée avec des bords sombres : ils se distinguent du sable
// par la forme, pas seulement par la couleur.

const CHUNK = 16;
const PATH_HEIGHT = 0.04;

const TILE_COLORS: Record<TileType, number> = {
  grass: palette.grass,
  savanna: palette.savanna,
  forest: palette.forest,
  sand: palette.sand,
  water: palette.water,
  path: palette.path,
};

export interface TerrainView {
  readonly group: Group;
  update(world: Readonly<World>): void;
}

export function createTerrain(world: Readonly<World>): TerrainView {
  const group = new Group();
  const material = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  const chunksX = Math.ceil(world.width / CHUNK);
  const chunksY = Math.ceil(world.height / CHUNK);
  const chunks: Mesh[] = [];
  for (let cy = 0; cy < chunksY; cy++) {
    for (let cx = 0; cx < chunksX; cx++) {
      const mesh = new Mesh(new BufferGeometry(), material);
      mesh.receiveShadow = true;
      chunks.push(mesh);
      group.add(mesh);
    }
  }
  group.add(createGrid(world));

  let seen: number[] = [];

  return {
    group,
    update(current) {
      const dirty = new Set<number>();
      for (let i = 0; i < current.tiles.length; i++) {
        if (seen[i] === current.tiles[i]) continue;
        // Les bords d'une dalle de chemin dépendent des voisines : le chunk voisin peut aussi changer.
        const x = i % current.width;
        const y = (i - x) / current.width;
        for (const [nx, ny] of [
          [x, y],
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ] as const) {
          if (nx < 0 || ny < 0 || nx >= current.width || ny >= current.height) continue;
          dirty.add(Math.floor(ny / CHUNK) * chunksX + Math.floor(nx / CHUNK));
        }
      }
      if (dirty.size === 0) return;
      for (const index of dirty) {
        const mesh = chunks[index];
        if (!mesh) continue;
        mesh.geometry.dispose();
        mesh.geometry = buildChunk(current, (index % chunksX) * CHUNK, Math.floor(index / chunksX) * CHUNK);
      }
      seen = current.tiles.slice();
    },
  };
}

/** Variation de teinte stable par tuile (aspect low poly, pas d'aplat uniforme). */
function jitter(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return (h - Math.floor(h) - 0.5) * 0.05;
}

function buildChunk(world: Readonly<World>, x0: number, y0: number): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new Color();
  const pathCode = tileCode('path');
  const isPath = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < world.width && y < world.height && world.tiles[y * world.width + x] === pathCode;

  function quad(corners: [number, number, number][], c: Color): void {
    // Deux triangles : 0-1-2 et 0-2-3.
    for (const i of [0, 1, 2, 0, 2, 3]) {
      const [x, y, z] = corners[i] as [number, number, number];
      positions.push(x, y, z);
      colors.push(c.r, c.g, c.b);
    }
  }

  for (let y = y0; y < Math.min(y0 + CHUNK, world.height); y++) {
    for (let x = x0; x < Math.min(x0 + CHUNK, world.width); x++) {
      const type = tileTypeOf(world.tiles[y * world.width + x] ?? 0);
      const h = type === 'path' ? PATH_HEIGHT : 0;
      color.setHex(TILE_COLORS[type]).offsetHSL(0, 0, jitter(x, y));
      // Sommets dans le sens antihoraire vu du dessus (normale vers +y).
      quad(
        [
          [x, h, y],
          [x, h, y + 1],
          [x + 1, h, y + 1],
          [x + 1, h, y],
        ],
        color,
      );
      if (type !== 'path') continue;
      color.setHex(palette.pathSide);
      if (!isPath(x, y + 1))
        quad(
          [
            [x, h, y + 1],
            [x, 0, y + 1],
            [x + 1, 0, y + 1],
            [x + 1, h, y + 1],
          ],
          color,
        );
      if (!isPath(x + 1, y))
        quad(
          [
            [x + 1, h, y + 1],
            [x + 1, 0, y + 1],
            [x + 1, 0, y],
            [x + 1, h, y],
          ],
          color,
        );
      if (!isPath(x, y - 1))
        quad(
          [
            [x + 1, h, y],
            [x + 1, 0, y],
            [x, 0, y],
            [x, h, y],
          ],
          color,
        );
      if (!isPath(x - 1, y))
        quad(
          [
            [x, h, y],
            [x, 0, y],
            [x, 0, y + 1],
            [x, h, y + 1],
          ],
          color,
        );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Quadrillage discret : repère des tuiles pour la construction. */
function createGrid(world: Readonly<World>): LineSegments {
  const points: number[] = [];
  const y = 0.005;
  for (let x = 0; x <= world.width; x++) points.push(x, y, 0, x, y, world.height);
  for (let z = 0; z <= world.height; z++) points.push(0, y, z, world.width, y, z);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  return new LineSegments(
    geometry,
    new LineBasicMaterial({ color: palette.uiInk, transparent: true, opacity: 0.08 }),
  );
}
