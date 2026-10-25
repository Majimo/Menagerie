// Objets posés sur une tuile (docs/02) : nourrisseur, décors et stand de snacks des visiteurs.

/** Où l'objet peut être posé : dans un enclos, hors enclos au bord d'un chemin, ou n'importe où. */
export type BuildingPlacement = 'inEnclosure' | 'besidePath' | 'anywhere';

export interface BuildingDef {
  cost: number;
  placement: BuildingPlacement;
  /** Les animaux y mangent. */
  feeds: boolean;
  /** Les visiteurs y achètent un snack (depuis la tuile de chemin voisine). */
  sellsSnacks: boolean;
  modelId: string;
}

export const BUILDINGS = {
  feeder: {
    cost: 150,
    placement: 'inEnclosure',
    feeds: true,
    sellsSnacks: false,
    modelId: 'building.feeder',
  },
  tree: { cost: 20, placement: 'anywhere', feeds: false, sellsSnacks: false, modelId: 'decor.tree' },
  rock: { cost: 20, placement: 'anywhere', feeds: false, sellsSnacks: false, modelId: 'decor.rock' },
  bamboo: { cost: 20, placement: 'anywhere', feeds: false, sellsSnacks: false, modelId: 'decor.bamboo' },
  snack: { cost: 800, placement: 'besidePath', feeds: false, sellsSnacks: true, modelId: 'building.snack' },
} as const satisfies Record<string, BuildingDef>;

export type BuildingKind = keyof typeof BUILDINGS;

export const BUILDING_KINDS = Object.keys(BUILDINGS) as BuildingKind[];

export function buildingDef(kind: BuildingKind): BuildingDef {
  return BUILDINGS[kind];
}
