// Objets posés sur une tuile (docs/02) : nourrisseur, décors, stand de snacks et bancs des visiteurs.

/** Où l'objet peut être posé : dans un enclos, hors enclos au bord d'un chemin, ou n'importe où. */
export type BuildingPlacement = 'inEnclosure' | 'besidePath' | 'anywhere';

export interface BuildingDef {
  cost: number;
  placement: BuildingPlacement;
  /** Les animaux y mangent. */
  feeds: boolean;
  /** Les visiteurs y achètent un snack (depuis la tuile de chemin voisine). */
  sellsSnacks: boolean;
  /** Places assises pour les visiteurs fatigués (0 : ce n'est pas un banc). */
  seats: number;
  modelId: string;
}

export const BUILDINGS = {
  feeder: {
    cost: 150,
    placement: 'inEnclosure',
    feeds: true,
    sellsSnacks: false,
    seats: 0,
    modelId: 'building.feeder',
  },
  tree: {
    cost: 20,
    placement: 'anywhere',
    feeds: false,
    sellsSnacks: false,
    seats: 0,
    modelId: 'decor.tree',
  },
  rock: {
    cost: 20,
    placement: 'anywhere',
    feeds: false,
    sellsSnacks: false,
    seats: 0,
    modelId: 'decor.rock',
  },
  bamboo: {
    cost: 20,
    placement: 'anywhere',
    feeds: false,
    sellsSnacks: false,
    seats: 0,
    modelId: 'decor.bamboo',
  },
  snack: {
    cost: 800,
    placement: 'besidePath',
    feeds: false,
    sellsSnacks: true,
    seats: 0,
    modelId: 'building.snack',
  },
  bench: {
    cost: 120,
    placement: 'besidePath',
    feeds: false,
    sellsSnacks: false,
    seats: 2,
    modelId: 'building.bench',
  },
} as const satisfies Record<string, BuildingDef>;

export type BuildingKind = keyof typeof BUILDINGS;

export const BUILDING_KINDS = Object.keys(BUILDINGS) as BuildingKind[];

export function buildingDef(kind: BuildingKind): BuildingDef {
  return BUILDINGS[kind];
}
