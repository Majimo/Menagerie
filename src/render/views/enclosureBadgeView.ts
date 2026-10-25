import { CanvasTexture, Group, LinearFilter, Sprite, SpriteMaterial, SRGBColorSpace } from 'three';
import { SPECIES_IDS, type SpeciesId } from '../../sim/data/species';
import type { GameState } from '../../sim/state';
import { animalsIn } from '../../sim/world/habitat';
import { speciesIcon } from '../icons';

// Badge flottant au-dessus de chaque enclos habité : icônes des espèces présentes, lisible au zoom éloigné.

const BADGE_HEIGHT_PX = 42;
const ICON = 80;
const PAD = 10;
/** Au-dessus de la tête des girafes et de leurs icônes d'état. */
const HEIGHT = 3.5;

interface Badge {
  key: string;
  sprite: Sprite;
  aspect: number;
}

export interface EnclosureBadgeView {
  readonly group: Group;
  update(state: Readonly<GameState>, worldPerPixel: number): void;
}

function drawBadge(species: SpeciesId[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = species.length * ICON + PAD * 2;
  canvas.height = ICON + PAD * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexte 2D indisponible');
  ctx.fillStyle = '#fff6e5';
  ctx.strokeStyle = '#2d2a24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, canvas.height / 2);
  ctx.fill();
  ctx.stroke();
  species.forEach((id, i) => {
    ctx.drawImage(speciesIcon(id), PAD + i * ICON, PAD, ICON, ICON);
  });
  return canvas;
}

export function createEnclosureBadgeView(): EnclosureBadgeView {
  const group = new Group();
  const badges = new Map<number, Badge>();

  return {
    group,
    update(state, worldPerPixel) {
      const seen = new Set<number>();
      for (const enclosure of Object.values(state.enclosures)) {
        const present = new Set(animalsIn(state, enclosure.id).map((a) => a.species));
        if (present.size === 0) continue;
        const species = SPECIES_IDS.filter((id) => present.has(id));
        const key = `${species.join(',')}|${enclosure.tiles.length}|${enclosure.tiles[0]}`;
        seen.add(enclosure.id);
        let badge = badges.get(enclosure.id);
        if (badge?.key !== key) {
          if (badge) {
            group.remove(badge.sprite);
            badge.sprite.material.map?.dispose();
            badge.sprite.material.dispose();
          }
          badge = createBadge(key, species, anchorOf(enclosure.tiles, state.world.width));
          group.add(badge.sprite);
          badges.set(enclosure.id, badge);
        }
        const h = BADGE_HEIGHT_PX * worldPerPixel;
        badge.sprite.scale.set(h * badge.aspect, h, 1);
      }
      for (const [id, badge] of badges) {
        if (seen.has(id)) continue;
        group.remove(badge.sprite);
        badge.sprite.material.map?.dispose();
        badge.sprite.material.dispose();
        badges.delete(id);
      }
    },
  };
}

function createBadge(key: string, species: SpeciesId[], anchor: { x: number; z: number }): Badge {
  const canvas = drawBadge(species);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  const sprite = new Sprite(new SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.renderOrder = 9;
  sprite.position.set(anchor.x, HEIGHT, anchor.z);
  return { key, sprite, aspect: canvas.width / canvas.height };
}

/** Centre de la tuile de l'enclos la plus proche de son barycentre (reste dans l'enclos, même en L). */
function anchorOf(tiles: readonly number[], width: number): { x: number; z: number } {
  let sx = 0;
  let sy = 0;
  for (const index of tiles) {
    sx += index % width;
    sy += Math.floor(index / width);
  }
  const cx = sx / tiles.length;
  const cy = sy / tiles.length;
  let best = tiles[0] ?? 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const index of tiles) {
    const d = ((index % width) - cx) ** 2 + (Math.floor(index / width) - cy) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = index;
    }
  }
  return { x: (best % width) + 0.5, z: Math.floor(best / width) + 0.5 };
}
