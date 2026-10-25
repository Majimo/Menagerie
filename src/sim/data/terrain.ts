// Types de sol (docs/02). L'état stocke l'indice du type dans `TILE_TYPES`, pour rester compact en JSON.

export const TILE_TYPES = ['grass', 'savanna', 'forest', 'sand', 'water', 'path'] as const;

export type TileType = (typeof TILE_TYPES)[number];

/** Biomes que le joueur peut peindre (l'eau arrive avec les points d'eau, itération 2). */
export const PAINTABLE_BIOMES = ['savanna', 'forest', 'grass', 'sand'] as const satisfies readonly TileType[];

export type PaintableBiome = (typeof PAINTABLE_BIOMES)[number];

export function tileCode(type: TileType): number {
  return TILE_TYPES.indexOf(type);
}

export function tileTypeOf(code: number): TileType {
  return TILE_TYPES[code] ?? 'grass';
}
