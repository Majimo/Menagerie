import {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three';
import { SPECIES } from '../../sim/data/species';
import { type AnimalStatus, animalStatus } from '../../sim/entities';
import type { Animal, AnimalId } from '../../sim/state';
import { getModel } from '../assets';
import { flatMaterial } from '../geometry';
import { statusIcon } from '../icons';
import { type AnimalRig, rigOf } from '../models/animals';

// Animaux : position interpolée entre deux ticks, animation procédurale selon l'activité, icône d'état au-dessus.

/** Hauteur affichée de l'icône d'état, en pixels CSS. */
const ICON_PX = 38;
/** Matériau d'un animal mort : couleurs ternies. */
const deadMaterial = new MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 1,
  color: 0x8a8580,
});

type ShownStatus = Exclude<AnimalStatus, 'content'>;

interface Entry {
  root: Object3D;
  rig: AnimalRig | undefined;
  icon: Sprite;
  heading: number;
  /** Phase du cycle de marche, avancée selon la distance parcourue. */
  phase: number;
  lastX: number;
  lastZ: number;
  dead: boolean;
}

export interface AnimalFrame {
  animals: Readonly<Record<AnimalId, Animal>>;
  /** Fraction du tick suivant déjà écoulée (interpolation). */
  alpha: number;
  now: number;
  deltaMs: number;
  worldPerPixel: number;
  /** Faux en mouvement réduit ou captures figées : poses fixes, sans oscillation. */
  animate: boolean;
  selected: AnimalId | null;
  /** Test de silhouette : ni icône ni anneau de sélection. */
  silhouette: boolean;
}

export interface AnimalView {
  readonly group: Group;
  update(frame: AnimalFrame): void;
}

export function createAnimalView(): AnimalView {
  const group = new Group();
  const entries = new Map<AnimalId, Entry>();
  const materials = new Map<ShownStatus, SpriteMaterial>();
  const ring = new Mesh(
    new RingGeometry(0.42, 0.52, 24).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xfff6e5, depthTest: false, transparent: true, opacity: 0.95 }),
  );
  ring.renderOrder = 5;
  group.add(ring);

  const materialFor = (status: ShownStatus): SpriteMaterial => {
    let material = materials.get(status);
    if (!material) {
      const texture = new CanvasTexture(statusIcon(status));
      texture.colorSpace = SRGBColorSpace;
      material = new SpriteMaterial({ map: texture, depthTest: false, transparent: true });
      materials.set(status, material);
    }
    return material;
  };

  const create = (animal: Animal): Entry => {
    const root = getModel(SPECIES[animal.species].modelId);
    root.scale.setScalar(SPECIES[animal.species].displayScale);
    const icon = new Sprite();
    icon.renderOrder = 11;
    group.add(root, icon);
    return {
      root,
      rig: rigOf(root),
      icon,
      heading: -animal.heading,
      phase: animal.id,
      lastX: animal.x,
      lastZ: animal.y,
      dead: false,
    };
  };

  return {
    group,
    update(frame) {
      for (const [id, entry] of entries) {
        if (frame.animals[id]) continue;
        group.remove(entry.root, entry.icon);
        entries.delete(id);
      }
      ring.visible = false;
      for (const animal of Object.values(frame.animals)) {
        let entry = entries.get(animal.id);
        if (!entry) {
          entry = create(animal);
          entries.set(animal.id, entry);
        }
        place(entry, animal, frame);
        if (entry.rig) pose(entry, entry.rig, animal, frame);
        const status = animalStatus(animal);
        showIcon(entry, animal, status, frame, materialFor);
        if (frame.silhouette) entry.icon.visible = false;
        else if (frame.selected === animal.id) {
          ring.visible = true;
          ring.position.set(entry.root.position.x, 0.03, entry.root.position.z);
        }
      }
    },
  };
}

