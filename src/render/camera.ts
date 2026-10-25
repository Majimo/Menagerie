import { OrthographicCamera, Vector3 } from 'three';

// Caméra orthographique isométrique : 45° en azimut, ~35° d'élévation (isométrie « vraie »).

export type CameraPreset = 'far' | 'mid' | 'close';

/** Étendue visible du monde, en tuiles, sur la plus petite dimension de l'écran (portrait comme paysage). */
const VIEW_SIZE: Record<CameraPreset, number> = { far: 40, mid: 14, close: 6 };

const ELEVATION = Math.atan(1 / Math.SQRT2);
const AZIMUTH = Math.PI / 4;
const DISTANCE = 100;

export interface IsoCamera {
  readonly camera: OrthographicCamera;
  resize(width: number, height: number): void;
  setPreset(preset: CameraPreset, target?: Vector3): void;
}

export function createIsoCamera(): IsoCamera {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  const target = new Vector3();
  let viewSize = VIEW_SIZE.mid;
  let aspect = 1;

  function updateProjection(): void {
    const halfMin = viewSize / 2;
    const halfH = aspect >= 1 ? halfMin : halfMin / aspect;
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
  }

  function place(): void {
    const horizontal = DISTANCE * Math.cos(ELEVATION);
    camera.position.set(
      target.x + horizontal * Math.sin(AZIMUTH),
      target.y + DISTANCE * Math.sin(ELEVATION),
      target.z + horizontal * Math.cos(AZIMUTH),
    );
    camera.lookAt(target);
  }

  place();
  updateProjection();

  return {
    camera,
    resize(width, height) {
      aspect = width / Math.max(1, height);
      updateProjection();
    },
    setPreset(preset, newTarget) {
      viewSize = VIEW_SIZE[preset];
      if (newTarget) target.copy(newTarget);
      place();
      updateProjection();
    },
  };
}
