import {
  type BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  type Object3D,
  SphereGeometry,
} from 'three';
import type { VisitorKind } from '../../sim/data/visitors';
import { coloredBox, flatMaterial, merged, paint, type Vec3 } from '../geometry';

// Visiteurs procéduraux (docs/04) : deux gabarits, adulte (grand) et enfant (petit, grosse tête).
// Chaque partie est une géométrie blanche teintée par instance (variantes de couleur), avec son pivot à l'origine :
// la vue des visiteurs les assemble par matrices. Repère : le visiteur regarde vers +x, le sol est en y = 0.

export type VisitorPart = 'legLeft' | 'legRight' | 'torso' | 'armLeft' | 'armRight' | 'head' | 'hair';

export const VISITOR_PARTS: readonly VisitorPart[] = [
  'legLeft',
  'legRight',
  'torso',
  'armLeft',
  'armRight',
  'head',
  'hair',
];

export interface VisitorBody {
  geometries: Record<VisitorPart, BufferGeometry>;
  /** Pivot de chaque partie dans le repère du visiteur. */
  pivots: Record<VisitorPart, Vec3>;
  /** Hauteur du haut de la tête, pour placer la bulle. */
  height: number;
  legLength: number;
}

const WHITE = 0xffffff;
const SHOE = 0x3a3530;
const EYE = 0x2a2622;

interface Proportions {
  legLength: number;
  legWidth: number;
  hipWidth: number;
  torso: Vec3;
  armLength: number;
  headRadius: number;
}

const PROPORTIONS: Record<VisitorKind, Proportions> = {
  adult: {
    legLength: 0.3,
    legWidth: 0.075,
    hipWidth: 0.06,
    torso: [0.15, 0.26, 0.24],
    armLength: 0.24,
    headRadius: 0.095,
  },
  child: {
    legLength: 0.17,
    legWidth: 0.07,
    hipWidth: 0.05,
    torso: [0.13, 0.17, 0.19],
    armLength: 0.16,
    headRadius: 0.1,
  },
};

function leg(p: Proportions): BufferGeometry {
  return merged([
    coloredBox([p.legWidth, p.legLength, p.legWidth], [0, -p.legLength / 2, 0], WHITE),
    coloredBox([p.legWidth * 1.6, 0.04, p.legWidth * 1.1], [p.legWidth * 0.3, -p.legLength + 0.02, 0], SHOE),
  ]);
}

function arm(p: Proportions): BufferGeometry {
  return coloredBox([0.055, p.armLength, 0.055], [0, -p.armLength / 2, 0], WHITE);
}

function head(p: Proportions): BufferGeometry {
  const r = p.headRadius;
  return merged([
    paint(new SphereGeometry(r, 7, 5).translate(0, r, 0), WHITE),
    // Yeux vers l'avant (+x) : on voit où le visiteur regarde.
    coloredBox([0.02, 0.025, 0.02], [r * 0.92, r * 1.1, r * 0.38], EYE),
    coloredBox([0.02, 0.025, 0.02], [r * 0.92, r * 1.1, -r * 0.38], EYE),
  ]);
}

function hair(kind: VisitorKind, p: Proportions): BufferGeometry {
  const r = p.headRadius;
  if (kind === 'child') {
    // Casquette de l'enfant : calotte et visière vers l'avant.
    return merged([
      paint(
        new SphereGeometry(r * 1.06, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, r * 1.15, 0),
        WHITE,
      ),
      coloredBox([r * 1.1, 0.025, r * 1.3], [r * 0.95, r * 1.2, 0], WHITE),
    ]);
  }
  return paint(
    new SphereGeometry(r * 1.08, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2)
      .scale(1, 0.85, 1)
      .translate(-r * 0.12, r * 1.15, 0),
    WHITE,
  );
}

function torso(p: Proportions): BufferGeometry {
  const [w, h, d] = p.torso;
  return paint(
    new CylinderGeometry(d * 0.42, d * 0.5, h, 6).scale(w / d, 1, 1).translate(0, h / 2, 0),
    WHITE,
  );
}

