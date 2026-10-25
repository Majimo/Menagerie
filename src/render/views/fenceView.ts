import { DynamicDrawUsage, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import type { World } from '../../sim/state';
import { createFenceSegmentGeometry } from '../assets';

// Clôtures : un `InstancedMesh` d'un segment (deux poteaux, deux lisses), une instance par arête clôturée.

export interface FenceView {
  readonly mesh: InstancedMesh;
  update(world: Readonly<World>): void;
}

export function createFenceView(world: Readonly<World>): FenceView {
  const capacity = world.fencesH.length + world.fencesV.length;
  const mesh = new InstancedMesh(
    createFenceSegmentGeometry(),
    new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }),
    capacity,
  );
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.count = 0;

  const matrix = new Matrix4();
  const alongZ = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2);
  const alongX = new Quaternion();
  const scale = new Vector3(1, 1, 1);
  const position = new Vector3();
  let seenH: number[] = [];
  let seenV: number[] = [];

  return {
    mesh,
    update(current) {
      if (sameValues(seenH, current.fencesH) && sameValues(seenV, current.fencesV)) return;
      let count = 0;
      current.fencesH.forEach((fence, index) => {
        if (!fence) return;
        const x = index % current.width;
        position.set(x, 0, (index - x) / current.width);
        mesh.setMatrixAt(count++, matrix.compose(position, alongX, scale));
      });
      current.fencesV.forEach((fence, index) => {
        if (!fence) return;
        const x = index % (current.width + 1);
        position.set(x, 0, (index - x) / (current.width + 1));
        mesh.setMatrixAt(count++, matrix.compose(position, alongZ, scale));
      });
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      seenH = current.fencesH.slice();
      seenV = current.fencesV.slice();
    },
  };
}

function sameValues(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
