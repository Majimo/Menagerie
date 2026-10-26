import { type GameState, SAVE_VERSION } from '../sim/state';

// Sauvegarde JSON versionnée (docs/03) : l'état de simulation complet, PRNG compris (`rngState`).
// Chargement : migrations successives vN → vN+1 jusqu'à `SAVE_VERSION`. Code pur, testé sous Node.

/** Première version sauvegardable : les formats antérieurs n'ont jamais été écrits sur disque. */
export const OLDEST_SAVE_VERSION = 4;

/** Donnée brute d'une sauvegarde, avant migration. */
export type SaveData = Record<string, unknown> & { saveVersion: number };

/** `MIGRATIONS[n]` transforme une sauvegarde de version n en version n + 1. */
export type Migrations = Readonly<Record<number, (data: SaveData) => SaveData>>;

export const MIGRATIONS: Migrations = {};

export type LoadError = 'invalid' | 'tooOld' | 'tooNew';

export type LoadResult = { ok: true; state: GameState } | { ok: false; error: LoadError };

export function serialize(state: Readonly<GameState>): string {
  return JSON.stringify(state);
}

export function deserialize(json: string, migrations: Migrations = MIGRATIONS): LoadResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: 'invalid' };
  }
  if (!isSaveData(data)) return { ok: false, error: 'invalid' };
  if (data.saveVersion > SAVE_VERSION) return { ok: false, error: 'tooNew' };
  if (data.saveVersion < OLDEST_SAVE_VERSION) return { ok: false, error: 'tooOld' };
  const migrated = migrate(data, migrations);
  if (!migrated) return { ok: false, error: 'tooOld' };
  if (!looksLikeState(migrated)) return { ok: false, error: 'invalid' };
  return { ok: true, state: migrated };
}

/** Applique les migrations jusqu'à la version courante ; `null` s'il en manque une. */
export function migrate(data: SaveData, migrations: Migrations): SaveData | null {
  let current = data;
  while (current.saveVersion < SAVE_VERSION) {
    const step = migrations[current.saveVersion];
    if (!step) return null;
    const next = step(current);
    if (next.saveVersion !== current.saveVersion + 1) return null;
    current = next;
  }
  return current;
}

function isSaveData(data: unknown): data is SaveData {
  return typeof data === 'object' && data !== null && typeof (data as SaveData).saveVersion === 'number';
}

/** Contrôle de forme minimal : une sauvegarde corrompue ou étrangère est refusée plutôt que de planter le jeu. */
function looksLikeState(data: SaveData): data is SaveData & GameState {
  const state = data as Partial<GameState>;
  const world = state.world;
  return (
    typeof state.tick === 'number' &&
    typeof state.rngState === 'number' &&
    typeof state.money === 'number' &&
    typeof world === 'object' &&
    world !== null &&
    Array.isArray(world.tiles) &&
    world.tiles.length === world.width * world.height &&
    typeof state.animals === 'object' &&
    typeof state.visitors === 'object' &&
    typeof state.buildings === 'object' &&
    typeof state.stats === 'object' &&
    typeof state.scenario === 'object'
  );
}
