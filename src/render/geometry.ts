import { BoxGeometry, type BufferGeometry, Color, Float32BufferAttribute, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Petits outils de géométrie low poly : primitives colorées par sommet, fusionnées en un seul maillage.

export type Vec3 = [number, number, number];

/** Matériau partagé des modèles procéduraux : couleurs par sommet, facettes plates. */
export const flatMaterial = new MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.85,
});

export function paint(geometry: BufferGeometry, color: number): BufferGeometry {
  const c = new Color(color);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

/** Boîte colorée par sommet, posée à la position donnée (centre). */
export function coloredBox(size: Vec3, center: Vec3, color: number): BufferGeometry {
  return paint(new BoxGeometry(...size).translate(...center), color);
}

export function merged(parts: BufferGeometry[]): BufferGeometry {
  const geometry = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)));
  if (!geometry) throw new Error('Fusion de géométries impossible');
  return geometry;
}
