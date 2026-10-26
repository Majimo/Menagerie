import type { SpeciesId } from '../sim/data/species';
import { cached, type Draw, INK } from './icons';

// Icônes des espèces : une silhouette caractéristique par animal, reconnaissable en petit (26 px) et sans
// la couleur (achromatopsie) : profil de cheval à crinière dressée, long cou, crinière ronde, tête ronde à taches.

const OUTLINE = 3.5;
const WHITE = '#f7f4ee';
const BLACK = '#23211d';

function stroke(ctx: CanvasRenderingContext2D, width = OUTLINE): void {
  ctx.lineWidth = width;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Œil : pupille sombre et reflet clair, lisible même posé sur une rayure ou une tache. */
function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  disc(ctx, x, y, r, BLACK);
  disc(ctx, x - r * 0.35, y - r * 0.35, r * 0.4, WHITE);
}

/** Tête et cou du zèbre de profil, museau à gauche. */
function zebraHead(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(50, 16);
  ctx.quadraticCurveTo(32, 18, 24, 34);
  ctx.lineTo(12, 58);
  ctx.quadraticCurveTo(7, 72, 19, 75);
  ctx.quadraticCurveTo(29, 77, 35, 68);
  ctx.quadraticCurveTo(46, 58, 54, 62);
  ctx.quadraticCurveTo(57, 80, 56, 94);
  ctx.lineTo(88, 94);
  ctx.quadraticCurveTo(82, 50, 50, 16);
  ctx.closePath();
}

/** Tête et cou de la girafe de profil, museau à gauche. */
function giraffeHead(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(40, 17);
  ctx.quadraticCurveTo(22, 17, 13, 26);
  ctx.quadraticCurveTo(4, 32, 8, 40);
  ctx.quadraticCurveTo(13, 48, 29, 46);
  ctx.quadraticCurveTo(40, 45, 46, 52);
  ctx.lineTo(60, 94);
  ctx.lineTo(86, 94);
  ctx.lineTo(59, 27);
  ctx.quadraticCurveTo(53, 17, 40, 17);
  ctx.closePath();
}

