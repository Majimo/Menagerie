import type { GameState } from '../state';
import { updateEnclosures } from './enclosures';

// Systèmes de simulation, exécutés dans cet ordre à chaque tick (voir docs/03-architecture.md).

export type System = (state: GameState) => void;

export const SYSTEMS: readonly System[] = [updateEnclosures];
