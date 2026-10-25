import type { GameState } from '../state';
import { detectEnclosures } from '../world/enclosures';

// Système `enclosures` : recalcule les enclos uniquement quand les clôtures ont changé.

export function updateEnclosures(state: GameState): void {
  const { world } = state;
  if (!world.enclosuresDirty) return;
  const detection = detectEnclosures(world, state.enclosures, state.nextEnclosureId);
  state.enclosures = detection.enclosures;
  state.nextEnclosureId = detection.nextEnclosureId;
  world.enclosureOf = detection.enclosureOf;
  world.enclosuresDirty = false;
}
