// Objets posés sur une tuile (docs/02) : nourrisseur et décors. Les bâtiments des visiteurs arrivent à l'itération 3.

export interface BuildingDef {
  cost: number;
  /** Doit être posé dans un enclos. */
  inEnclosure: boolean;
  /** Les animaux y mangent. */
  feeds: boolean;
  modelId: string;
}

export const BUILDINGS = {
  feeder: { cost: 150, inEnclosure: true, feeds: true, modelId: 'building.feeder' },
  tree: { cost: 20, inEnclosure: false, feeds: false, modelId: 'decor.tree' },
  rock: { cost: 20, inEnclosure: false, feeds: false, modelId: 'decor.rock' },
  bamboo: { cost: 20, inEnclosure: false, feeds: false, modelId: 'decor.bamboo' },
} as const satisfies Record<string, BuildingDef>;

export type BuildingKind = keyof typeof BUILDINGS;

export const BUILDING_KINDS = Object.keys(BUILDINGS) as BuildingKind[];

export function buildingDef(kind: BuildingKind): BuildingDef {
  return BUILDINGS[kind];
}