export function createVisitorBody(kind: VisitorKind): VisitorBody {
  const p = PROPORTIONS[kind];
  const [, torsoHeight, torsoDepth] = p.torso;
  const shoulder = p.legLength + torsoHeight * 0.92;
  const neck = p.legLength + torsoHeight;
  return {
    geometries: {
      legLeft: leg(p),
      legRight: leg(p),
      torso: torso(p),
      armLeft: arm(p),
      armRight: arm(p),
      head: head(p),
      hair: hair(kind, p),
    },
    pivots: {
      legLeft: [0, p.legLength, -p.hipWidth],
      legRight: [0, p.legLength, p.hipWidth],
      torso: [0, p.legLength, 0],
      armLeft: [0, shoulder, -(torsoDepth / 2 + 0.03)],
      armRight: [0, shoulder, torsoDepth / 2 + 0.03],
      head: [0, neck, 0],
      hair: [0, neck, 0],
    },
    height: neck + p.headRadius * 2.2,
    legLength: p.legLength,
  };
}

/** Stand de snacks : kiosque rond (lisible sous tous les angles), auvent rayé, enseigne en forme de burger. */
export function snackStandGeometry(): BufferGeometry {
  const red = 0xd2453a;
  const cream = 0xfff1d6;
  const wood = 0x9a6b3f;
  const stripes: BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    stripes.push(
      paint(
        new ConeGeometry(0.5, 0.32, 8, 1, false, (i * Math.PI) / 4, Math.PI / 4).translate(0, 0.98, 0),
        i % 2 === 0 ? red : cream,
      ),
    );
  }
  return merged([
    paint(new CylinderGeometry(0.34, 0.36, 0.42, 8).translate(0, 0.21, 0), wood),
    paint(new CylinderGeometry(0.37, 0.37, 0.05, 8).translate(0, 0.44, 0), cream),
    coloredBox([0.05, 0.38, 0.05], [0.28, 0.63, 0.28], cream),
    coloredBox([0.05, 0.38, 0.05], [-0.28, 0.63, 0.28], cream),
    coloredBox([0.05, 0.38, 0.05], [0.28, 0.63, -0.28], cream),
    coloredBox([0.05, 0.38, 0.05], [-0.28, 0.63, -0.28], cream),
    ...stripes,
    // Enseigne : petit burger au sommet.
    paint(new SphereGeometry(0.11, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.2, 0), 0xe0a040),
    paint(new CylinderGeometry(0.11, 0.11, 0.04, 8).translate(0, 1.18, 0), 0x6b3b1f),
    paint(new CylinderGeometry(0.12, 0.12, 0.02, 8).translate(0, 1.155, 0), 0x5fa04a),
    paint(new CylinderGeometry(0.11, 0.1, 0.04, 8).translate(0, 1.13, 0), 0xe0a040),
  ]);
}

/** Modèle du registre d'assets : un groupe de parties nommées, posées à leur pivot (la vue les instancie). */
export function createVisitorModel(kind: VisitorKind): Object3D {
  const body = createVisitorBody(kind);
  const group = new Group();
  for (const part of VISITOR_PARTS) {
    const mesh = new Mesh(body.geometries[part], flatMaterial);
    mesh.name = part;
    mesh.position.set(...body.pivots[part]);
    group.add(mesh);
  }
  group.userData = { height: body.height, legLength: body.legLength };
  return group;
}

/** Relit un modèle de visiteur du registre. `null` si le modèle n'a pas la structure attendue (asset manquant). */
export function visitorBodyOf(model: Object3D): VisitorBody | null {
  const geometries: Partial<Record<VisitorPart, BufferGeometry>> = {};
  const pivots: Partial<Record<VisitorPart, Vec3>> = {};
  for (const part of VISITOR_PARTS) {
    const mesh = model.getObjectByName(part);
    if (!(mesh instanceof Mesh)) return null;
    geometries[part] = mesh.geometry as BufferGeometry;
    pivots[part] = [mesh.position.x, mesh.position.y, mesh.position.z];
  }
  const { height, legLength } = model.userData as { height?: number; legLength?: number };
  return {
    geometries: geometries as Record<VisitorPart, BufferGeometry>,
    pivots: pivots as Record<VisitorPart, Vec3>,
    height: height ?? 0.8,
    legLength: legLength ?? 0.3,
  };
}
