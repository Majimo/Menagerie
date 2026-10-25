// Grille de tuiles et arêtes de clôture.
//
// Repère : tuile (x, y), x vers l'est, y vers le sud ; en 3D, x → x et y → z.
// Arête `h` (x, y) : bord nord de la tuile (x, y), y dans [0, height]. Arête `v` (x, y) : bord ouest, x dans [0, width].

export interface TileCoord {
  x: number;
  y: number;
}

export type EdgeAxis = 'h' | 'v';

export interface Edge {
  axis: EdgeAxis;
  x: number;
  y: number;
}

export interface GridSize {
  width: number;
  height: number;
}

export function inBounds(size: GridSize, { x, y }: TileCoord): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < size.width && y < size.height;
}

export function tileIndex(size: GridSize, { x, y }: TileCoord): number {
  return y * size.width + x;
}

export function tileAt(size: GridSize, index: number): TileCoord {
  return { x: index % size.width, y: Math.floor(index / size.width) };
}

export function edgeInBounds(size: GridSize, { axis, x, y }: Edge): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return false;
  return axis === 'h' ? x < size.width && y <= size.height : x <= size.width && y < size.height;
}

/** Indice d'une arête dans `fencesH` (largeur × (hauteur + 1)) ou `fencesV` ((largeur + 1) × hauteur). */
export function edgeIndex(size: GridSize, { axis, x, y }: Edge): number {
  return axis === 'h' ? y * size.width + x : y * (size.width + 1) + x;
}

export function sameTile(a: TileCoord, b: TileCoord): boolean {
  return a.x === b.x && a.y === b.y;
}
