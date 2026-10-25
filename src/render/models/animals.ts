import { type BufferGeometry, Group, IcosahedronGeometry, Mesh, type Object3D, SphereGeometry } from 'three';
import { coloredBox, flatMaterial, merged, paint, type Vec3 } from '../geometry';

// Modèles procéduraux des animaux, articulés pour l'animation (docs/04 : silhouette distinctive par espèce).
// Repère du modèle : l'animal regarde vers +x, le sol est en y = 0.

/** Articulations animées par la vue des animaux. */
export interface AnimalRig {
  /** Pivot de tout le corps : abaissé pour dormir, couché pour la mort. */
  pose: Object3D;
  /** Tronc : respiration. */
  body: Object3D;
  /** Pivot à la base du cou : baisser la tête pour manger ou boire. */
  neck: Object3D;
  /** Pivots aux hanches : avant gauche, avant droite, arrière gauche, arrière droite. */
  legs: Object3D[];
  tail: Object3D;
  legLength: number;
  /** Rotation de repos du cou. */
  neckRest: number;
  /** Hauteur du haut de la tête, pour placer l'icône d'état. */
  height: number;
  meshes: Mesh[];
}

const BLACK = 0x23211d;

function mesh(rig: { meshes: Mesh[] }, geometry: BufferGeometry): Mesh {
  const m = new Mesh(geometry, flatMaterial);
  m.castShadow = true;
  rig.meshes.push(m);
  return m;
}

function sphere(radius: number, scale: Vec3, center: Vec3, color: number, detail = 6): BufferGeometry {
  return paint(
    new SphereGeometry(radius, detail, Math.max(3, detail - 2)).scale(...scale).translate(...center),
    color,
  );
}

interface Skeleton {
  legLength: number;
  legThickness: number;
  legColor: number;
  hoofColor: number;
  /** Positions des hanches (x, z), dans l'ordre de `AnimalRig.legs`. */
  hips: [number, number][];
  /** Décoration de chaque patte (rayures…), en coordonnées de la patte (pivot en haut). */
  legExtras?: (length: number) => BufferGeometry[];
  body: BufferGeometry[];
  neckAt: Vec3;
  neckRest: number;
  neck: BufferGeometry[];
  tailAt: Vec3;
  tailRest: number;
  tail: BufferGeometry[];
  height: number;
}

function assemble(skeleton: Skeleton): Group {
  const root = new Group();
  const meshes: Mesh[] = [];
  const pose = new Group();
  root.add(pose);

  const body = new Group();
  body.add(mesh({ meshes }, merged(skeleton.body)));
  pose.add(body);

  const neck = new Group();
  neck.position.set(...skeleton.neckAt);
  neck.rotation.z = skeleton.neckRest;
  neck.add(mesh({ meshes }, merged(skeleton.neck)));
  pose.add(neck);

  const tail = new Group();
  tail.position.set(...skeleton.tailAt);
  tail.rotation.z = skeleton.tailRest;
  tail.add(mesh({ meshes }, merged(skeleton.tail)));
  pose.add(tail);

  const { legLength: length, legThickness: thick } = skeleton;
  const legGeometry = merged([
    coloredBox([thick, length, thick], [0, -length / 2, 0], skeleton.legColor),
    coloredBox([thick * 1.15, length * 0.12, thick * 1.15], [0, -length * 0.94, 0], skeleton.hoofColor),
    ...(skeleton.legExtras?.(length) ?? []),
  ]);
  const legs = skeleton.hips.map(([x, z]) => {
    const leg = new Group();
    leg.position.set(x, length, z);
    leg.add(mesh({ meshes }, legGeometry));
    pose.add(leg);
    return leg;
  });

  const rig: AnimalRig = {
    pose,
    body,
    neck,
    legs,
    tail,
    legLength: length,
    neckRest: skeleton.neckRest,
    height: skeleton.height,
    meshes,
  };
  root.userData.rig = rig;
  return root;
}

export function rigOf(model: Object3D): AnimalRig | undefined {
  return model.userData.rig as AnimalRig | undefined;
}

