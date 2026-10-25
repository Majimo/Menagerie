import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  ConeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { palette } from './palette';

// Registre d'assets : un modèle est demandé par id. Le chargement glTF arrive avec les premiers modèles ;
// en attendant, et en cas d'absence, un modèle procédural est fabriqué (le jeu reste jouable sans asset).

type ProceduralFactory = () => Object3D;

const FENCE_HEIGHT = 0.45;

/** Boîte colorée par sommet, posée à la position donnée (centre). */
function coloredBox(
  size: [number, number, number],
  center: [number, number, number],
  color: number,
): BufferGeometry {
  const geometry = new BoxGeometry(...size).translate(...center);
  return paint(geometry, color);
}

function paint(geometry: BufferGeometry, color: number): BufferGeometry {
  const c = new Color(color);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

function merged(parts: BufferGeometry[]): BufferGeometry {
  const geometry = mergeGeometries(parts.map((part) => part.toNonIndexed()));
  if (!geometry) throw new Error('Fusion de géométries impossible');
  return geometry;
}

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
  const mesh = new Mesh(
    merged(parts),
    new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }),
  );
  mesh.castShadow = true;
  const group = new Group();
  group.add(mesh);
  return group;
}

const procedural: Record<string, ProceduralFactory> = {
  'gate-entrance': () => gate(true),
  'gate-exit': () => gate(false),
};

/** Modèle procédural affiché quand l'id est inconnu : visible, sans faire planter le jeu. */
function missingModel(): Object3D {
  return new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshStandardMaterial({ color: palette.uiAlert }));
}

export function getModel(modelId: string): Object3D {
  const factory = procedural[modelId];
  return factory ? factory() : missingModel();
}
