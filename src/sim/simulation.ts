import type { GameState } from './state';

// Boucle de simulation. À l'itération 0, un tick se contente d'avancer le compteur ;
// l'accumulateur à 10 Hz, les commandes et les systèmes arrivent à l'itération 1.

export function stepSimulation(state: GameState): void {
  state.tick += 1;
}
