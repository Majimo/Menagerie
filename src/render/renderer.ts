import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PCFShadowMap,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import type { GameState } from '../sim/state';
import { getModel } from './assets';
import { type CameraPreset, createIsoCamera } from './camera';
import { palette } from './palette';

// Scène, lumières et rendu d'une frame. Le rendu lit l'état, il ne le modifie jamais (règle d'architecture n° 2).

export interface RendererOptions {
  /** `prefers-reduced-motion` : pas d'animation décorative. */
  reducedMotion: boolean;
}

export interface GameRenderer {
  render(state: Readonly<GameState>, now: number): void;
  setCameraPreset(preset: CameraPreset): void;
  /** Fige les animations décoratives (captures déterministes). */
  setFrozen(frozen: boolean): void;
}

const SKY = 0xf3ead8;
const DEMO_GROUND_SIZE = 12;
const CUBE_TURNS_PER_SECOND = 0.05;

export function createRenderer(canvas: HTMLCanvasElement, options: RendererOptions): GameRenderer {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  scene.background = new Color(SKY);
  addLights(scene);
  scene.add(createDemoGround());

  const cube = getModel('debug-cube');
  scene.add(cube);

  const iso = createIsoCamera();
  let frozen = false;

  function resize(): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    iso.resize(width, height);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    render(_state, now) {
      // Figé : animations décoratives ramenées à t = 0, pour des captures identiques d'une exécution à l'autre.
      if (!options.reducedMotion) animateCube(cube, frozen ? 0 : now);
      renderer.render(scene, iso.camera);
    },
    setCameraPreset(preset) {
      iso.setPreset(preset);
    },
    setFrozen(value) {
      frozen = value;
    },
  };
}

function addLights(scene: Scene): void {
  scene.add(new HemisphereLight(0xfff4dc, palette.forest, 1.2));
  scene.add(new AmbientLight(0xffffff, 0.25));
  const sun = new DirectionalLight(0xfff0d0, 2.2);
  sun.position.set(12, 20, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const extent = DEMO_GROUND_SIZE;
  sun.shadow.camera.left = -extent;
  sun.shadow.camera.right = extent;
  sun.shadow.camera.top = extent;
  sun.shadow.camera.bottom = -extent;
  sun.shadow.radius = 3;
  scene.add(sun);
}

/** Sol provisoire de l'itération 0, remplacé par le terrain par chunks à l'itération 1. */
function createDemoGround(): Object3D {
  const ground = new Mesh(
    new PlaneGeometry(DEMO_GROUND_SIZE, DEMO_GROUND_SIZE),
    new MeshStandardMaterial({ color: palette.grass, flatShading: true }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}

function animateCube(cube: Object3D, now: number): void {
  cube.rotation.y = (now / 1000) * CUBE_TURNS_PER_SECOND * Math.PI * 2;
}
