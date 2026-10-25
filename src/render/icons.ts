import type { SpeciesId } from '../sim/data/species';
import type { AnimalStatus } from '../sim/entities';

// Icônes maison dessinées sur canvas (pas d'emoji système, docs/04) : partagées par le rendu 3D (sprites)
// et par l'interface (images). Chaque état combine une forme, un pictogramme et une couleur.

const SIZE = 96;

type Draw = (ctx: CanvasRenderingContext2D) => void;

export const STATUS_COLORS: Record<Exclude<AnimalStatus, 'content'>, string> = {
  hungry: '#c8661a',
  thirsty: '#1f6fb2',
  unhappy: '#7a4fb5',
  sick: '#c62f3a',
  sleeping: '#34477e',
  dead: '#4a4744',
};

const INK = '#2d2a24';
const LIGHT = '#fff6e5';

function outlined(ctx: CanvasRenderingContext2D, fill: string, shape: () => void): void {
  ctx.beginPath();
  shape();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = LIGHT;
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function polygon(ctx: CanvasRenderingContext2D, points: [number, number][]): void {
  for (const [i, [x, y]] of points.entries()) {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function glyphStyle(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = LIGHT;
  ctx.strokeStyle = LIGHT;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

const STATUS_DRAW: Record<Exclude<AnimalStatus, 'content'>, Draw> = {
  // Faim : disque, cuisse de viande.
  hungry: (ctx) => {
    outlined(ctx, STATUS_COLORS.hungry, () => ctx.arc(48, 48, 40, 0, Math.PI * 2));
    glyphStyle(ctx);
    ctx.beginPath();
    ctx.ellipse(56, 40, 17, 13, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(48, 50);
    ctx.lineTo(30, 68);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(26, 67, 5, 0, Math.PI * 2);
    ctx.arc(31, 73, 5, 0, Math.PI * 2);
    ctx.fill();
  },
  // Soif : goutte, vague.
  thirsty: (ctx) => {
    outlined(ctx, STATUS_COLORS.thirsty, () => {
      ctx.moveTo(48, 6);
      ctx.bezierCurveTo(60, 28, 82, 46, 82, 62);
      ctx.arc(48, 62, 34, 0, Math.PI, false);
      ctx.bezierCurveTo(14, 46, 36, 28, 48, 6);
    });
    glyphStyle(ctx);
    ctx.beginPath();
    ctx.moveTo(30, 66);
    ctx.quadraticCurveTo(39, 58, 48, 66);
    ctx.quadraticCurveTo(57, 74, 66, 66);
    ctx.stroke();
  },
  // Mal-être : carré arrondi, visage triste.
  unhappy: (ctx) => {
    outlined(ctx, STATUS_COLORS.unhappy, () => ctx.roundRect(10, 10, 76, 76, 16));
    glyphStyle(ctx);
    ctx.beginPath();
    ctx.arc(36, 40, 5, 0, Math.PI * 2);
    ctx.arc(60, 40, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(48, 74, 15, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  },
  // Malade : losange, croix.
  sick: (ctx) => {
    outlined(ctx, STATUS_COLORS.sick, () =>
      polygon(ctx, [
        [48, 4],
        [92, 48],
        [48, 92],
        [4, 48],
      ]),
    );
    glyphStyle(ctx);
    ctx.fillRect(41, 26, 14, 44);
    ctx.fillRect(26, 41, 44, 14);
  },
  // Dort : nuage arrondi, « Z ».
  sleeping: (ctx) => {
    outlined(ctx, STATUS_COLORS.sleeping, () => ctx.roundRect(6, 20, 84, 56, 28));
    glyphStyle(ctx);
    ctx.lineWidth = 6;
    ctx.beginPath();
    polygon(ctx, [
      [28, 36],
      [50, 36],
      [28, 62],
      [50, 62],
    ]);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(58, 44);
    ctx.lineTo(70, 44);
    ctx.lineTo(58, 58);
    ctx.lineTo(70, 58);
    ctx.stroke();
  },
  // Mort : pierre tombale, yeux en croix.
  dead: (ctx) => {
    outlined(ctx, STATUS_COLORS.dead, () => {
      ctx.moveTo(16, 90);
      ctx.lineTo(16, 42);
      ctx.arc(48, 42, 32, Math.PI, 0);
      ctx.lineTo(80, 90);
      ctx.closePath();
    });
    glyphStyle(ctx);
    ctx.lineWidth = 6;
    for (const cx of [36, 60]) {
      ctx.beginPath();
      ctx.moveTo(cx - 7, 40);
      ctx.lineTo(cx + 7, 54);
      ctx.moveTo(cx + 7, 40);
      ctx.lineTo(cx - 7, 54);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(34, 72);
    ctx.lineTo(62, 72);
    ctx.stroke();
  },
};

const SPECIES_DRAW: Record<SpeciesId, Draw> = {
  // Zèbre : tête longue blanche, rayures noires, museau noir, oreilles pointues.
  zebra: (ctx) => {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(48, 52, 20, 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f7f4ee';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#23211d';
    for (const y of [22, 36, 50]) ctx.fillRect(20, y, 56, 7);
    ctx.fillRect(20, 68, 56, 20);
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.ellipse(48, 52, 20, 34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f7f4ee';
    for (const dx of [-1, 1]) {
      ctx.beginPath();
      polygon(ctx, [
        [48 + dx * 10, 24],
        [48 + dx * 22, 2],
        [48 + dx * 22, 26],
      ]);
      ctx.fill();
      ctx.stroke();
    }
  },
  // Girafe : tête orange tachetée, deux ossicônes à bout sombre.
  giraffe: (ctx) => {
    ctx.fillStyle = '#e2a845';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    for (const dx of [-9, 9]) {
      ctx.fillRect(48 + dx - 3, 8, 6, 22);
      ctx.beginPath();
      ctx.arc(48 + dx, 8, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#4a3420';
      ctx.fill();
      ctx.fillStyle = '#e2a845';
    }
    ctx.beginPath();
    ctx.ellipse(48, 56, 19, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9a5a26';
    for (const [x, y] of [
      [40, 40],
      [56, 46],
      [44, 58],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(18, 36, 12, 5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(78, 36, 12, 5, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#e2a845';
    ctx.fill();
    ctx.stroke();
  },
  // Lion : grande crinière en étoile, face fauve, nez sombre.
  lion: (ctx) => {
    const points: [number, number][] = [];
    for (let i = 0; i < 28; i++) {
      const r = i % 2 ? 34 : 44;
      const a = (i / 28) * Math.PI * 2;
      points.push([48 + Math.cos(a) * r, 48 + Math.sin(a) * r]);
    }
    outlined(ctx, '#7a3e1b', () => polygon(ctx, points));
    ctx.beginPath();
    ctx.arc(48, 50, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#d9a056';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    polygon(ctx, [
      [41, 56],
      [55, 56],
      [48, 64],
    ]);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(40, 44, 3, 0, Math.PI * 2);
    ctx.arc(56, 44, 3, 0, Math.PI * 2);
    ctx.fill();
  },
  // Panda : tête ronde blanche, oreilles et taches des yeux noires.
  panda: (ctx) => {
    ctx.fillStyle = '#23211d';
    ctx.beginPath();
    ctx.arc(24, 24, 13, 0, Math.PI * 2);
    ctx.arc(72, 24, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(48, 52, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#f7f4ee';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = '#23211d';
    ctx.beginPath();
    ctx.ellipse(35, 48, 8, 11, 0.5, 0, Math.PI * 2);
    ctx.ellipse(61, 48, 8, 11, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(48, 66, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  },
};

const cache = new Map<string, HTMLCanvasElement>();

function cached(key: string, draw: Draw): HTMLCanvasElement {
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Contexte 2D indisponible');
    draw(ctx);
    cache.set(key, canvas);
  }
  return canvas;
}

export function statusIcon(status: Exclude<AnimalStatus, 'content'>): HTMLCanvasElement {
  return cached(`status.${status}`, STATUS_DRAW[status]);
}

export function speciesIcon(species: SpeciesId): HTMLCanvasElement {
  return cached(`species.${species}`, SPECIES_DRAW[species]);
}
