import { describe, expect, it } from 'vitest';
import { balance } from '../../src/sim/data/balance';
import { createVisitor } from '../../src/sim/entities';
import { dispatchCommand } from '../../src/sim/simulation';
import { createInitialState } from '../../src/sim/state';
import { updatePathfinding } from '../../src/sim/systems/pathfinding';
import { tileIndex } from '../../src/sim/world/grid';
import { aStar, cachedPath } from '../../src/sim/world/pathfinding';
import { visitorNetwork } from '../../src/sim/world/visitorNetwork';
import { buildVisitorZoo, placeFences, placePath, rectangleOutline } from './helpers';

const at = (x: number, y: number) => tileIndex(balance.map, { x, y });

describe('pathfinding A* des visiteurs', () => {
  it('suit le chemin le plus court, sans la tuile de départ', () => {
    const state = createInitialState(1);
    placePath(state, { x: 21, y: 46 }, { x: 21, y: 40 });
    const path = aStar(state.world, at(21, 47), at(21, 40));
    expect(path).toEqual([46, 45, 44, 43, 42, 41, 40].map((y) => at(21, y)));
  });

  it("contourne une clôture posée en travers d'un chemin, et échoue s'il n'y a plus de passage", () => {
    const state = createInitialState(1);
    state.money = 1_000_000;
    // Boucle : deux colonnes reliées en haut et en bas.
    placePath(state, { x: 10, y: 10 }, { x: 10, y: 20 });
    placePath(state, { x: 14, y: 10 }, { x: 14, y: 20 });
    placePath(state, { x: 10, y: 10 }, { x: 14, y: 10 });
    placePath(state, { x: 10, y: 20 }, { x: 14, y: 20 });
    const direct = aStar(state.world, at(10, 20), at(10, 12));
    expect(direct).toHaveLength(8);
    dispatchCommand(state, { type: 'PlaceFence', edge: { axis: 'h', x: 10, y: 15 } });
    const detour = aStar(state.world, at(10, 20), at(10, 12));
    expect(detour).toHaveLength(4 + 10 + 4 + 2);
    dispatchCommand(state, { type: 'PlaceFence', edge: { axis: 'h', x: 14, y: 15 } });
    expect(aStar(state.world, at(10, 20), at(10, 12))).toBeNull();
  });

  it("ignore les chemins à l'intérieur d'un enclos", () => {
    const state = createInitialState(1);
    state.money = 1_000_000;
    placePath(state, { x: 5, y: 5 }, { x: 5, y: 9 });
    placeFences(state, rectangleOutline(4, 7, 6, 7));
    expect(aStar(state.world, at(5, 5), at(5, 9))).toBeNull();
  });

  it('cache les trajets et les invalide quand le monde change', () => {
    const state = createInitialState(1);
    placePath(state, { x: 21, y: 46 }, { x: 21, y: 40 });
    expect(cachedPath(state, at(21, 47), at(21, 40)).cached).toBe(false);
    expect(cachedPath(state, at(21, 47), at(21, 40)).cached).toBe(true);
    dispatchCommand(state, { type: 'Demolish', target: { kind: 'tile', tile: { x: 21, y: 43 } } });
    const after = cachedPath(state, at(21, 47), at(21, 40));
    expect(after.cached).toBe(false);
    expect(after.path).toBeNull();
  });

  it('respecte le budget de demandes par tick, cache compris, et traite le reste au tick suivant', () => {
    const state = createInitialState(1);
    buildVisitorZoo(state);
    const reachable = [...visitorNetwork(state).reachable];
    // Chaque but deux fois : la seconde demande est en cache mais compte quand même.
    const goals = [...reachable, ...reachable].slice(0, balance.pathfinding.requestsPerTick + 10);
    expect(goals.length).toBe(balance.pathfinding.requestsPerTick + 10);
    const visitors = goals.map((goal) => {
      const visitor = createVisitor(state, 'adult', at(21, 47));
      visitor.goal = goal;
      visitor.pathStatus = 'pending';
      return visitor;
    });
    updatePathfinding(state);
    const pending = () => visitors.filter((v) => v.pathStatus === 'pending').length;
    expect(pending()).toBe(10);
    updatePathfinding(state);
    expect(pending()).toBe(0);
    expect(visitors.every((v) => v.pathStatus === 'ready')).toBe(true);
  });
});
