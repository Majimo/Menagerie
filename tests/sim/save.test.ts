import { describe, expect, it } from 'vitest';
import { deserialize, type Migrations, migrate, serialize } from '../../src/persistence/save';
import { balance } from '../../src/sim/data/balance';
import { stepSimulation } from '../../src/sim/simulation';
import { createInitialState, type GameState, SAVE_VERSION } from '../../src/sim/state';
import { runScenario, scenarios } from '../e2e/scenarios';

function load(json: string): GameState {
  const result = deserialize(json);
  if (!result.ok) throw new Error(`Chargement refusé : ${result.error}`);
  return result.state;
}

function run(state: GameState, ticks: number): void {
  for (let i = 0; i < ticks; i++) stepSimulation(state);
}

describe('sauvegarde', () => {
  it('aller-retour : l’état rechargé est identique, puis la partie se poursuit à l’identique', () => {
    // Zoo animé en pleine journée : visiteurs en route, trajets en cache, bancs, stands.
    const original = runScenario(scenarios['busy-day']);
    const json = serialize(original);
    const loaded = load(json);
    expect(serialize(loaded)).toBe(json);
    expect(loaded).toEqual(JSON.parse(json));

    // L'original garde ses caches (trajets, réseau), l'état rechargé repart sans : aucune différence attendue.
    run(original, balance.time.ticksPerDay);
    run(loaded, balance.time.ticksPerDay);
    expect(serialize(loaded)).toBe(serialize(original));
  });

  it('refuse un fichier illisible, étranger ou d’une version future', () => {
    expect(deserialize('pas du json')).toEqual({ ok: false, error: 'invalid' });
    expect(deserialize('{"hello":1}')).toEqual({ ok: false, error: 'invalid' });
    const state = createInitialState(1);
    expect(deserialize(JSON.stringify({ ...state, saveVersion: SAVE_VERSION + 1 }))).toEqual({
      ok: false,
      error: 'tooNew',
    });
    expect(deserialize(JSON.stringify({ ...state, world: { ...state.world, tiles: [] } }))).toEqual({
      ok: false,
      error: 'invalid',
    });
  });

  it('applique les migrations une version après l’autre', () => {
    const migrations: Migrations = {
      [SAVE_VERSION - 2]: (data) => ({ ...data, saveVersion: SAVE_VERSION - 1, a: 1 }),
      [SAVE_VERSION - 1]: (data) => ({ ...data, saveVersion: SAVE_VERSION, b: (data.a as number) + 1 }),
    };
    expect(migrate({ saveVersion: SAVE_VERSION - 2 }, migrations)).toEqual({
      saveVersion: SAVE_VERSION,
      a: 1,
      b: 2,
    });
    expect(migrate({ saveVersion: SAVE_VERSION - 3 }, migrations)).toBeNull();
  });
});
