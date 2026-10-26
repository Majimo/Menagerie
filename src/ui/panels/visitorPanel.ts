import { moodIcon } from '../../render/icons';
import { balance } from '../../sim/data/balance';
import { isVisitorBlocked, visitorMood } from '../../sim/entities';
import type { GameState, Visitor } from '../../sim/state';
import { canvasImage, h } from '../dom';
import { t } from '../i18n';
import type { PanelContent, PanelNavigation } from './types';
import { gauge } from './widgets';

// Panneau d'un visiteur : humeur, ce qu'il fait, jauges, enclos vus.

export function visitorPanel(
  state: Readonly<GameState>,
  visitor: Visitor,
  nav: PanelNavigation,
): PanelContent {
  const v = balance.visitors;
  const mood = visitorMood(visitor, state.tick, isVisitorBlocked(state, visitor));
  const target = visitor.targetEnclosure;
  return {
    title: t('panel.visitorTitle', { kind: t(`visitor.${visitor.kind}`), id: visitor.id }),
    body: [
      h('p', { className: 'panel-status' }, [
        h('span', { className: 'status-badge', attrs: { 'data-mood': mood } }, [
          mood === 'neutral'
            ? h('span', { className: 'status-ok', text: '·', attrs: { 'aria-hidden': 'true' } })
            : canvasImage(moodIcon(mood), 'status-icon'),
          t(`mood.${mood}`),
        ]),
        h('span', {
          className: 'panel-activity',
          text: `· ${t(`visitorState.${visitor.state}`, { id: target })}`,
        }),
      ]),
      visitor.leaveReason
        ? h('p', {
            className: 'panel-note',
            text: t('panel.leaving', { reason: t(`leave.${visitor.leaveReason}`) }),
          })
        : null,
      h('div', { className: 'gauges' }, [
        gauge('gauge.satisfaction', visitor.satisfaction, 30),
        gauge('gauge.hunger', visitor.hunger, v.hungryBelow),
        gauge('gauge.patience', visitor.patience, 25),
        gauge('gauge.energy', visitor.energy, v.tiredBelow),
      ]),
      h('p', {
        className: 'panel-note',
        text: t('panel.seen', { count: visitor.seen.length, wanted: visitor.viewsWanted }),
      }),
      target && state.enclosures[target]
        ? h('button', {
            className: 'panel-link',
            text: t('panel.back'),
            attrs: { 'data-focus-id': 'back' },
            onClick: () => nav.select({ kind: 'enclosure', id: target }),
          })
        : null,
    ],
  };
}
