// État global de la simulation : de la donnée pure, sérialisable en JSON (règle d'architecture n° 4).
// Il s'enrichit à chaque itération (monde, enclos, animaux, visiteurs…).

export const SAVE_VERSION = 1;

export interface GameState {
  saveVersion: number;
  /** Compteur de ticks écoulés depuis le début de la partie (10 Hz). */
  tick: number;
}

export function createInitialState(): GameState {
  return { saveVersion: SAVE_VERSION, tick: 0 };
}