export const SPECIES_DRAW: Record<SpeciesId, Draw> = {
  // Zèbre : profil de cheval, crinière dressée, rayures noires, museau noir.
  zebra: (ctx) => {
    // Crinière en brosse le long de l'encolure, derrière la tête.
    ctx.beginPath();
    const mane = 12;
    for (let i = 0; i <= mane; i++) {
      const t = i / mane;
      // Point sur la courbe de l'encolure (88, 94) → (82, 50) → (50, 16), décalé vers l'extérieur.
      const x = (1 - t) ** 2 * 88 + 2 * (1 - t) * t * 82 + t ** 2 * 50;
      const y = (1 - t) ** 2 * 94 + 2 * (1 - t) * t * 50 + t ** 2 * 16;
      const offset = i % 2 ? 6 : 11;
      const point: [number, number] = [x + offset * 0.75, y - offset * 0.65];
      if (i === 0) ctx.moveTo(...point);
      else ctx.lineTo(...point);
    }
    ctx.lineTo(50, 16);
    ctx.lineTo(88, 94);
    ctx.closePath();
    ctx.fillStyle = BLACK;
    ctx.fill();
    stroke(ctx);
    // Oreille pointue dressée.
    ctx.beginPath();
    ctx.moveTo(38, 21);
    ctx.lineTo(46, 1);
    ctx.lineTo(54, 19);
    ctx.closePath();
    ctx.fillStyle = WHITE;
    ctx.fill();
    stroke(ctx);
    ctx.save();
    zebraHead(ctx);
    ctx.fillStyle = WHITE;
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'butt';
    for (const y of [28, 41, 54, 67, 80, 93]) {
      ctx.beginPath();
      ctx.moveTo(0, y + 10);
      ctx.lineTo(96, y - 14);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(17, 66, 13, 12, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = BLACK;
    ctx.fill();
    ctx.restore();
    zebraHead(ctx);
    stroke(ctx);
    disc(ctx, 33, 37, 5, WHITE);
    eye(ctx, 33, 37, 3);
    disc(ctx, 13, 63, 2.2, WHITE);
  },
  // Girafe : profil sur un long cou, ossicônes à bout sombre, taches réticulées.
  giraffe: (ctx) => {
    const coat = '#e9b453';
    const patch = '#9a5424';
    // Ossicônes.
    ctx.fillStyle = coat;
    for (const [baseX, baseY, tipX, tipY] of [
      [33, 19, 30, 6],
      [43, 18, 45, 5],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.lineWidth = 5 + OUTLINE * 2;
      ctx.strokeStyle = INK;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = coat;
      ctx.stroke();
      disc(ctx, tipX, tipY, 5.5, INK);
      disc(ctx, tipX, tipY, 3.8, '#4a3420');
    }
    // Crinière courte le long de la nuque.
    ctx.beginPath();
    ctx.moveTo(60, 28);
    ctx.lineTo(88, 94);
    ctx.lineWidth = 7;
    ctx.strokeStyle = patch;
    ctx.stroke();
    // Oreille vers l'arrière.
    ctx.beginPath();
    ctx.ellipse(61, 22, 10, 4.5, -0.45, 0, Math.PI * 2);
    ctx.fillStyle = coat;
    ctx.fill();
    stroke(ctx);
    ctx.save();
    giraffeHead(ctx);
    ctx.fillStyle = coat;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = patch;
    for (const [x, y, rx, ry] of [
      [52, 58, 6, 6],
      [64, 62, 5, 7],
      [55, 74, 6, 6],
      [68, 78, 6, 6],
      [80, 82, 5, 6],
      [60, 89, 6, 5],
      [74, 94, 6, 4],
      [40, 26, 4, 3.5],
      [48, 34, 3.5, 4],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    giraffeHead(ctx);
    stroke(ctx);
    eye(ctx, 28, 29, 3.4);
    disc(ctx, 10, 34, 1.8, INK);
  },
  // Lion : grosse crinière ronde en festons, face fauve, museau clair, nez sombre.
  lion: (ctx) => {
    const mane = '#9b4f1c';
    const face = '#e2ad5f';
    const tufts: [number, number, number][] = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      tufts.push([48 + Math.cos(a) * 34, 50 + Math.sin(a) * 34, 11]);
    }
    tufts.push([48, 50, 34]);
    // Contour d'abord, puis remplissage par-dessus : seul le bord extérieur de l'union reste tracé.
    for (const [x, y, r] of tufts) disc(ctx, x, y, r + OUTLINE / 2 + 0.5, INK);
    for (const [x, y, r] of tufts) disc(ctx, x, y, r, mane);
    // Oreilles rondes.
    for (const x of [29, 67]) {
      ctx.beginPath();
      ctx.arc(x, 30, 8, 0, Math.PI * 2);
      ctx.fillStyle = face;
      ctx.fill();
      stroke(ctx, 3);
      disc(ctx, x, 30, 3.5, '#8a5a2a');
    }
    ctx.beginPath();
    ctx.ellipse(48, 54, 22, 24, 0, 0, Math.PI * 2);
    ctx.fillStyle = face;
    ctx.fill();
    stroke(ctx, 3);
    // Museau clair en deux lobes.
    disc(ctx, 42, 66, 8, '#f6e3bd');
    disc(ctx, 54, 66, 8, '#f6e3bd');
    ctx.beginPath();
    ctx.moveTo(40, 57);
    ctx.lineTo(56, 57);
    ctx.lineTo(48, 65);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(48, 65);
    ctx.lineTo(48, 70);
    ctx.moveTo(41, 70);
    ctx.quadraticCurveTo(44, 74, 48, 70);
    ctx.quadraticCurveTo(52, 74, 55, 70);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    eye(ctx, 39, 47, 3.4);
    eye(ctx, 57, 47, 3.4);
  },
  // Panda : tête ronde blanche, oreilles noires, taches en goutte autour des yeux, museau noir.
  panda: (ctx) => {
    for (const x of [23, 73]) {
      ctx.beginPath();
      ctx.arc(x, 25, 13, 0, Math.PI * 2);
      ctx.fillStyle = BLACK;
      ctx.fill();
      stroke(ctx, 3);
    }
    ctx.beginPath();
    ctx.ellipse(48, 54, 38, 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = WHITE;
    ctx.fill();
    stroke(ctx);
    ctx.fillStyle = BLACK;
    ctx.beginPath();
    ctx.ellipse(33, 52, 9.5, 13, 0.7, 0, Math.PI * 2);
    ctx.ellipse(63, 52, 9.5, 13, -0.7, 0, Math.PI * 2);
    ctx.fill();
    disc(ctx, 35, 48, 3.6, WHITE);
    disc(ctx, 61, 48, 3.6, WHITE);
    disc(ctx, 35, 48, 1.8, BLACK);
    disc(ctx, 61, 48, 1.8, BLACK);
    ctx.beginPath();
    ctx.ellipse(48, 67, 7.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = BLACK;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(48, 71);
    ctx.lineTo(48, 75);
    ctx.moveTo(42, 77);
    ctx.quadraticCurveTo(45, 79, 48, 75);
    ctx.quadraticCurveTo(51, 79, 54, 77);
    stroke(ctx, 2.5);
  },
};

export function speciesIcon(species: SpeciesId): HTMLCanvasElement {
  return cached(`species.${species}`, SPECIES_DRAW[species]);
}