/** Zèbre : silhouette de cheval, rayures noires sur fond blanc, crinière dressée. */
export function createZebra(): Object3D {
  const white = 0xf4f1ea;
  const legLength = 0.5;
  const bodyY = legLength + 0.18;
  const stripes = [-0.38, -0.24, -0.1, 0.04, 0.18, 0.32].map((x, i) =>
    coloredBox([0.065, 0.42, 0.38], [x, bodyY + (i % 2) * 0.01, 0], BLACK),
  );
  return assemble({
    legLength,
    legThickness: 0.09,
    legColor: white,
    hoofColor: BLACK,
    hips: [
      [0.33, -0.11],
      [0.33, 0.11],
      [-0.33, -0.11],
      [-0.33, 0.11],
    ],
    legExtras: (l) => [
      coloredBox([0.1, 0.04, 0.1], [0, -l * 0.35, 0], BLACK),
      coloredBox([0.1, 0.04, 0.1], [0, -l * 0.6, 0], BLACK),
    ],
    body: [coloredBox([0.95, 0.4, 0.36], [0, bodyY, 0], white), ...stripes],
    neckAt: [0.4, bodyY + 0.1, 0],
    neckRest: -0.5,
    neck: [
      coloredBox([0.18, 0.5, 0.16], [0, 0.22, 0], white),
      coloredBox([0.19, 0.06, 0.17], [0, 0.12, 0], BLACK),
      coloredBox([0.19, 0.06, 0.17], [0, 0.28, 0], BLACK),
      // Crinière dressée, noire, sur l'arrière du cou.
      coloredBox([0.07, 0.56, 0.06], [-0.1, 0.26, 0], BLACK),
      // Tête allongée vers l'avant et un peu vers le bas, museau noir, oreilles pointues.
      coloredBox([0.2, 0.17, 0.16], [0.08, 0.5, 0], white),
      coloredBox([0.3, 0.15, 0.14], [0.26, 0.42, 0], white),
      coloredBox([0.12, 0.14, 0.145], [0.42, 0.37, 0], BLACK),
      coloredBox([0.05, 0.14, 0.05], [0.0, 0.63, -0.05], white),
      coloredBox([0.05, 0.14, 0.05], [0.0, 0.63, 0.05], white),
    ],
    tailAt: [-0.47, bodyY + 0.12, 0],
    tailRest: -0.3,
    tail: [
      coloredBox([0.04, 0.38, 0.04], [0, -0.19, 0], white),
      coloredBox([0.07, 0.14, 0.07], [0, -0.42, 0], BLACK),
    ],
    height: 1.25,
  });
}

/** Girafe : très hautes pattes, long cou, taches brunes, ossicônes. */
export function createGiraffe(): Object3D {
  const coat = 0xe2a845;
  const spot = 0x9a5a26;
  const legLength = 0.95;
  const bodyY = legLength + 0.17;
  const bodySpots = (
    [
      [-0.28, 0.06],
      [-0.08, -0.05],
      [0.14, 0.07],
      [0.3, -0.04],
      [-0.18, -0.12],
      [0.04, 0.13],
    ] as const
  ).map(([x, y]) => coloredBox([0.13, 0.11, 0.38], [x, bodyY + y, 0], spot));
  const neckSpots = [0.25, 0.5, 0.75].map((y, i) =>
    coloredBox([0.15, 0.1, 0.12], [i % 2 ? 0.01 : -0.01, y, 0], spot),
  );
  return assemble({
    legLength,
    legThickness: 0.09,
    legColor: coat,
    hoofColor: 0x4a3420,
    hips: [
      [0.28, -0.12],
      [0.28, 0.12],
      [-0.28, -0.12],
      [-0.28, 0.12],
    ],
    legExtras: (l) => [coloredBox([0.1, 0.08, 0.1], [0, -l * 0.25, 0], spot)],
    body: [coloredBox([0.8, 0.42, 0.36], [0, bodyY, 0], coat), ...bodySpots],
    neckAt: [0.3, bodyY + 0.12, 0],
    neckRest: -0.35,
    neck: [
      coloredBox([0.14, 1.05, 0.13], [0, 0.5, 0], coat),
      ...neckSpots,
      coloredBox([0.05, 0.9, 0.05], [-0.08, 0.5, 0], spot),
      // Tête : museau vers l'avant, ossicônes et oreilles.
      coloredBox([0.32, 0.14, 0.13], [0.15, 1.02, 0], coat),
      coloredBox([0.1, 0.11, 0.12], [0.3, 0.99, 0], 0xc98d3a),
      coloredBox([0.035, 0.12, 0.035], [0.02, 1.15, -0.04], coat),
      coloredBox([0.035, 0.12, 0.035], [0.02, 1.15, 0.04], coat),
      coloredBox([0.05, 0.04, 0.05], [0.02, 1.22, -0.04], 0x4a3420),
      coloredBox([0.05, 0.04, 0.05], [0.02, 1.22, 0.04], 0x4a3420),
      coloredBox([0.04, 0.04, 0.24], [0.0, 1.08, 0], coat),
    ],
    tailAt: [-0.4, bodyY + 0.12, 0],
    tailRest: -0.2,
    tail: [
      coloredBox([0.035, 0.5, 0.035], [0, -0.25, 0], coat),
      coloredBox([0.06, 0.12, 0.06], [0, -0.54, 0], 0x4a3420),
    ],
    height: 2.35,
  });
}

