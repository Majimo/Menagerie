import {
  BoxGeometry,
  type BufferGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from 'three';
import { coloredBox, flatMaterial, merged, paint } from './geometry';
import { createGiraffe, createLion, createPanda, createZebra } from './models/animals';
import { bambooGeometry, benchGeometry, feederGeometry, rockGeometry, treeGeometry } from './models/decor';
import { createVisitorModel, snackStandGeometry } from './models/visitors';
import { palette } from './palette';

// Registre d'assets : un modèle est demandé par id. Le chargement glTF arrive avec les premiers modèles ;
// en attendant, et en cas d'absence, un modèle procédural est fabriqué (le jeu reste jouable sans asset).

type ProceduralFactory = () => Object3D;

const FENCE_HEIGHT = 0.45;

/** Segment de clôture le long de +x, de (0, 0, 0) à (1, 0, 0) : basse, pour ne jamais masquer un animal. */
export function createFenceSegmentGeometry(): BufferGeometry {
  const post: [number, number, number] = [0.09, FENCE_HEIGHT, 0.09];
  return merged([
    coloredBox(post, [0, FENCE_HEIGHT / 2, 0], palette.fencePost),
    coloredBox(post, [1, FENCE_HEIGHT / 2, 0], palette.fencePost),
    coloredBox([1, 0.07, 0.05], [0.5, FENCE_HEIGHT * 0.4, 0], palette.fence),
    coloredBox([1, 0.07, 0.05], [0.5, FENCE_HEIGHT * 0.85, 0], palette.fence),
  ]);
}

/** Porte du zoo : deux piliers et un linteau ; l'entrée porte un fronton pointu, la sortie un linteau plat. */
function gate(pointed: boolean): Object3D {
  const stone = palette.gateStone;
  const accent = pointed ? palette.uiAccent : palette.fencePost;
  const parts = [
    coloredBox([0.2, 1.3, 0.2], [-0.45, 0.65, 0], stone),
    coloredBox([0.2, 1.3, 0.2], [0.45, 0.65, 0], stone),
    coloredBox([1.2, 0.18, 0.3], [0, 1.39, 0], accent),
  ];
  if (pointed) {
    parts.push(paint(new ConeGeometry(0.5, 0.45, 4).rotateY(Math.PI / 4).translate(0, 1.7, 0), accent));
  }
  const mesh = new Mesh(merged(parts), flatMaterial);
  mesh.castShadow = true;
  const group = new Group();
  group.add(mesh);
  return group;
}

/** Objet fixe en un seul maillage (la vue des objets en extrait la géométrie pour l'instanciation). */
function staticModel(geometry: () => BufferGeometry): ProceduralFactory {
  return () => {
    const mesh = new Mesh(geometry(), flatMaterial);
    mesh.castShadow = true;
    return mesh;
  };
}

const procedural: Record<string, ProceduralFactory> = {
  'gate-entrance': () => gate(true),
  'gate-exit': () => gate(false),
  'animal.zebra': createZebra,
  'animal.giraffe': createGiraffe,
  'animal.lion': createLion,
  'animal.panda': createPanda,
  'building.feeder': staticModel(feederGeometry),
  'decor.tree': staticModel(treeGeometry),
  'decor.rock': staticModel(rockGeometry),
  'decor.bamboo': staticModel(bambooGeometry),
  'building.snack': staticModel(snackStandGeometry),
  'building.bench': staticModel(benchGeometry),
  'visitor.adult': () => createVisitorModel('adult'),
  'visitor.child': () => createVisitorModel('child'),
};

/** Modèle procédural affiché quand l'id est inconnu : visible, sans faire planter le jeu. */
function missingModel(): Object3D {
  return new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshStandardMaterial({ color: palette.uiAlert }));
}

export function getModel(modelId: string): Object3D {
  const factory = procedural[modelId];
  return factory ? factory() : missingModel();
}