function place(entry: Entry, animal: Animal, frame: AnimalFrame): void {
  const x = animal.prevX + (animal.x - animal.prevX) * frame.alpha;
  const z = animal.prevY + (animal.y - animal.prevY) * frame.alpha;
  const legLength = entry.rig?.legLength ?? 0.4;
  entry.phase += (Math.hypot(x - entry.lastX, z - entry.lastZ) / (legLength * 1.2)) * Math.PI;
  entry.lastX = x;
  entry.lastZ = z;
  entry.root.position.set(x, 0, z);
  // Le cap de la simulation est mesuré de +x vers +z ; en 3D, une rotation y positive va de +x vers −z.
  const target = -animal.heading;
  if (!frame.animate) {
    entry.heading = target;
  } else {
    const diff = Math.atan2(Math.sin(target - entry.heading), Math.cos(target - entry.heading));
    entry.heading += diff * Math.min(1, frame.deltaMs / 120);
  }
  entry.root.rotation.y = entry.heading;
}

function pose(entry: Entry, rig: AnimalRig, animal: Animal, frame: AnimalFrame): void {
  const t = frame.animate ? frame.now / 1000 + animal.id * 1.37 : animal.id;
  const wave = (speed: number, amplitude: number) => (frame.animate ? Math.sin(t * speed) * amplitude : 0);
  rig.pose.position.y = 0;
  rig.pose.rotation.set(0, 0, 0);
  rig.body.scale.set(1, 1, 1);
  rig.neck.rotation.z = rig.neckRest;
  rig.tail.rotation.x = 0;
  for (const leg of rig.legs) leg.rotation.set(0, 0, 0);

  const dead = animal.activity === 'dead';
  if (dead !== entry.dead) {
    for (const mesh of rig.meshes) mesh.material = dead ? deadMaterial : flatMaterial;
    entry.dead = dead;
  }
  const sick = animalStatus(animal) === 'sick';

  switch (animal.activity) {
    case 'walk': {
      // Captures figées : pose de marche fixe, pattes écartées.
      const phase = frame.animate ? entry.phase : 1.2;
      const swing = Math.sin(phase) * 0.5;
      const [frontLeft, frontRight, backLeft, backRight] = rig.legs;
      if (frontLeft) frontLeft.rotation.z = swing;
      if (backRight) backRight.rotation.z = swing;
      if (frontRight) frontRight.rotation.z = -swing;
      if (backLeft) backLeft.rotation.z = -swing;
      if (frame.animate) rig.pose.position.y = Math.abs(Math.sin(phase)) * 0.04 * rig.legLength;
      rig.neck.rotation.z = rig.neckRest + Math.sin(phase * 2) * 0.05 - (sick ? 0.3 : 0);
      rig.tail.rotation.x = Math.sin(phase) * 0.2;
      break;
    }
    case 'eat':
    case 'drink':
      rig.neck.rotation.z = rig.neckRest - 1.1 + wave(5, 0.08);
      rig.tail.rotation.x = wave(3, 0.3);
      break;
    case 'sleep':
      for (const leg of rig.legs) leg.rotation.z = 1.45;
      rig.pose.position.y = -rig.legLength * 0.85;
      rig.neck.rotation.z = rig.neckRest - 0.7;
      rig.body.scale.y = 1 + wave(1.2, 0.035);
      break;
    case 'dead':
      // Couché sur le flanc, pattes raides.
      rig.pose.rotation.x = Math.PI / 2;
      rig.pose.position.y = 0.2;
      for (const leg of rig.legs) leg.rotation.z = 0.25;
      rig.neck.rotation.z = rig.neckRest - 0.3;
      break;
    default:
      rig.body.scale.y = 1 + wave(2.2, 0.025);
      rig.tail.rotation.x = wave(3, 0.35);
      rig.neck.rotation.z = rig.neckRest + wave(0.7, 0.08) - (sick ? 0.45 : 0);
  }
}

function showIcon(
  entry: Entry,
  animal: Animal,
  status: AnimalStatus,
  frame: AnimalFrame,
  materialFor: (status: ShownStatus) => SpriteMaterial,
): void {
  const { icon } = entry;
  icon.visible = status !== 'content';
  if (status === 'content') return;
  const material = materialFor(status);
  if (icon.material !== material) icon.material = material;
  const scale = SPECIES[animal.species].displayScale;
  const height = entry.rig?.height ?? 1;
  const lowered = animal.activity === 'sleep' || animal.activity === 'dead';
  icon.position.set(
    entry.root.position.x,
    (lowered ? height * 0.55 : height) * scale + 0.3,
    entry.root.position.z,
  );
  const size = ICON_PX * frame.worldPerPixel;
  icon.scale.set(size, size, 1);
}