/** Lion : corps fauve bas, énorme crinière sombre, queue terminée par un toupet. */
export function createLion(): Object3D {
  const coat = 0xd9a056;
  const mane = 0x7a3e1b;
  const legLength = 0.38;
  const bodyY = legLength + 0.15;
  return assemble({
    legLength,
    legThickness: 0.12,
    legColor: coat,
    hoofColor: 0xe8c48a,
    hips: [
      [0.3, -0.12],
      [0.3, 0.12],
      [-0.3, -0.12],
      [-0.3, 0.12],
    ],
    body: [
      coloredBox([0.88, 0.36, 0.36], [0, bodyY, 0], coat),
      coloredBox([0.6, 0.06, 0.3], [0, bodyY - 0.18, 0], 0xe8c48a),
    ],
    neckAt: [0.4, bodyY + 0.1, 0],
    neckRest: -0.15,
    neck: [
      // Crinière : une grosse boule à facettes qui élargit la tête dans toutes les vues.
      paint(new IcosahedronGeometry(0.32, 0).scale(0.95, 1.05, 1.15).translate(0.02, 0.1, 0), mane),
      coloredBox([0.26, 0.24, 0.26], [0.2, 0.08, 0], coat),
      coloredBox([0.12, 0.12, 0.16], [0.36, 0.02, 0], 0xe8c48a),
      coloredBox([0.05, 0.05, 0.08], [0.43, 0.06, 0], BLACK),
      coloredBox([0.06, 0.08, 0.07], [0.1, 0.29, -0.13], coat),
      coloredBox([0.06, 0.08, 0.07], [0.1, 0.29, 0.13], coat),
    ],
    tailAt: [-0.44, bodyY + 0.1, 0],
    tailRest: -0.75,
    tail: [
      coloredBox([0.04, 0.55, 0.04], [0, -0.27, 0], coat),
      coloredBox([0.09, 0.13, 0.09], [0, -0.57, 0], mane),
    ],
    height: 1.15,
  });
}

/** Panda : corps rond et trapu, blanc à pattes et épaules noires, tête ronde, oreilles et yeux noirs. */
export function createPanda(): Object3D {
  const white = 0xf2f0ea;
  const legLength = 0.3;
  const bodyY = legLength + 0.17;
  return assemble({
    legLength,
    legThickness: 0.17,
    legColor: BLACK,
    hoofColor: BLACK,
    hips: [
      [0.22, -0.15],
      [0.22, 0.15],
      [-0.22, -0.15],
      [-0.22, 0.15],
    ],
    body: [
      sphere(1, [0.42, 0.26, 0.27], [0, bodyY, 0], white, 8),
      // Bande noire des épaules.
      coloredBox([0.18, 0.48, 0.5], [0.13, bodyY, 0], BLACK),
    ],
    neckAt: [0.3, bodyY + 0.08, 0],
    neckRest: 0,
    neck: [
      sphere(0.24, [1, 0.95, 1.05], [0.1, 0.06, 0], white, 8),
      // Grandes oreilles rondes bien détachées : c'est elles qui font la silhouette.
      sphere(0.11, [0.8, 1, 1], [0.03, 0.31, -0.18], BLACK, 6),
      sphere(0.11, [0.8, 1, 1], [0.03, 0.31, 0.18], BLACK, 6),
      coloredBox([0.06, 0.1, 0.08], [0.3, 0.1, -0.09], BLACK),
      coloredBox([0.06, 0.1, 0.08], [0.3, 0.1, 0.09], BLACK),
      coloredBox([0.12, 0.1, 0.12], [0.32, 0.0, 0], white),
      coloredBox([0.05, 0.05, 0.07], [0.38, 0.02, 0], BLACK),
    ],
    tailAt: [-0.4, bodyY + 0.06, 0],
    tailRest: -0.6,
    tail: [coloredBox([0.08, 0.08, 0.08], [0, -0.03, 0], white)],
    height: 1.15,
  });
}
