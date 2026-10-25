import { OrthographicCamera, Vector3 } from 'three';

// Caméra orthographique isométrique : 45° en azimut, ~35° d'élévation (isométrie « vraie »).

export type CameraPreset = 'far' | 'mid' | 'close';

/** Hauteur visible du monde, en tuiles, pour chaque niveau de zoom. */
const VIEW_HEIGHT: Record<CameraPreset, number> = { far: 40, mid: 14, close: 6 };

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
  let viewHeight = VIEW_HEIGHT.mid;
  let aspect = 1;

  function updateProjection(): void {
    const halfH = viewHeight / 2;
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
      viewHeight = VIEW_HEIGHT[preset];
      if (newTarget) target.copy(newTarget);
      place();
      updateProjection();
    },
  };
}
