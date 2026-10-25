import type { Command, CommandResult } from '../sim/commands';
import type { AnimalId, GameState, VisitorId } from '../sim/state';
import { inBounds } from '../sim/world/grid';
import { h } from './dom';
import { t } from './i18n';
import { icon } from './icons';
import { animalPanel } from './panels/animalPanel';
import { economyPanel } from './panels/economyPanel';
import { enclosurePanel } from './panels/enclosurePanel';
import type { PanelContent, PanelNavigation, Selection } from './panels/types';
import { visitorPanel } from './panels/visitorPanel';
import { zooPanel } from './panels/zooPanel';

export type { Selection } from './panels/types';

// Panneau d'inspection (zoo, économie, enclos, animal, visiteur). Reconstruit seulement quand son contenu change, en gardant le focus
// clavier sur le même bouton.

/** Rafraîchissement du contenu : inutile à chaque frame, les jauges bougent lentement. */
const REFRESH_MS = 250;
/** Distance (en tuiles) en deçà de laquelle un clic vise un animal ou un visiteur. */
const PICK_RADIUS = 0.7;
const VISITOR_PICK_RADIUS = 0.45;

export interface Inspector extends PanelNavigation {
  readonly selection: Selection | null;
  readonly selectedAnimal: AnimalId | null;
  readonly selectedVisitor: VisitorId | null;
  /** Clic ou appui sur le terrain sans outil actif : animal ou visiteur le plus proche, sinon enclos, sinon fermeture. */
  pickAt(state: Readonly<GameState>, point: { x: number; z: number }): void;
  update(state: Readonly<GameState>, now: number): void;
}

export function createInspector(
  parent: HTMLElement,
  dispatch: (command: Command) => CommandResult,
): Inspector {
  const panel = h('section', { className: 'inspector', attrs: { 'aria-labelledby': 'inspector-title' } });
  panel.dataset.testid = 'inspector';
  panel.hidden = true;
  const heading = h('h2', { className: 'inspector-title', attrs: { id: 'inspector-title', tabindex: '-1' } });
  const close = h('button', {
    className: 'icon-button',
    attrs: { 'aria-label': t('panel.close'), title: t('panel.close') },
    onClick: () => inspector.select(null),
  });
  close.append(icon('close'));
  const content = h('div', { className: 'inspector-body' });
  panel.append(h('header', { className: 'inspector-header' }, [heading, close]), content);
  parent.append(panel);

  let selection: Selection | null = null;
  let shown = '';
  let lastRefresh = Number.NEGATIVE_INFINITY;
  let moveFocus = false;

  const inspector: Inspector = {
    get selection() {
      return selection;
    },
    get selectedAnimal() {
      return selection?.kind === 'animal' ? selection.id : null;
    },
    get selectedVisitor() {
      return selection?.kind === 'visitor' ? selection.id : null;
    },
    dispatch(command) {
      const result = dispatch(command);
      // Effet immédiat dans le panneau.
      lastRefresh = Number.NEGATIVE_INFINITY;
      return result;
    },
    select(next) {
      // Ouvert depuis le panneau ou un bouton : le focus suit vers le nouveau titre.
      moveFocus =
        next !== null &&
        (panel.contains(document.activeElement) || document.activeElement?.tagName === 'BUTTON');
      if (next === null && panel.contains(document.activeElement))
        (document.activeElement as HTMLElement).blur();
      selection = next;
      lastRefresh = Number.NEGATIVE_INFINITY;
    },
    pickAt(state, point) {
      let best: { selection: Selection; distance: number } | null = null;
      for (const animal of Object.values(state.animals)) {
        const distance = Math.hypot(animal.x - point.x, animal.y - point.z);
        if (distance < PICK_RADIUS && (!best || distance < best.distance))
          best = { selection: { kind: 'animal', id: animal.id }, distance };
      }
      for (const visitor of Object.values(state.visitors)) {
        const distance = Math.hypot(visitor.x - point.x, visitor.y - point.z);
        if (distance < VISITOR_PICK_RADIUS && (!best || distance < best.distance))
          best = { selection: { kind: 'visitor', id: visitor.id }, distance };
      }
      if (best) {
        inspector.select(best.selection);
        return;
      }
      const tile = { x: Math.floor(point.x), y: Math.floor(point.z) };
      const enclosureId = inBounds(state.world, tile)
        ? (state.world.enclosureOf[tile.y * state.world.width + tile.x] ?? 0)
        : 0;
      inspector.select(enclosureId ? { kind: 'enclosure', id: enclosureId } : null);
    },
    update(state, now) {
      if (now - lastRefresh < REFRESH_MS) return;
      lastRefresh = now;
      const view = selection ? build(state, selection) : null;
      if (!view) {
        // L'animal ou l'enclos a disparu : on referme.
        selection = null;
        panel.hidden = true;
        shown = '';
        return;
      }
      panel.hidden = false;
      const body = h('div', {}, view.body);
      const key = `${view.title}|${body.innerHTML}`;
      if (key !== shown) {
        shown = key;
        const focused = (document.activeElement as HTMLElement | null)?.dataset?.focusId;
        heading.replaceChildren(...(view.icon ? [view.icon] : []), view.title);
        content.replaceChildren(...body.childNodes);
        if (focused) content.querySelector<HTMLElement>(`[data-focus-id="${focused}"]`)?.focus();
      }
      if (moveFocus) {
        moveFocus = false;
        heading.focus();
      }
    },
  };

  function build(state: Readonly<GameState>, current: Selection): PanelContent | null {
    switch (current.kind) {
      case 'zoo':
        return zooPanel(state, inspector);
      case 'economy':
        return economyPanel(state, inspector);
      case 'enclosure': {
        const enclosure = state.enclosures[current.id];
        return enclosure ? enclosurePanel(state, enclosure, inspector) : null;
      }
      case 'animal': {
        const animal = state.animals[current.id];
        return animal ? animalPanel(state, animal, inspector) : null;
      }
      case 'visitor': {
        const visitor = state.visitors[current.id];
        return visitor ? visitorPanel(state, visitor, inspector) : null;
      }
    }
  }

  return inspector;
}
