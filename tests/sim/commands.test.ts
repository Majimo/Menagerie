import { describe, expect, it } from 'vitest';
import { validateCommand } from '../../src/sim/commands';
import { balance } from '../../src/sim/data/balance';
import { tileCode } from '../../src/sim/data/terrain';
import { dispatchCommand } from '../../src/sim/simulation';
import { createInitialState } from '../../src/sim/state';

const tileOf = (state: ReturnType<typeof createInitialState>, x: number, y: number) =>
  state.world.tiles[y * state.world.width + x];

describe('commandes de construction', () => {
  it('chemin : pose la tuile et débite son coût', () => {
    const state = createInitialState();
    const result = dispatchCommand(state, { type: 'PlacePath', tile: { x: 5, y: 5 } });
    expect(result).toEqual({ ok: true, moneyDelta: -balance.costs.path });
    expect(tileOf(state, 5, 5)).toBe(tileCode('path'));
    expect(state.money).toBe(balance.startingMoney - balance.costs.path);
  });

  it('clôture et biome : débitent leur coût', () => {
    const state = createInitialState();
    dispatchCommand(state, { type: 'PlaceFence', edge: { axis: 'h', x: 3, y: 3 } });
    dispatchCommand(state, { type: 'PaintBiome', tile: { x: 3, y: 3 }, biome: 'savanna' });
    expect(state.money).toBe(balance.startingMoney - balance.costs.fence - balance.costs.biome);
    expect(tileOf(state, 3, 3)).toBe(tileCode('savanna'));
    expect(state.world.fencesH[3 * 48 + 3]).toBe(1);
  });

  it('démolir : rend une part du coût', () => {
    const state = createInitialState();
    dispatchCommand(state, { type: 'PlacePath', tile: { x: 5, y: 5 } });
    const result = dispatchCommand(state, {
      type: 'Demolish',
      target: { kind: 'tile', tile: { x: 5, y: 5 } },
    });
    expect(result).toEqual({
      ok: true,
      moneyDelta: Math.floor(balance.costs.path * balance.demolishRefundRatio),
    });
    expect(tileOf(state, 5, 5)).toBe(tileCode('grass'));
  });

  it('refuse sans rien modifier quand l’argent manque', () => {
    const state = createInitialState();
    state.money = balance.costs.fence - 1;
    const before = structuredClone(state);
    expect(dispatchCommand(state, { type: 'PlaceFence', edge: { axis: 'v', x: 1, y: 1 } })).toEqual({
      ok: false,
      error: 'notEnoughMoney',
    });
    expect(state).toEqual(before);
  });

  it('refuse les placements invalides avec une raison', () => {
    const state = createInitialState();
    dispatchCommand(state, { type: 'PlacePath', tile: { x: 5, y: 5 } });
    dispatchCommand(state, { type: 'PlaceFence', edge: { axis: 'h', x: 1, y: 1 } });
    const cases = [
      [{ type: 'PlacePath', tile: { x: 48, y: 0 } }, 'outOfBounds'],
      [{ type: 'PlacePath', tile: { x: 5, y: 5 } }, 'alreadyPath'],
      [{ type: 'PlaceFence', edge: { axis: 'h', x: 1, y: 1 } }, 'alreadyFenced'],
      [{ type: 'PlaceFence', edge: { axis: 'v', x: 49, y: 0 } }, 'outOfBounds'],
      [{ type: 'PaintBiome', tile: { x: 5, y: 5 }, biome: 'forest' }, 'tileIsPath'],
      [{ type: 'PaintBiome', tile: { x: 6, y: 6 }, biome: 'grass' }, 'alreadyBiome'],
      [{ type: 'PaintBiome', tile: balance.map.entrance, biome: 'sand' }, 'protectedTile'],
      [{ type: 'Demolish', target: { kind: 'tile', tile: balance.map.exit } }, 'protectedTile'],
      [{ type: 'Demolish', target: { kind: 'tile', tile: { x: 7, y: 7 } } }, 'nothingToDemolish'],
      [{ type: 'Demolish', target: { kind: 'fence', edge: { axis: 'v', x: 2, y: 2 } } }, 'nothingToDemolish'],
    ] as const;
    for (const [command, error] of cases) {
      expect(validateCommand(state, command), JSON.stringify(command)).toEqual({ ok: false, error });
    }
  });

  it('entrée et sortie sont pré-placées sur le bord de carte', () => {
    const state = createInitialState();
    const { entrance, exit, height } = state.world;
    expect(entrance.y).toBe(height - 1);
    expect(exit.y).toBe(height - 1);
    expect(tileOf(state, entrance.x, entrance.y)).toBe(tileCode('path'));
    expect(tileOf(state, exit.x, exit.y)).toBe(tileCode('path'));
  });
});
