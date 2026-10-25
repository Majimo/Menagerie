import { zooAlerts } from '../sim/alerts';
import type { GameState } from '../sim/state';
import { ledgerNet } from '../sim/systems/economy';
import { h } from './dom';
import { formatMoney, formatSigned, t } from './i18n';
import { icon } from './icons';
import type { PanelNavigation, Selection } from './panels/types';

// Bandeau des problèmes du zoo (docs/09 : repérable en moins de 3 secondes) : icône d'alerte, texte, contour.
// Chaque alerte ouvre le panneau utile (enclos, visiteur bloqué, économie).

const REFRESH_MS = 300;

interface AlertItem {
  id: string;
  text: string;
  target: Selection;
}

export interface AlertsBar {
  update(state: Readonly<GameState>, now: number): void;
}

export function createAlertsBar(parent: HTMLElement, nav: PanelNavigation): AlertsBar {
  const list = h('ul', {
    className: 'alerts',
    attrs: { 'aria-label': t('alerts.label'), 'data-testid': 'alerts' },
  });
  parent.append(list);
  let shown = '';
  let lastRefresh = Number.NEGATIVE_INFINITY;
  return {
    update(state, now) {
      if (now - lastRefresh < REFRESH_MS) return;
      lastRefresh = now;
      const items = alertItems(state);
      const key = items.map((item) => `${item.id}:${item.text}`).join('|');
      if (key === shown) return;
      shown = key;
      const focused = (document.activeElement as HTMLElement | null)?.dataset?.focusId;
      list.replaceChildren(
        ...items.map((item) =>
          h('li', {}, [
            h(
              'button',
              {
                className: 'alert-chip',
                attrs: { 'data-focus-id': item.id, 'data-alert': item.id.split('-')[0] ?? item.id },
                onClick: () => nav.select(item.target),
              },
              [icon('alert'), h('span', { text: item.text })],
            ),
          ]),
        ),
      );
      if (focused) list.querySelector<HTMLElement>(`[data-focus-id="${focused}"]`)?.focus();
    },
  };
}

function alertItems(state: Readonly<GameState>): AlertItem[] {
  const alerts = zooAlerts(state);
  const items: AlertItem[] = [];
  if (alerts.blockedVisitors > 0) {
    const first = Object.values(state.visitors).find((v) => v.blockedTicks > 0);
    items.push({
      id: 'blocked',
      text: t('alert.blocked', { count: alerts.blockedVisitors }),
      target: first ? { kind: 'visitor', id: first.id } : { kind: 'economy' },
    });
  }
  if (state.money < 0) {
    items.push({
      id: 'deficit',
      text: t('alert.moneyNegative', { amount: `−${formatMoney(Math.abs(Math.round(state.money)))}` }),
      target: { kind: 'economy' },
    });
  } else if (alerts.deficit) {
    const yesterday = state.stats.history[state.stats.history.length - 1];
    if (yesterday)
      items.push({
        id: 'deficit',
        text: t('alert.deficit', { day: yesterday.day, amount: formatSigned(ledgerNet(yesterday)) }),
        target: { kind: 'economy' },
      });
  }
  if (alerts.exitUnreachable)
    items.push({ id: 'exit', text: t('alert.exitUnreachable'), target: { kind: 'economy' } });
  for (const id of alerts.unreachableEnclosures) {
    items.push({
      id: `unreachable-${id}`,
      text: t('alert.unreachable', { id }),
      target: { kind: 'enclosure', id },
    });
  }
  if (alerts.hungryWithoutFood > 0)
    items.push({
      id: 'hungry',
      text: t('alert.hungry', { count: alerts.hungryWithoutFood }),
      target: { kind: 'economy' },
    });
  return items;
}
