import type { GameState } from '../state';
import { detectEnclosures } from '../world/enclosures';
import { tileIndex } from '../world/grid';

// Système `enclosures` : recalcule les enclos uniquement quand les clôtures ont changé,
// puis rattache chaque animal à l'enclos qui contient sa position.

export function updateEnclosures(state: GameState): void {
  const { world } = state;
  if (!world.enclosuresDirty) return;
  const detection = detectEnclosures(world, state.enclosures, state.nextEnclosureId);
  state.enclosures = detection.enclosures;
  state.nextEnclosureId = detection.nextEnclosureId;
  world.enclosureOf = detection.enclosureOf;
  world.enclosuresDirty = false;
  world.revision += 1;
  for (const animal of Object.values(state.animals)) {
    const enclosureId =
      world.enclosureOf[tileIndex(world, { x: Math.floor(animal.x), y: Math.floor(animal.y) })] ?? 0;
    if (enclosureId === animal.enclosureId) continue;
    animal.enclosureId = enclosureId;
    animal.path = [];
    if (animal.activity === 'walk') animal.activity = 'idle';
  }
}
