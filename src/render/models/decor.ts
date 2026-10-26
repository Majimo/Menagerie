import {
  type BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
} from 'three';
import { coloredBox, merged, paint } from '../geometry';

// Objets fixes (non animés) : nourrisseur et décors. Géométries fusionnées, affichées en `InstancedMesh`.

export function feederGeometry(): BufferGeometry {
  const wood = 0x8a5a32;
  return merged([
    coloredBox([0.7, 0.24, 0.42], [0, 0.12, 0], wood),
    coloredBox([0.62, 0.06, 0.34], [0, 0.25, 0], 0xe8c547),
    paint(new IcosahedronGeometry(0.16, 0).scale(1.6, 0.7, 1).translate(0, 0.29, 0), 0xd9b23b),
    coloredBox([0.06, 0.55, 0.06], [-0.33, 0.27, 0], wood),
    coloredBox([0.06, 0.55, 0.06], [0.33, 0.27, 0], wood),
    coloredBox([0.8, 0.05, 0.5], [0, 0.56, 0], 0xb5503a),
  ]);
}

export function treeGeometry(): BufferGeometry {
  return merged([
    coloredBox([0.14, 0.6, 0.14], [0, 0.3, 0], 0x7a5230),
    paint(new IcosahedronGeometry(0.42, 0).translate(0, 0.85, 0), 0x5f9a48),
    paint(new IcosahedronGeometry(0.3, 0).translate(0.1, 1.22, 0.05), 0x6fae55),
  ]);
}

export function rockGeometry(): BufferGeometry {
  return merged([
    paint(new DodecahedronGeometry(0.34, 0).scale(1.2, 0.7, 1).translate(0, 0.2, 0), 0x9a978f),
    paint(new DodecahedronGeometry(0.2, 0).scale(1, 0.8, 1).translate(0.25, 0.12, 0.2), 0x84817a),
  ]);
}

export function bambooGeometry(): BufferGeometry {
  const stems: [number, number, number][] = [
    [0, 0, 1.25],
    [0.18, 0.1, 1.0],
    [-0.15, 0.14, 1.1],
    [0.06, -0.18, 0.9],
    [-0.12, -0.12, 1.15],
  ];
  const parts = stems.flatMap(([x, z, h]) => [
    paint(new CylinderGeometry(0.035, 0.04, h, 5).translate(x, h / 2, z), 0x7fae3f),
    paint(new CylinderGeometry(0.05, 0.05, 0.03, 5).translate(x, h * 0.5, z), 0x5d8a2c),
    paint(new ConeGeometry(0.1, 0.22, 4).translate(x + 0.05, h, z), 0x8cc152),
  ]);
  return merged(parts);
}

/** Hauteur de l'assise du banc : les visiteurs assis y posent le bassin (visitorView). */
export const BENCH_SEAT_HEIGHT = 0.24;

/** Banc de parc : assise le long de z, dossier côté −x ; on s'y assoit face à +x (l'allée). */
export function benchGeometry(): BufferGeometry {
  const wood = 0xb07a45;
  const dark = 0x4a4a4f;
  const parts: BufferGeometry[] = [
    coloredBox([0.3, 0.05, 0.86], [0, BENCH_SEAT_HEIGHT, 0], wood),
    // Dossier bas : vu de dos, il ne cache pas le visiteur assis.
    coloredBox([0.05, 0.12, 0.86], [-0.17, BENCH_SEAT_HEIGHT + 0.1, 0], wood),
  ];
  for (const z of [-0.36, 0.36]) {
    parts.push(
      coloredBox([0.3, BENCH_SEAT_HEIGHT, 0.05], [0, BENCH_SEAT_HEIGHT / 2, z], dark),
      coloredBox([0.05, BENCH_SEAT_HEIGHT + 0.16, 0.05], [-0.17, (BENCH_SEAT_HEIGHT + 0.16) / 2, z], dark),
    );
  }
  return merged(parts);
}
