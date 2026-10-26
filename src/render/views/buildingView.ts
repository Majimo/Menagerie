import { type BufferGeometry, Group, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import { BUILDING_KINDS, BUILDINGS, type BuildingKind } from '../../sim/data/buildings';
import { tileCode } from '../../sim/data/terrain';
import type { Building, BuildingId, World } from '../../sim/state';
import { tileIndex } from '../../sim/world/grid';
import { getModel } from '../assets';
import { flatMaterial } from '../geometry';

// Objets fixes (nourrisseurs, décors, stands, bancs) : un `InstancedMesh` par type, reconstruit quand la liste
// ou le monde change (un banc se tourne vers l'allée qu'il borde).

export interface BuildingView {
  readonly group: Group;
  update(buildings: Readonly<Record<BuildingId, Building>>, world: Readonly<World>): void;
}

/** Angle qui tourne le +x local du modèle vers la première tuile de chemin voisine (0 s'il n'y en a pas). */
function facePath(world: Readonly<World>, building: Readonly<Building>): number {
  const { x, y } = building.tile;
  for (const [dx, dz] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const) {
    const nx = x + dx;
    const nz = y + dz;
    if (nx < 0 || nz < 0 || nx >= world.width || nz >= world.height) continue;
    if (world.tiles[tileIndex(world, { x: nx, y: nz })] === tileCode('path')) return Math.atan2(-dz, dx);
  }
  return 0;
}

function angleOf(world: Readonly<World>, building: Readonly<Building>): number {
  const def = BUILDINGS[building.kind];
  if (def.seats > 0) return facePath(world, building);
  if (building.kind === 'feeder' || def.sellsSnacks) return 0;
  // Rotation propre à chaque décor (dérivée de l'id) : la forêt ne paraît pas clonée.
  return building.id * 2.39996;
}

function geometryOf(kind: BuildingKind): BufferGeometry | null {
  const model = getModel(BUILDINGS[kind].modelId);
  return model instanceof Mesh ? (model.geometry as BufferGeometry) : null;
}

export function createBuildingView(): BuildingView {
  const group = new Group();
  const geometries = new Map(BUILDING_KINDS.map((kind) => [kind, geometryOf(kind)]));
  let key = '';
  let lastWorld: Readonly<World> | null = null;
  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const one = new Vector3(1, 1, 1);

  return {
    group,
    update(buildings, world) {
      const list = Object.values(buildings);
      const nextKey = `${world.revision}:${list.map((b) => b.id).join(',')}`;
      // Un autre monde (partie chargée) peut avoir la même révision et les mêmes ids.
      if (nextKey === key && world === lastWorld) return;
      key = nextKey;
      lastWorld = world;
      for (const child of [...group.children]) {
        group.remove(child);
        (child as InstancedMesh).dispose();
      }
      for (const kind of BUILDING_KINDS) {
        const geometry = geometries.get(kind);
        const ofKind = list.filter((b) => b.kind === kind);
        if (!geometry || ofKind.length === 0) continue;
        const mesh = new InstancedMesh(geometry, flatMaterial, ofKind.length);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        ofKind.forEach((building, i) => {
          rotation.setFromAxisAngle(up, angleOf(world, building));
          matrix.compose(new Vector3(building.tile.x + 0.5, 0, building.tile.y + 0.5), rotation, one);
          mesh.setMatrixAt(i, matrix);
        });
        group.add(mesh);
      }
    },
  };
}
