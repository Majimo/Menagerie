import {
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { balance } from '../../sim/data/balance';
import { VISITOR_KINDS, VISITOR_KINDS_LIST, type VisitorKind } from '../../sim/data/visitors';
import { activeReaction, visitorMood } from '../../sim/entities';
import type { Visitor, VisitorId } from '../../sim/state';
import { getModel } from '../assets';
import { flatMaterial } from '../geometry';
import { moodIcon, type ShownMood } from '../icons';
import {
  createVisitorBody,
  VISITOR_PARTS,
  type VisitorBody,
  type VisitorPart,
  visitorBodyOf,
} from '../models/visitors';

// Visiteurs : un `InstancedMesh` par partie du corps et par gabarit (adulte, enfant), teinté par instance.
// Position interpolée, décalage latéral propre à chaque visiteur (la foule ne marche pas en file indienne),
// poses `walk`, `idle`, `watch`, bulles d'humeur et éclats de joie.

/** Taille affichée d'une bulle d'humeur, en pixels CSS. */
const BUBBLE_PX = 30;
/** Au-delà de ce zoom (unités monde par pixel), on n'affiche que les bulles utiles (problèmes et joie). */
const FAR_ZOOM = 0.07;
/** Décalage latéral maximal par rapport à l'axe du chemin, en tuiles. */
const LANE = 0.3;
/** Les visiteurs qui observent avancent vers la clôture. */
const VIEW_FORWARD = 0.24;
/** Les chemins sont légèrement surélevés (terrain.ts). */
const PATH_TOP = 0.04;

const TOPS: Record<VisitorKind, number[]> = {
  adult: [0x3f6fb5, 0xc0504d, 0x6a9f4b, 0xe0b040, 0x8a5fb0, 0xeeeae0, 0x2f4f6f, 0xd98a3a],
  child: [0xff5a5a, 0x2fb7ff, 0xffd23f, 0x5fd35f, 0xff7fd0, 0xff9a2f],
};
const BOTTOMS: Record<VisitorKind, number[]> = {
  adult: [0x3b4a6b, 0x4a4040, 0x8b7355, 0x2d2d33, 0x6b6f78, 0x556b4a],
  child: [0x3b4a6b, 0xd94f8a, 0x2a7fbf, 0x5a4a3a, 0x7a3fb0],
};
const SKINS = [0xf1c7a0, 0xd9a07a, 0xa86f4a, 0x7a4e30, 0xf6d6bd];
/** Cheveux de l'adulte, casquette de l'enfant. */
const HEADWEAR: Record<VisitorKind, number[]> = {
  adult: [0x2b2018, 0x6b4428, 0xc89a4f, 0x8a3b1f, 0x1a1a1a, 0xb8b3a8],
  child: [0xff3b3b, 0x1f8fff, 0xffc21f, 0x2fbf5f, 0xffffff],
};

/** Hachage entier simple : variantes et décalages stables par visiteur. */
function hash(id: number, salt: number): number {
  let h = Math.imul(id ^ (salt * 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

function pick<T>(list: readonly T[], visitor: Readonly<Visitor>, salt: number): T {
  return list[(hash(visitor.id, salt) + visitor.variant) % list.length] as T;
}

interface KindMeshes {
  body: VisitorBody;
  parts: Record<VisitorPart, InstancedMesh>;
  capacity: number;
}

interface Smooth {
  heading: number;
  phase: number;
  lastX: number;
  lastZ: number;
}

export interface VisitorFrame {
  visitors: Readonly<Record<VisitorId, Visitor>>;
  tick: number;
  alpha: number;
  now: number;
  deltaMs: number;
  worldPerPixel: number;
  animate: boolean;
  selected: VisitorId | null;
}

export interface VisitorView {
  readonly group: Group;
  update(frame: VisitorFrame): void;
}

/** Position affichée d'un visiteur (avec son décalage latéral), pour la sélection et l'inspection. */
export function visitorDisplayPosition(
  visitor: Readonly<Visitor>,
  heading: number,
  alpha: number,
): { x: number; z: number } {
  const x = visitor.prevX + (visitor.x - visitor.prevX) * alpha;
  const z = visitor.prevY + (visitor.y - visitor.prevY) * alpha;
  const lane = ((hash(visitor.id, 7) % 1000) / 1000 - 0.5) * 2 * LANE;
  const forward = visitor.state === 'viewing' ? VIEW_FORWARD : 0;
  return {
    x: x - Math.sin(heading) * lane + Math.cos(heading) * forward,
    z: z + Math.cos(heading) * lane + Math.sin(heading) * forward,
  };
}

export function createVisitorView(): VisitorView {
  const group = new Group();
  const kinds = new Map<VisitorKind, KindMeshes>();
  const smooth = new Map<VisitorId, Smooth>();
  const bubbles: Sprite[] = [];
  const particles: Sprite[] = [];
  const materials = new Map<ShownMood, SpriteMaterial>();
  const ring = new Mesh(
    new RingGeometry(0.22, 0.3, 20).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xfff6e5, depthTest: false, transparent: true, opacity: 0.95 }),
  );
  ring.renderOrder = 5;
  group.add(ring);

  const materialFor = (mood: ShownMood): SpriteMaterial => {
    let material = materials.get(mood);
    if (!material) {
      const texture = new CanvasTexture(moodIcon(mood));
      texture.colorSpace = SRGBColorSpace;
      material = new SpriteMaterial({ map: texture, depthTest: false, transparent: true });
      materials.set(mood, material);
    }
    return material;
  };

  const sprite = (pool: Sprite[], index: number, order: number): Sprite => {
    let s = pool[index];
    if (!s) {
      s = new Sprite();
      s.renderOrder = order;
      pool.push(s);
      group.add(s);
    }
    s.visible = true;
    return s;
  };

  const meshesFor = (kind: VisitorKind, needed: number): KindMeshes => {
    const existing = kinds.get(kind);
    if (existing && existing.capacity >= needed) return existing;
    // Modèle absent ou mal formé : corps procédural (le jeu reste jouable sans asset).
    const body =
      existing?.body ?? visitorBodyOf(getModel(VISITOR_KINDS[kind].modelId)) ?? createVisitorBody(kind);
    const capacity = Math.max(64, 2 ** Math.ceil(Math.log2(needed)));
    for (const mesh of Object.values(existing?.parts ?? {})) {
      group.remove(mesh);
      mesh.dispose();
    }
    const parts = {} as Record<VisitorPart, InstancedMesh>;
    for (const part of VISITOR_PARTS) {
      const mesh = new InstancedMesh(body.geometries[part], flatMaterial, capacity);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.setColorAt(0, new Color(0xffffff));
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      parts[part] = mesh;
      group.add(mesh);
    }
    const meshes = { body, parts, capacity };
    kinds.set(kind, meshes);
    return meshes;
  };

  const root = new Matrix4();
  const local = new Matrix4();
  const out = new Matrix4();
  const quaternion = new Quaternion();
  const position = new Vector3();
  const unit = new Vector3(1, 1, 1);
  const up = new Vector3(0, 1, 0);
  const color = new Color();

  return {
    group,
    update(frame) {
      const list = Object.values(frame.visitors);
      for (const id of smooth.keys()) if (!frame.visitors[id]) smooth.delete(id);
      const byKind = new Map<VisitorKind, Visitor[]>(VISITOR_KINDS_LIST.map((k) => [k, []]));
      for (const visitor of list) byKind.get(visitor.kind)?.push(visitor);

      let bubbleCount = 0;
      let particleCount = 0;
      ring.visible = false;
      const far = frame.worldPerPixel > FAR_ZOOM;

      for (const [kind, visitors] of byKind) {
        if (visitors.length === 0 && !kinds.has(kind)) continue;
        const meshes = meshesFor(kind, visitors.length);
        const { body, parts } = meshes;
        visitors.forEach((visitor, i) => {
          let s = smooth.get(visitor.id);
          if (!s) {
            s = { heading: visitor.heading, phase: visitor.id, lastX: visitor.x, lastZ: visitor.y };
            smooth.set(visitor.id, s);
          }
          if (!frame.animate) s.heading = visitor.heading;
          else {
            const diff = Math.atan2(
              Math.sin(visitor.heading - s.heading),
              Math.cos(visitor.heading - s.heading),
            );
            s.heading += diff * Math.min(1, frame.deltaMs / 150);
          }
          const { x, z } = visitorDisplayPosition(visitor, s.heading, frame.alpha);
          const moved = Math.hypot(x - s.lastX, z - s.lastZ);
          s.phase += (moved / (body.legLength * 1.1)) * Math.PI;
          s.lastX = x;
          s.lastZ = z;

          const joy = activeReaction(visitor, frame.tick) === 'joy';
          const hop =
            frame.animate && joy && visitor.kind === 'child' ? Math.abs(Math.sin(frame.now / 110)) * 0.08 : 0;
          position.set(x, PATH_TOP + hop, z);
          quaternion.setFromAxisAngle(up, -s.heading);
          root.compose(position, quaternion, unit);
          const angles = poseAngles(visitor, s.phase, frame, joy);
          for (const part of VISITOR_PARTS) {
            const [px, py, pz] = body.pivots[part];
            local.makeRotationZ(angles[part]).setPosition(px, py, pz);
            out.multiplyMatrices(root, local);
            parts[part].setMatrixAt(i, out);
          }
          parts.legLeft.setColorAt(i, color.setHex(pick(BOTTOMS[kind], visitor, 1)));
          parts.legRight.setColorAt(i, color);
          parts.torso.setColorAt(i, color.setHex(pick(TOPS[kind], visitor, 2)));
          parts.armLeft.setColorAt(i, color);
          parts.armRight.setColorAt(i, color);
          parts.head.setColorAt(i, color.setHex(pick(SKINS, visitor, 3)));
          parts.hair.setColorAt(i, color.setHex(pick(HEADWEAR[kind], visitor, 4)));

          if (frame.selected === visitor.id) {
            ring.visible = true;
            ring.position.set(x, PATH_TOP + 0.01, z);
          }
          const mood = shownMood(visitor, frame.tick, far);
          if (mood) {
            const bubble = sprite(bubbles, bubbleCount++, 12);
            const material = materialFor(mood);
            if (bubble.material !== material) bubble.material = material;
            const size = BUBBLE_PX * frame.worldPerPixel;
            bubble.scale.set(size, size, 1);
            bubble.position.set(x, body.height + hop + 0.12 + size / 2, z);
          }
          if (joy && frame.animate) {
            const age = (frame.tick - visitor.reactionTick + frame.alpha) / balance.visitors.reactionTicks;
            for (let k = 0; k < 3; k++) {
              const t = (age + k / 3) % 1;
              const particle = sprite(particles, particleCount++, 11);
              const material = materialFor(k === 1 ? 'happy' : 'joy');
              if (particle.material !== material) particle.material = material;
              const size = 14 * frame.worldPerPixel * (1 - t * 0.6);
              particle.scale.set(size, size, 1);
              particle.position.set(
                x + Math.sin(k * 2.1 + t * 3) * 0.15,
                body.height * 0.8 + t * 0.6,
                z + Math.cos(k * 2.1) * 0.15,
              );
            }
          }
        });
        for (const part of VISITOR_PARTS) {
          const mesh = parts[part];
          mesh.count = visitors.length;
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      }
      for (let i = bubbleCount; i < bubbles.length; i++) (bubbles[i] as Sprite).visible = false;
      for (let i = particleCount; i < particles.length; i++) (particles[i] as Sprite).visible = false;
    },
  };
}

/** Bulle à afficher : problèmes et réactions toujours, « amusé » seulement devant un enclos et de près. */
function shownMood(visitor: Readonly<Visitor>, tick: number, far: boolean): ShownMood | null {
  const mood = visitorMood(visitor, tick);
  if (mood === 'neutral') return null;
  if (mood === 'happy') return !far && visitor.state === 'viewing' ? 'happy' : null;
  return mood;
}

/** Angles (rotation autour de l'axe latéral) de chaque partie selon ce que fait le visiteur. */
function poseAngles(
  visitor: Readonly<Visitor>,
  phase: number,
  frame: Readonly<VisitorFrame>,
  joy: boolean,
): Record<VisitorPart, number> {
  const angles: Record<VisitorPart, number> = {
    legLeft: 0,
    legRight: 0,
    torso: 0,
    armLeft: 0,
    armRight: 0,
    head: 0,
    hair: 0,
  };
  const t = frame.animate ? frame.now / 1000 + visitor.id * 0.71 : 0;
  const wave = (speed: number, amplitude: number) => (frame.animate ? Math.sin(t * speed) * amplitude : 0);
  const walking =
    visitor.pathStatus === 'ready' &&
    (visitor.state === 'walkingToView' || visitor.state === 'walkingToFood' || visitor.state === 'leaving');
  switch (true) {
    case walking: {
      const p = frame.animate ? phase : 1.2;
      const swing = Math.sin(p) * 0.6;
      angles.legLeft = swing;
      angles.legRight = -swing;
      angles.armLeft = -swing * 0.8;
      angles.armRight = swing * 0.8;
      break;
    }
    case visitor.state === 'viewing': {
      // Observer : montrer du doigt, mains sur la clôture ou appareil photo, selon le visiteur.
      const style = visitor.id % 3;
      if (style === 0 || joy) {
        angles.armRight = 1.45 + wave(4, 0.12);
        angles.armLeft = joy ? 1.45 + wave(4.4, 0.12) : 0.1;
      } else if (style === 1) {
        angles.armLeft = 1.0;
        angles.armRight = 1.0;
      } else {
        angles.armLeft = 2.2;
        angles.armRight = 2.2;
        angles.head = 0.1;
      }
      angles.head += wave(0.9, 0.08);
      angles.hair = angles.head;
      break;
    }
    case visitor.state === 'eating':
      angles.armRight = 2.5 + wave(6, 0.15);
      break;
    default:
      angles.armLeft = wave(1.3, 0.06);
      angles.armRight = -wave(1.3, 0.06);
      angles.head = wave(0.6, 0.1);
      angles.hair = angles.head;
  }
  return angles;
}
