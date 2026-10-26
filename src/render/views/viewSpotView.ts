import { BoxGeometry, Group, InstancedMesh, Matrix4, MeshStandardMaterial } from 'three';
import type { GameState } from '../../sim/state';
import { visitorNetwork } from '../../sim/world/visitorNetwork';

// Zones d'observation (docs/04) : une planche de bois posée sur le chemin, le long de la clôture,
// là où les visiteurs s'arrêtent pour regarder. Reconstruit quand le monde change.

const BOARD = new BoxGeometry(0.84, 0.035, 0.16);
const material = new MeshStandardMaterial({ color: 0xa5774a, roughness: 0.9 });

export interface ViewSpotView {
  readonly group: Group;
  update(state: Readonly<GameState>): void;
}

export function createViewSpotView(): ViewSpotView {
  const group = new Group();
  let last: ReturnType<typeof visitorNetwork> | null = null;
  const matrix = new Matrix4();
  const rotation = new Matrix4();

  return {
    group,
    update(state) {
      const network = visitorNetwork(state);
      // Réseau mis en cache par état et révision : un nouvel objet = monde changé ou partie chargée.
      if (network === last) return;
      last = network;
      for (const child of [...group.children]) {
        group.remove(child);
        (child as InstancedMesh).dispose();
      }
      const { world } = state;
      const boards: [number, number, boolean][] = [];
      for (const spots of network.viewSpots.values()) {
        for (const spot of spots) {
          const x = spot % world.width;
          const y = (spot - x) / world.width;
          const sides: [number, number][] = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          for (const [dx, dy] of sides) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
            if (world.enclosureOf[ny * world.width + nx] === 0) continue;
            boards.push([x + 0.5 + dx * 0.36, y + 0.5 + dy * 0.36, dx !== 0]);
          }
        }
      }
      if (boards.length === 0) return;
      const mesh = new InstancedMesh(BOARD, material, boards.length);
      mesh.receiveShadow = true;
      boards.forEach(([x, z, vertical], i) => {
        rotation.makeRotationY(vertical ? Math.PI / 2 : 0);
        matrix.makeTranslation(x, 0.058, z).multiply(rotation);
        mesh.setMatrixAt(i, matrix);
      });
      group.add(mesh);
    },
  };
}
