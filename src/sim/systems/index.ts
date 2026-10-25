import type { GameState } from '../state';
import { updateAnimalMovement } from './animalMovement';
import { updateAnimalNeeds } from './animalNeeds';
import { updateEconomy } from './economy';
import { updateEnclosures } from './enclosures';
import { updatePathfinding } from './pathfinding';
import { updateRating } from './rating';
import { updateVisitorAI } from './visitorAI';
import { updateVisitorSpawn } from './visitorSpawn';

// Systèmes de simulation, exécutés dans cet ordre à chaque tick (voir docs/03-architecture.md).
// Le score d'habitat est calculé à la demande par `animalNeeds` (world/habitat.ts), une fois par enclos et espèce.

export type System = (state: GameState) => void;

export const SYSTEMS: readonly System[] = [
  updateEnclosures,
  updateAnimalNeeds,
  updateAnimalMovement,
  updateVisitorSpawn,
  updateVisitorAI,
  updatePathfinding,
  updateEconomy,
  updateRating,
];
