import type { SpeciesId } from '../sim/data/species';
import type { AnimalStatus, VisitorMood } from '../sim/entities';

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

/** Tracé ouvert : comme `polygon`, sans le segment de fermeture. */
function polyline(ctx: CanvasRenderingContext2D, points: [number, number][]): void {
  for (const [i, [x, y]] of points.entries()) {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

/** « Z » ouvert dans le rectangle (x, y, w, h). */
function zed(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  polyline(ctx, [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ]);
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
  // Dort : nuage arrondi, « Zzz » de taille décroissante qui monte vers la droite.
  sleeping: (ctx) => {
    outlined(ctx, STATUS_COLORS.sleeping, () => ctx.roundRect(6, 20, 84, 56, 28));
    glyphStyle(ctx);
    for (const [x, y, w, h, line] of [
      [16, 40, 22, 26, 6],
      [45, 36, 15, 18, 5],
      [66, 31, 10, 12, 4.5],
    ] as const) {
      ctx.lineWidth = line;
      ctx.beginPath();
      zed(ctx, x, y, w, h);
      ctx.stroke();
    }
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

/** Humeurs affichées en bulle au-dessus des visiteurs (« neutre » n'a pas de bulle). */
export type ShownMood = Exclude<VisitorMood, 'neutral'>;

export const MOOD_COLORS: Record<ShownMood, string> = {
  joy: '#d6336c',
  happy: '#b07800',
  bored: '#5f6b7d',
  unhappy: '#b8321f',
  sad: '#4f5fa8',
  hungry: '#c8661a',
  blocked: '#7d1d1d',
};

function face(ctx: CanvasRenderingContext2D, mouth: 'smile' | 'flat' | 'frown', y = 40): void {
  glyphStyle(ctx);
  ctx.beginPath();
  ctx.arc(37, y, 5, 0, Math.PI * 2);
  ctx.arc(59, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  if (mouth === 'smile') ctx.arc(48, y + 12, 14, Math.PI * 0.15, Math.PI * 0.85);
  else if (mouth === 'frown') ctx.arc(48, y + 32, 14, Math.PI * 1.2, Math.PI * 1.8);
  else {
    ctx.moveTo(36, y + 20);
    ctx.lineTo(60, y + 20);
  }
  ctx.stroke();
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number): void {
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  polygon(ctx, points);
}

const MOOD_DRAW: Record<ShownMood, Draw> = {
  // Ravi : cœur.
  joy: (ctx) => {
    outlined(ctx, MOOD_COLORS.joy, () => {
      ctx.moveTo(48, 86);
      ctx.bezierCurveTo(6, 56, 4, 22, 28, 14);
      ctx.bezierCurveTo(40, 10, 48, 20, 48, 28);
      ctx.bezierCurveTo(48, 20, 56, 10, 68, 14);
      ctx.bezierCurveTo(92, 22, 90, 56, 48, 86);
    });
    glyphStyle(ctx);
    ctx.beginPath();
    ctx.arc(30, 32, 6, 0, Math.PI * 2);
    ctx.fill();
  },
  // Amusé : étoile, sourire.
  happy: (ctx) => {
    outlined(ctx, MOOD_COLORS.happy, () => star(ctx, 48, 52, 44, 22));
    glyphStyle(ctx);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(42, 50, 3.5, 0, Math.PI * 2);
    ctx.arc(54, 50, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(48, 56, 9, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  },
  // Ennuyé : rectangle arrondi, bouche plate.
  bored: (ctx) => {
    outlined(ctx, MOOD_COLORS.bored, () => ctx.roundRect(8, 16, 80, 64, 20));
    face(ctx, 'flat', 38);
  },
  // En colère : éclat à pointes, sourcils froncés.
  unhappy: (ctx) => {
    outlined(ctx, MOOD_COLORS.unhappy, () => star(ctx, 48, 48, 46, 34));
    face(ctx, 'frown', 46);
    ctx.beginPath();
    ctx.moveTo(29, 33);
    ctx.lineTo(42, 39);
    ctx.moveTo(67, 33);
    ctx.lineTo(54, 39);
    ctx.stroke();
  },
  // Triste (animal mort ou malheureux) : disque, larme.
  sad: (ctx) => {
    outlined(ctx, MOOD_COLORS.sad, () => ctx.arc(48, 48, 40, 0, Math.PI * 2));
    face(ctx, 'frown', 38);
    ctx.beginPath();
    ctx.moveTo(62, 48);
    ctx.quadraticCurveTo(68, 58, 62, 62);
    ctx.quadraticCurveTo(56, 58, 62, 48);
    ctx.fill();
  },
  // A faim : disque, burger.
  hungry: (ctx) => {
    outlined(ctx, MOOD_COLORS.hungry, () => ctx.arc(48, 48, 40, 0, Math.PI * 2));
    glyphStyle(ctx);
    ctx.beginPath();
    ctx.arc(48, 46, 22, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(25, 50, 46, 7);
    ctx.beginPath();
    ctx.roundRect(26, 60, 44, 10, 5);
    ctx.fill();
  },
  // Bloqué : octogone, barre de sens interdit.
  blocked: (ctx) => {
    const points: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      points.push([48 + Math.cos(a) * 44, 48 + Math.sin(a) * 44]);
    }
    outlined(ctx, MOOD_COLORS.blocked, () => polygon(ctx, points));
    glyphStyle(ctx);
    ctx.fillRect(22, 40, 52, 16);
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

/** Alerte : triangle, point d'exclamation (enclos sans chemin, problèmes du zoo). */
export const ALERT_COLOR = '#c2412d';

function drawAlert(ctx: CanvasRenderingContext2D): void {
  outlined(ctx, ALERT_COLOR, () =>
    polygon(ctx, [
      [48, 6],
      [92, 86],
      [4, 86],
    ]),
  );
  glyphStyle(ctx);
  ctx.fillRect(43, 32, 10, 30);
  ctx.beginPath();
  ctx.arc(48, 73, 6, 0, Math.PI * 2);
  ctx.fill();
}

export function alertIcon(): HTMLCanvasElement {
  return cached('alert', drawAlert);
}

export function moodIcon(mood: ShownMood): HTMLCanvasElement {
  return cached(`mood.${mood}`, MOOD_DRAW[mood]);
}

export function speciesIcon(species: SpeciesId): HTMLCanvasElement {
  return cached(`species.${species}`, SPECIES_DRAW[species]);
}
