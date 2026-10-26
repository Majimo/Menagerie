import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import { isVisitorBlocked } from '../sim/entities';
import type { AnimalId, GameState, VisitorId, World } from '../sim/state';
import { timeOfDay } from '../sim/time';
import { type CameraPreset, createIsoCamera, type IsoCamera } from './camera';
import { applyDaylight, type DaylightRig } from './daylight';
import { palette } from './palette';
import { type GroundPoint, pickGround, worldToClient } from './picking';
import { createTerrain } from './terrain';
import { createAnimalView } from './views/animalView';
import { createBuildingView } from './views/buildingView';
import { createEnclosureBadgeView } from './views/enclosureBadgeView';
import { createFenceView } from './views/fenceView';
import { createGateView } from './views/gateView';
import { createPreviewView, type Preview } from './views/previewView';
import { createViewSpotView } from './views/viewSpotView';
import { createVisitorView } from './views/visitorView';

// Scène, lumières et rendu d'une frame. Le rendu lit l'état, il ne le modifie jamais (règle d'architecture n° 2).

export interface RendererOptions {
  /** `prefers-reduced-motion` : pas d'animation décorative, rotation de caméra instantanée. */
  reducedMotion: boolean;
}

export interface RenderFrame {
  preview: Preview;
  now: number;
  /** Fraction du tick suivant déjà écoulée, pour interpoler les entités. */
  alpha: number;
  selectedAnimal: AnimalId | null;
  selectedVisitor: VisitorId | null;
}

export interface GameRenderer {
  readonly camera: IsoCamera;
  render(state: Readonly<GameState>, frame: RenderFrame): void;
  setCameraPreset(preset: CameraPreset, target?: GroundPoint): void;
  /** Fige les animations décoratives (captures déterministes). */
  setFrozen(frozen: boolean): void;
  /** Test de silhouette (docs/04) : animaux en noir sur fond uni, tout le reste masqué. */
  setSilhouette(on: boolean): void;
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
  const daylight = addLights(scene, world);
  const surround = createSurround(world);
  scene.add(surround);

  const terrain = createTerrain(world);
  const fences = createFenceView(world);
  const gates = createGateView(world);
  const preview = createPreviewView(world);
  const buildings = createBuildingView();
  const animals = createAnimalView();
  const badges = createEnclosureBadgeView();
  const viewSpots = createViewSpotView();
  const visitors = createVisitorView();
  scene.add(
    terrain.group,
    fences.mesh,
    gates.group,
    buildings.group,
    viewSpots.group,
    animals.group,
    visitors.group,
    badges.group,
    preview.group,
  );

  const iso = createIsoCamera(world);
  let frozen = false;
  let silhouette = false;
  const silhouetteMaterial = new MeshBasicMaterial({ color: 0x000000 });
  const scenery = [
    surround,
    terrain.group,
    fences.mesh,
    gates.group,
    buildings.group,
    viewSpots.group,
    visitors.group,
    badges.group,
    preview.group,
  ];
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
    render(state, frame) {
      const { now } = frame;
      const delta = lastFrame < 0 ? 0 : now - lastFrame;
      lastFrame = now;
      iso.update(delta, options.reducedMotion || frozen);
      if (!silhouette) applyDaylight(daylight, timeOfDay(state.tick).hour);
      terrain.update(state.world);
      fences.update(state.world);
      buildings.update(state.buildings, state.world);
      viewSpots.update(state);
      const animate = !(options.reducedMotion || frozen);
      visitors.update({
        visitors: state.visitors,
        tick: state.tick,
        isBlocked: (visitor) => isVisitorBlocked(state, visitor),
        alpha: frozen ? 1 : frame.alpha,
        now,
        deltaMs: delta,
        worldPerPixel: iso.worldPerPixel,
        animate,
        selected: frame.selectedVisitor,
      });
      animals.update({
        animals: state.animals,
        // Captures figées : pas d'interpolation, la position est celle du dernier tick.
        alpha: frozen ? 1 : frame.alpha,
        now,
        deltaMs: delta,
        worldPerPixel: iso.worldPerPixel,
        animate,
        selected: frame.selectedAnimal,
        silhouette,
      });
      badges.update(state, iso.worldPerPixel);
      preview.update(state.world, state.enclosures, frame.preview, iso.quarterTurns);
      gates.setWorldPerPixel(iso.worldPerPixel);
      renderer.render(scene, iso.camera);
    },
    setCameraPreset(preset, target) {
      iso.setPreset(preset, target);
    },
    setFrozen(value) {
      frozen = value;
    },
    setSilhouette(on) {
      silhouette = on;
      for (const object of scenery) object.visible = !on;
      scene.overrideMaterial = on ? silhouetteMaterial : null;
      if (on) (scene.background as Color).set(0xffffff);
    },
    pick: (clientX, clientY) => pickGround(iso.camera, canvas, clientX, clientY),
    toClient: (point) => worldToClient(iso.camera, canvas, { x: point.x, y: 0, z: point.z }),
  };
}

function addLights(scene: Scene, world: Readonly<World>): DaylightRig {
  const hemisphere = new HemisphereLight(0xfff4dc, palette.forest, 1.2);
  scene.add(hemisphere);
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
  return { scene, hemisphere, sun, baseHemisphere: hemisphere.intensity, baseSun: sun.intensity };
}

function createSurround(world: Readonly<World>): Mesh {
  const margin = 400;
  const ground = new Mesh(
    new PlaneGeometry(world.width + margin * 2, world.height + margin * 2),
    new MeshStandardMaterial({ color: SURROUND, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(world.width / 2, -0.02, world.height / 2);
  ground.receiveShadow = true;
  return ground;
}
