import {
  CanvasTexture,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { Enclosure, World } from '../../sim/state';
import type { Edge, TileCoord } from '../../sim/world/grid';

// Aperçu de placement et surlignage d'enclos.
// Valide / invalide ne repose jamais sur la couleur seule : ✓ sur fond plein, ✗ sur fond hachuré à bord pointillé.

export interface PreviewTarget<T> {
  at: T;
  valid: boolean;
}

/** Ce que l'outil actif veut montrer : calculé par l'UI, lu par le rendu. */
export interface Preview {
  tiles: PreviewTarget<TileCoord>[];
  edges: PreviewTarget<Edge>[];
  /** Enclos survolé, surligné pour visualiser sa surface. */
  enclosureId: number;
}

export const EMPTY_PREVIEW: Preview = { tiles: [], edges: [], enclosureId: 0 };

const LIFT = 0.06;
const EDGE_WIDTH = 0.4;
const VALID = '#3e8e5a';
const INVALID = '#c8402b';

export interface PreviewView {
  readonly group: Group;
  /** `quarterTurns` : rotation de la caméra, pour garder les symboles droits à l'écran. */
  update(
    world: Readonly<World>,
    enclosures: Readonly<Record<number, Enclosure>>,
    preview: Preview,
    quarterTurns: number,
  ): void;
}

interface Layers {
  valid: InstancedMesh;
  invalid: InstancedMesh;
}

export function createPreviewView(world: Readonly<World>): PreviewView {
  const group = new Group();
  const tileCapacity = world.width * world.height;
  const edgeCapacity = world.fencesH.length + world.fencesV.length;
  const plane = (w: number, d: number) => new PlaneGeometry(w, d).rotateX(-Math.PI / 2);

  const tileLayers = layers(plane(0.96, 0.96), 1, tileCapacity);
  // Bande d'arête le long de x (« h ») ou de z (« v ») ; la texture suit la forme pour ne pas déformer le symbole.
  const edgeLayersH = layers(plane(1, EDGE_WIDTH), 1 / EDGE_WIDTH, edgeCapacity);
  const edgeLayersV = layers(plane(EDGE_WIDTH, 1), EDGE_WIDTH, edgeCapacity);
  const enclosure = new InstancedMesh(
    plane(1, 1),
    new MeshBasicMaterial({ color: 0xfff6e5, transparent: true, opacity: 0.35, depthWrite: false }),
    tileCapacity,
  );
  enclosure.renderOrder = 2;
  const all = [enclosure, ...[tileLayers, edgeLayersH, edgeLayersV].flatMap((l) => [l.valid, l.invalid])];
  for (const mesh of all) {
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    group.add(mesh);
  }

  const matrix = new Matrix4();
  const position = new Vector3();
  const rotation = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const unit = new Vector3(1, 1, 1);
  const counts = new Map<InstancedMesh, number>();
  const put = (mesh: InstancedMesh) => {
    const index = counts.get(mesh) ?? 0;
    mesh.setMatrixAt(index, matrix);
    counts.set(mesh, index + 1);
  };

  return {
    group,
    update(current, enclosures, preview, quarterTurns) {
      counts.clear();
      rotation.identity();
      for (const index of enclosures[preview.enclosureId]?.tiles ?? []) {
        const x = index % current.width;
        position.set(x + 0.5, LIFT * 0.5, (index - x) / current.width + 0.5);
        matrix.compose(position, rotation, unit);
        put(enclosure);
      }

      // La caméra a tourné de n quarts de tour : les quads tournent d'autant, le symbole reste droit à l'écran.
      rotation.setFromAxisAngle(up, (quarterTurns * Math.PI) / 2);
      const odd = Math.abs(quarterTurns) % 2 === 1;
      for (const { at, valid } of preview.tiles) {
        position.set(at.x + 0.5, LIFT, at.y + 0.5);
        matrix.compose(position, rotation, unit);
        put(valid ? tileLayers.valid : tileLayers.invalid);
      }
      for (const { at, valid } of preview.edges) {
        if (at.axis === 'h') position.set(at.x + 0.5, LIFT * 1.2, at.y);
        else position.set(at.x, LIFT * 1.2, at.y + 0.5);
        matrix.compose(position, rotation, unit);
        // Un quart de tour échange les formes : une bande « v » tournée couvre une arête « h », et inversement.
        const target = (at.axis === 'h') !== odd ? edgeLayersH : edgeLayersV;
        put(valid ? target.valid : target.invalid);
      }

      for (const mesh of all) {
        mesh.count = counts.get(mesh) ?? 0;
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

function layers(geometry: PlaneGeometry, aspect: number, capacity: number): Layers {
  const make = (valid: boolean) => {
    const mesh = new InstancedMesh(
      geometry,
      // Dessiné par-dessus tout (clôtures comprises) : une clôture en double reste visible.
      new MeshBasicMaterial({
        map: symbolTexture(valid, aspect),
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
      capacity,
    );
    mesh.renderOrder = 5;
    return mesh;
  };
  return { valid: make(true), invalid: make(false) };
}

/** Texture d'aperçu : `aspect` = largeur / hauteur de la surface couverte. */
function symbolTexture(valid: boolean, aspect: number): CanvasTexture {
  const base = 64;
  const width = Math.round(aspect >= 1 ? base * aspect : base);
  const height = Math.round(aspect >= 1 ? base : base / aspect);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexte 2D indisponible');
  const color = valid ? VALID : INVALID;

  ctx.globalAlpha = 0.45;
  ctx.fillStyle = color;
  if (valid) {
    ctx.fillRect(0, 0, width, height);
  } else {
    // Hachures diagonales : l'invalide se reconnaît au motif, même sans percevoir le rouge.
    ctx.lineWidth = 7;
    ctx.strokeStyle = color;
    for (let x = -height; x < width + height; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + height, 0);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.setLineDash(valid ? [] : [10, 7]);
  ctx.strokeRect(3, 3, width - 6, height - 6);
  ctx.setLineDash([]);

  // Symbole central blanc cerné de foncé : lisible sur tous les sols.
  // La vue isométrique fait apparaître le sol tourné de 45° : on dessine le symbole contre-tourné d'autant.
  const r = Math.min(width, height) * 0.3;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);
  const cx = 0;
  const cy = 0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (valid) {
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx - r * 0.25, cy + r * 0.8);
    ctx.lineTo(cx + r, cy - r * 0.8);
  } else {
    ctx.moveTo(cx - r, cy - r);
    ctx.lineTo(cx + r, cy + r);
    ctx.moveTo(cx + r, cy - r);
    ctx.lineTo(cx - r, cy + r);
  }
  ctx.strokeStyle = '#2d2a24';
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;
  ctx.stroke();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
