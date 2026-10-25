import { CanvasTexture, LinearFilter, Sprite, SpriteMaterial, SRGBColorSpace } from 'three';

// Étiquettes flottantes (billboards) : texte dessiné sur un canvas, taille constante à l'écran.

const FONT_PX = 44;
const PADDING_PX = 18;

export interface Label {
  readonly sprite: Sprite;
  /** Ajuste la taille au zoom : `viewSize` = étendue visible du monde en tuiles. */
  setViewSize(viewSize: number): void;
}

export function createLabel(text: string, background: string, ink: string): Label {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexte 2D indisponible');
  const font = `600 ${FONT_PX}px system-ui, sans-serif`;
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + PADDING_PX * 2;
  const height = FONT_PX + PADDING_PX * 2;
  canvas.width = width;
  canvas.height = height;
  ctx.font = font;
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  const sprite = new Sprite(new SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.renderOrder = 10;
  const aspect = width / height;

  return {
    sprite,
    setViewSize(viewSize) {
      const h = Math.min(Math.max(viewSize * 0.045, 0.45), 2.2);
      sprite.scale.set(h * aspect, h, 1);
    },
  };
}
