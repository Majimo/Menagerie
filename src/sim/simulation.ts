import { applyCommand, type Command, type CommandResult } from './commands';
import type { GameState } from './state';
import { SYSTEMS } from './systems';
import { updateEnclosures } from './systems/enclosures';

// Boucle de simulation : un tick exécute les systèmes dans un ordre fixe.

export function stepSimulation(state: GameState): void {
  state.tick += 1;
  for (const system of SYSTEMS) system(state);
}

/**
 * Applique une commande du joueur entre deux ticks, au tick courant : l'effet est immédiat (même en pause),
 * et une partie reste rejouable avec la seed et la liste (tick, commande).
 */
export function dispatchCommand(state: GameState, command: Command): CommandResult {
  const result = applyCommand(state, command);
  // La géométrie des enclos doit être à jour pour l'affichage de la surface au survol, sans attendre le tick.
  if (result.ok) updateEnclosures(state);
  return result;
}
