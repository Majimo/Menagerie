import { type Camera, Plane, Raycaster, Vector2, Vector3 } from 'three';

// Rayon caméra → plan du sol (y = 0) → point du sol en coordonnées de grille (x, z continus, 1 tuile = 1 unité).

export interface GroundPoint {
  x: number;
  z: number;
}

const ground = new Plane(new Vector3(0, 1, 0), 0);
const raycaster = new Raycaster();
const ndc = new Vector2();
const hit = new Vector3();

/** `clientX/Y` relatifs au canvas. Renvoie `null` si le rayon ne touche pas le sol. */
export function pickGround(
  camera: Camera,
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): GroundPoint | null {
  const rect = canvas.getBoundingClientRect();
  ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(ground, hit)) return null;
  return { x: hit.x, z: hit.z };
}

/** Position écran (pixels CSS, relatifs à la page) d'un point du monde. */
export function worldToClient(
  camera: Camera,
  canvas: HTMLCanvasElement,
  point: { x: number; y: number; z: number },
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const projected = new Vector3(point.x, point.y, point.z).project(camera);
  return {
    x: rect.left + ((projected.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - projected.y) / 2) * rect.height,
  };
}
