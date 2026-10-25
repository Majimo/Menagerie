import { describe, expect, it } from 'vitest';
import { dispatchCommand } from '../../src/sim/simulation';
import { createInitialState } from '../../src/sim/state';
import type { Edge } from '../../src/sim/world/grid';
import { placeFences, rectangleOutline } from './helpers';

describe('détection des enclos (flood fill)', () => {
  it('carte vierge : aucun enclos', () => {
    const state = createInitialState();
    expect(Object.keys(state.enclosures)).toHaveLength(0);
  });

  it('enclos rectangulaire simple : détecté avec sa surface', () => {
    const state = createInitialState();
    placeFences(state, rectangleOutline(10, 10, 14, 13)); // 5 × 4
    const enclosures = Object.values(state.enclosures);
    expect(enclosures).toHaveLength(1);
    expect(enclosures[0]?.area).toBe(20);
    expect(state.world.enclosureOf[12 * 48 + 12]).toBe(enclosures[0]?.id);
    expect(state.world.enclosureOf[9 * 48 + 12]).toBe(0);
  });

  it('enclos en L : détecté avec la bonne surface', () => {
    const state = createInitialState();
    // L : barre verticale x 5..6, y 5..10 (12 tuiles) + pied x 7..9, y 9..10 (6 tuiles).
    const L: Edge[] = [
      { axis: 'h', x: 5, y: 5 },
      { axis: 'h', x: 6, y: 5 },
      ...[5, 6, 7, 8, 9].map((x) => ({ axis: 'h' as const, x, y: 11 })),
      { axis: 'h', x: 7, y: 9 },
      { axis: 'h', x: 8, y: 9 },
      { axis: 'h', x: 9, y: 9 },
      ...[5, 6, 7, 8, 9, 10].map((y) => ({ axis: 'v' as const, x: 5, y })),
      ...[5, 6, 7, 8].map((y) => ({ axis: 'v' as const, x: 7, y })),
      { axis: 'v', x: 10, y: 9 },
      { axis: 'v', x: 10, y: 10 },
    ];
    placeFences(state, L);
    const enclosures = Object.values(state.enclosures);
    expect(enclosures).toHaveLength(1);
    expect(enclosures[0]?.area).toBe(18);
  });

  it('enclos non fermé : pas d’enclos tant qu’il manque un segment', () => {
    const state = createInitialState();
    const outline = rectangleOutline(10, 10, 14, 13);
    const missing = outline.pop() as Edge;
    placeFences(state, outline);
    expect(Object.keys(state.enclosures)).toHaveLength(0);
    placeFences(state, [missing]);
    expect(Object.keys(state.enclosures)).toHaveLength(1);
  });

  it('un enclos peut s’appuyer sur des clôtures posées sur le bord de carte', () => {
    const state = createInitialState();
    placeFences(state, rectangleOutline(0, 0, 2, 2)); // inclut les arêtes de bord nord et ouest
    expect(Object.values(state.enclosures)[0]?.area).toBe(9);
  });

  it('le bord de carte sans clôture ne ferme pas un enclos', () => {
    const state = createInitialState();
    // Seulement les côtés sud et est d'un carré dans le coin : ouvert sur le bord de carte.
    placeFences(state, [
      ...[0, 1, 2].map((x) => ({ axis: 'h' as const, x, y: 3 })),
      ...[0, 1, 2].map((y) => ({ axis: 'v' as const, x: 3, y })),
    ]);
    expect(Object.keys(state.enclosures)).toHaveLength(0);
  });

  it('deux enclos séparés par une clôture commune', () => {
    const state = createInitialState();
    placeFences(state, rectangleOutline(10, 10, 13, 13));
    placeFences(
      state,
      [0, 1, 2, 3].map((y) => ({ axis: 'v' as const, x: 12, y: 10 + y })),
    );
    const areas = Object.values(state.enclosures)
      .map((e) => e.area)
      .sort();
    expect(areas).toEqual([8, 8]);
  });

  it('garde son id quand on l’agrandit, en change quand on le détruit', () => {
    const state = createInitialState();
    placeFences(state, rectangleOutline(10, 10, 13, 13));
    const [first] = Object.values(state.enclosures);
    // Ouvrir le côté est puis le refermer un cran plus loin : la majorité des tuiles est conservée.
    const east = [10, 11, 12, 13].map((y) => ({ axis: 'v' as const, x: 14, y }));
    placeFences(state, [
      { axis: 'h', x: 14, y: 10 },
      { axis: 'h', x: 14, y: 14 },
      ...east.map((e) => ({ ...e, x: 15 })),
    ]);
    for (const edge of east) dispatchCommand(state, { type: 'Demolish', target: { kind: 'fence', edge } });
    const after = Object.values(state.enclosures);
    expect(after).toHaveLength(1);
    expect(after[0]?.id).toBe(first?.id);
    expect(after[0]?.area).toBe(20);

    // Ouvert : plus d'enclos ; refermé ailleurs : nouvel id.
    dispatchCommand(state, {
      type: 'Demolish',
      target: { kind: 'fence', edge: { axis: 'h', x: 11, y: 10 } },
    });
    expect(Object.keys(state.enclosures)).toHaveLength(0);
    placeFences(state, rectangleOutline(30, 30, 32, 32));
    expect(Object.values(state.enclosures)[0]?.id).not.toBe(first?.id);
  });
});
