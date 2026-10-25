import type { GameState } from './sim/state';

// Partie en cours : l'état peut être remplacé d'un bloc (chargement d'un scénario, d'une sauvegarde).

export interface Session {
  state: GameState;
}
