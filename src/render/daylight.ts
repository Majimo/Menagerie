import { Color, type DirectionalLight, type HemisphereLight, type Scene } from 'three';

// Cycle jour/nuit : intensité et teinte des lumières selon l'heure de jeu.
// La nuit reste assez claire pour lire la scène (docs/04 : la lisibilité prime).

const DAY_SKY = new Color(0xf3ead8);
const NIGHT_SKY = new Color(0x39456b);
const DAY_SUN = new Color(0xfff0d0);
const DUSK_SUN = new Color(0xffb27a);
const NIGHT_SUN = new Color(0x9fb4ff);
/** Part de lumière gardée en pleine nuit. */
const NIGHT_LEVEL = 0.5;

export interface DaylightRig {
  scene: Scene;
  hemisphere: HemisphereLight;
  sun: DirectionalLight;
  baseHemisphere: number;
  baseSun: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** 1 en plein jour, 0 en pleine nuit : aube de 5 h à 7 h, crépuscule de 19 h à 21 h. */
export function daylightLevel(hour: number): number {
  return smoothstep(5, 7, hour) * (1 - smoothstep(19, 21, hour));
}

export function applyDaylight(rig: DaylightRig, hour: number): void {
  const level = daylightLevel(hour);
  const light = NIGHT_LEVEL + (1 - NIGHT_LEVEL) * level;
  rig.hemisphere.intensity = rig.baseHemisphere * light;
  rig.sun.intensity = rig.baseSun * (0.35 + 0.65 * level);
  // Teinte chaude autour de l'aube et du crépuscule, froide la nuit.
  const dusk = level > 0 && level < 1 ? 1 - Math.abs(level - 0.5) * 2 : 0;
  rig.sun.color
    .copy(NIGHT_SUN)
    .lerp(DAY_SUN, level)
    .lerp(DUSK_SUN, dusk * 0.6);
  (rig.scene.background as Color).copy(NIGHT_SKY).lerp(DAY_SKY, level);
}
