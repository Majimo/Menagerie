import { FIRST_STEPS, type ObjectiveCondition } from '../sim/data/scenario';
import type { GameState } from '../sim/state';
import { conditionValue, currentObjective } from '../sim/systems/objectives';
import { h } from './dom';
import type { Toast } from './feedback';
import { formatRating, type TextKey, t } from './i18n';
import { icon } from './icons';

// Objectifs du scénario « Premiers pas » : l'objectif en cours et sa progression, la liste complète au clic.
// Les objectifs atteints sont annoncés (zone `aria-live` du message).

const REFRESH_MS = 300;

export interface ObjectivesCard {
  readonly el: HTMLElement;
  update(state: Readonly<GameState>, now: number): void;
}

function conditionText(state: Readonly<GameState>, condition: ObjectiveCondition): string {
  const value = conditionValue(state, condition);
  const shown = condition.kind === 'rating' ? formatRating(value) : String(Math.floor(value));
  return t(`condition.${condition.kind}`, { value: shown, min: condition.min });
}

/** Avancement de 0 à 1 : la condition la moins avancée. */
function progress(state: Readonly<GameState>, conditions: readonly ObjectiveCondition[]): number {
  return Math.min(...conditions.map((c) => Math.min(1, conditionValue(state, c) / c.min)));
}

const objectiveName = (id: string) => t(`objective.${id}` as TextKey);

export function createObjectivesCard(toast: Toast): ObjectivesCard {
  const summary = h('span', { className: 'objectives-summary' });
  const detail = h('span', { className: 'objectives-detail' });
  const bar = h('span', { className: 'objectives-bar', attrs: { 'aria-hidden': 'true' } }, [
    h('span', { className: 'objectives-bar-fill' }),
  ]);
  const toggle = h(
    'button',
    {
      className: 'objectives-toggle',
      attrs: { 'aria-expanded': 'false', 'data-testid': 'objectives', title: t('objectives.toggle') },
    },
    [
      icon('target', 'objectives-target'),
      h('span', { className: 'objectives-text' }, [summary, detail]),
      bar,
    ],
  );
  const list = h('ol', { className: 'objectives-list', attrs: { id: 'objectives-list' } });
  list.hidden = true;
  toggle.setAttribute('aria-controls', list.id);
  toggle.addEventListener('click', () => {
    list.hidden = !list.hidden;
    toggle.setAttribute('aria-expanded', String(!list.hidden));
  });
  const el = h('section', { className: 'objectives', attrs: { 'aria-label': t('objectives.title') } }, [
    toggle,
    list,
  ]);

  let shown = '';
  let lastRefresh = Number.NEGATIVE_INFINITY;
  let lastState: Readonly<GameState> | null = null;
  let completed: number[] = [];

  return {
    el,
    update(state, now) {
      if (state !== lastState) {
        // Nouvelle partie ou chargement : les objectifs déjà atteints ne sont pas des nouvelles.
        lastState = state;
        completed = [...state.scenario.completedAt];
        shown = '';
      }
      announce(state);
      if (now - lastRefresh < REFRESH_MS) return;
      lastRefresh = now;
      const index = currentObjective(state);
      const objective = FIRST_STEPS.objectives[index];
      const total = FIRST_STEPS.objectives.length;
      const key = objective
        ? `${index}|${objective.conditions.map((c) => conditionText(state, c)).join('|')}`
        : 'sandbox';
      if (key === shown) return;
      shown = key;
      if (objective) {
        summary.textContent = `${t('objectives.progress', { index: index + 1, total })} : ${objectiveName(objective.id)}`;
        detail.textContent = objective.conditions.map((c) => conditionText(state, c)).join(' · ');
        bar.hidden = false;
        (bar.firstChild as HTMLElement).style.width =
          `${Math.round(progress(state, objective.conditions) * 100)}%`;
      } else {
        summary.textContent = t('objectives.sandbox');
        detail.textContent = t('objectives.sandbox.help');
        bar.hidden = true;
      }
      el.dataset.sandbox = String(!objective);
      list.replaceChildren(
        ...FIRST_STEPS.objectives.map((o, i) => {
          const done = state.scenario.completedAt[i] !== -1;
          return h('li', { attrs: { 'data-done': String(done) } }, [
            icon(done ? 'check' : 'todo', 'objective-icon'),
            h('span', { text: objectiveName(o.id) }),
            h('span', {
              className: 'visually-hidden',
              text: ` : ${t(done ? 'objectives.done' : 'objectives.todo')}`,
            }),
          ]);
        }),
      );
    },
  };

  function announce(state: Readonly<GameState>): void {
    const now = state.scenario.completedAt;
    for (let i = 0; i < now.length; i++) {
      if (completed[i] !== -1 || now[i] === -1) continue;
      const objective = FIRST_STEPS.objectives[i];
      const last = currentObjective(state) === -1;
      toast.show(
        last ? t('notice.sandbox') : t('notice.objective', { name: objectiveName(objective?.id ?? '') }),
        'info',
      );
    }
    completed = [...now];
  }
}
