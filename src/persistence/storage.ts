import type { GameState } from '../sim/state';
import { deserialize, type LoadResult, serialize } from './save';

// Stockage local des sauvegardes (localStorage). Un seul emplacement au POC : la sauvegarde manuelle et la
// sauvegarde automatique de fin de journée écrivent au même endroit. Les erreurs d'accès (navigation privée,
// quota) sont rattrapées : le jeu reste jouable sans stockage.

const KEY = 'menagerie.save';

export function writeSave(state: Readonly<GameState>): boolean {
  try {
    localStorage.setItem(KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

/** `null` : aucune sauvegarde (ou stockage inaccessible). */
export function readSave(): LoadResult | null {
  try {
    const json = localStorage.getItem(KEY);
    return json === null ? null : deserialize(json);
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}
