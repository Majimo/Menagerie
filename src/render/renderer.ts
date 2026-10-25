import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import type { GameState, World } from '../sim/state';
import { type CameraPreset, createIsoCamera, type IsoCamera } from './camera';
import { palette } from './palette';
import { type GroundPoint, pickGround, worldToClient } from './picking';
import { createTerrain } from './terrain';
import { createFenceView } from './views/fenceView';
import { createGateView } from './views/gateView';
import { createPreviewView, type Preview } from './views/previewView';

// Scène, lumières et rendu d'une frame. Le rendu lit l'état, il ne le modifie jamais (règle d'architecture n° 2).

export interface RendererOptions {
  /** `prefers-reduced-motion` : pas d'animation décorative, rotation de caméra instantanée. */
  reducedMotion: boolean;
}

export interface GameRenderer {
  readonly camera: IsoCamera;
  render(state: Readonly<GameState>, preview: Preview, now: number): void;
  setCameraPreset(preset: CameraPreset, target?: GroundPoint): void;
  /** Fige les animations décoratives (captures déterministes). */
  setFrozen(frozen: boolean): void;
  /** Point du sol sous un point écran (coordonnées client). */
  pick(clientX: number, clientY: number): GroundPoint | null;
  /** Position écran (coordonnées client) d'un point du sol. */
  toClient(point: GroundPoint): { x: number; y: number };
}

const SKY = 0xf3ead8;
/** Bordure de sol autour de la carte, pour que la carte ne flotte pas dans le vide. */
const SURROUND = 0xa9bf8a;

export function createRenderer(
  canvas: HTMLCanvasElement,
  world: Readonly<World>,
  options: RendererOptions,
): GameRenderer {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  scene.background = new Color(SKY);
  addLights(scene, world);
  scene.add(createSurround(world));

  const terrain = createTerrain(world);
  const fences = createFenceView(world);
  const gates = createGateView(world);
  const preview = createPreviewView(world);
  scene.add(terrain.group, fences.mesh, gates.group, preview.group);

  const iso = createIsoCamera(world);
  let frozen = false;
  let lastFrame = -1;

  function resize(): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    iso.resize(width, height);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    camera: iso,
    render(state, currentPreview, now) {
      const delta = lastFrame < 0 ? 0 : now - lastFrame;
      lastFrame = now;
      iso.update(delta, options.reducedMotion || frozen);
      terrain.update(state.world);
      fences.update(state.world);
      preview.update(state.world, state.enclosures, currentPreview, iso.quarterTurns);
      gates.setViewSize(iso.viewSize);
      renderer.render(scene, iso.camera);
    },
    setCameraPreset(preset, target) {
      iso.setPreset(preset, target);
    },
    setFrozen(value) {
      frozen = value;
    },
    pick: (clientX, clientY) => pickGround(iso.camera, canvas, clientX, clientY),
    toClient: (point) => worldToClient(iso.camera, canvas, { x: point.x, y: 0, z: point.z }),
  };
}

function addLights(scene: Scene, world: Readonly<World>): void {
  scene.add(new HemisphereLight(0xfff4dc, palette.forest, 1.2));
  scene.add(new AmbientLight(0xffffff, 0.25));
  const center = { x: world.width / 2, z: world.height / 2 };
  const sun = new DirectionalLight(0xfff0d0, 2.2);
  sun.position.set(center.x + 24, 40, center.z + 12);
  sun.target.position.set(center.x, 0, center.z);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const extent = Math.hypot(world.width, world.height) / 2 + 2;
  sun.shadow.camera.left = -extent;
  sun.shadow.camera.right = extent;
  sun.shadow.camera.top = extent;
  sun.shadow.camera.bottom = -extent;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
}

function createSurround(world: Readonly<World>): Mesh {
  const margin = 40;
  const ground = new Mesh(
    new PlaneGeometry(world.width + margin * 2, world.height + margin * 2),
    new MeshStandardMaterial({ color: SURROUND, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(world.width / 2, -0.02, world.height / 2);
  ground.receiveShadow = true;
  return ground;
}
