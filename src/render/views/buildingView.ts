import { type BufferGeometry, Group, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import { BUILDING_KINDS, BUILDINGS, type BuildingKind } from '../../sim/data/buildings';
import type { Building, BuildingId } from '../../sim/state';
import { getModel } from '../assets';
import { flatMaterial } from '../geometry';

// Objets fixes (nourrisseurs, décors) : un `InstancedMesh` par type, reconstruit quand la liste change.

export interface BuildingView {
  readonly group: Group;
  update(buildings: Readonly<Record<BuildingId, Building>>): void;
}

function geometryOf(kind: BuildingKind): BufferGeometry | null {
  const model = getModel(BUILDINGS[kind].modelId);
  return model instanceof Mesh ? (model.geometry as BufferGeometry) : null;
}

export function createBuildingView(): BuildingView {
  const group = new Group();
  const geometries = new Map(BUILDING_KINDS.map((kind) => [kind, geometryOf(kind)]));
  let key = '';
  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const one = new Vector3(1, 1, 1);

  return {
    group,
    update(buildings) {
      const list = Object.values(buildings);
      const nextKey = list.map((b) => b.id).join(',');
      if (nextKey === key) return;
      key = nextKey;
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
          // Rotation propre à chaque décor (dérivée de l'id) : la forêt ne paraît pas clonée.
          const angle = kind === 'feeder' || kind === 'snack' ? 0 : building.id * 2.39996;
          rotation.setFromAxisAngle(up, angle);
          matrix.compose(new Vector3(building.tile.x + 0.5, 0, building.tile.y + 0.5), rotation, one);
          mesh.setMatrixAt(i, matrix);
        });
        group.add(mesh);
      }
    },
  };
}
