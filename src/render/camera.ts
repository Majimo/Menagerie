import { OrthographicCamera, Vector3 } from 'three';

// Caméra orthographique isométrique : 45° en azimut, ~35° d'élévation (isométrie « vraie »).
// Déplacement (pan) borné à la carte, zoom continu, rotation par pas de 90°.

export type CameraPreset = 'far' | 'mid' | 'close';

/** Étendue visible du monde, en tuiles, sur la plus petite dimension de l'écran (portrait comme paysage). */
const VIEW_SIZE: Record<Exclude<CameraPreset, 'far'>, number> = { mid: 14, close: 6 };
const MIN_VIEW_SIZE = 5;

const ELEVATION = Math.atan(1 / Math.SQRT2);
const BASE_AZIMUTH = Math.PI / 4;
/** Assez loin pour que le sol au bas d'un écran portrait reste devant le plan proche. */
const DISTANCE = 300;
/** Vitesse de rotation animée (part de l'écart restant comblée par seconde, approximativement). */
const ROTATION_RATE = 12;

export interface MapBounds {
  width: number;
  height: number;
}

export interface IsoCamera {
  readonly camera: OrthographicCamera;
  resize(width: number, height: number): void;
  setPreset(preset: CameraPreset, target?: { x: number; z: number }): void;
  /** Déplace la vue d'un nombre de pixels écran (le monde suit le doigt). */
  panPixels(dx: number, dy: number): void;
  zoomBy(factor: number): void;
  /** Tourne d'un quart de tour (+1 : sens horaire vu du dessus). */
  rotate(steps: number): void;
  /** Avance l'animation de rotation ; `instant` : sans animation (mouvement réduit, captures). */
  update(deltaMs: number, instant: boolean): void;
  readonly viewSize: number;
  /** Taille d'un pixel écran en unités du monde (pour des éléments de taille constante à l'écran). */
  readonly worldPerPixel: number;
  /** Rotation demandée, en quarts de tour depuis l'orientation de départ. */
  readonly quarterTurns: number;
}

export function createIsoCamera(map: MapBounds): IsoCamera {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 1000);
  const target = new Vector3(map.width / 2, 0, map.height / 2);
  let viewSize = VIEW_SIZE.mid;
  let aspect = 1;
  let pixelHeight = 1;
  let rotationSteps = 0;
  let azimuth = BASE_AZIMUTH;

  /** Zoom le plus éloigné : toute la carte tient à l'écran (sa diagonale en largeur, sa hauteur projetée). */
  function fitViewSize(): number {
    const diagonal = Math.hypot(map.width, map.height) + 2;
    const projectedHeight = diagonal * Math.sin(ELEVATION) + 2;
    return aspect >= 1
      ? Math.max(projectedHeight, diagonal / aspect)
      : Math.max(diagonal, projectedHeight * aspect);
  }

  function visibleHeight(): number {
    return aspect >= 1 ? viewSize : viewSize / aspect;
  }

  function updateProjection(): void {
    viewSize = Math.min(Math.max(viewSize, MIN_VIEW_SIZE), fitViewSize());
    const halfH = visibleHeight() / 2;
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
  }

  function place(): void {
    target.x = Math.min(Math.max(target.x, 0), map.width);
    target.z = Math.min(Math.max(target.z, 0), map.height);
    const horizontal = DISTANCE * Math.cos(ELEVATION);
    camera.position.set(
      target.x + horizontal * Math.sin(azimuth),
      target.y + DISTANCE * Math.sin(ELEVATION),
      target.z + horizontal * Math.cos(azimuth),
    );
    camera.lookAt(target);
  }

  place();
  updateProjection();

  return {
    camera,
    get viewSize() {
      return viewSize;
    },
    get worldPerPixel() {
      return visibleHeight() / pixelHeight;
    },
    get quarterTurns() {
      return rotationSteps;
    },
    resize(width, height) {
      aspect = width / Math.max(1, height);
      pixelHeight = Math.max(1, height);
      updateProjection();
    },
    setPreset(preset, newTarget) {
      viewSize = preset === 'far' ? Number.POSITIVE_INFINITY : VIEW_SIZE[preset];
      if (newTarget) target.set(newTarget.x, 0, newTarget.z);
      else if (preset === 'far') target.set(map.width / 2, 0, map.height / 2);
      place();
      updateProjection();
    },
    panPixels(dx, dy) {
      const worldPerPixel = visibleHeight() / pixelHeight;
      // Axes écran projetés au sol : droite = (cos a, -sin a), avant (haut de l'écran) = (-sin a, -cos a),
      // une unité verticale d'écran couvrant 1 / sin(élévation) unités au sol.
      const right = dx * worldPerPixel;
      const forward = (dy * worldPerPixel) / Math.sin(ELEVATION);
      target.x += -right * Math.cos(azimuth) - forward * Math.sin(azimuth);
      target.z += right * Math.sin(azimuth) - forward * Math.cos(azimuth);
      place();
    },
    zoomBy(factor) {
      viewSize *= factor;
      updateProjection();
    },
    rotate(steps) {
      rotationSteps += steps;
    },
    update(deltaMs, instant) {
      const goal = BASE_AZIMUTH + (rotationSteps * Math.PI) / 2;
      if (azimuth === goal) return;
      const blend = instant ? 1 : 1 - Math.exp((-ROTATION_RATE * deltaMs) / 1000);
      azimuth += (goal - azimuth) * blend;
      if (Math.abs(goal - azimuth) < 1e-3) azimuth = goal;
      place();
    },
  };
}
