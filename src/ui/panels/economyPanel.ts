import { balance } from '../../sim/data/balance';
import { VISITOR_KINDS } from '../../sim/data/visitors';
import type { DayLedger, GameState } from '../../sim/state';
import { dailyCosts, ledgerNet } from '../../sim/systems/economy';
import { ratingBreakdown } from '../../sim/systems/rating';
import { visitorDemand } from '../../sim/systems/visitorSpawn';
import { h } from '../dom';
import { formatRating, formatSigned, type TextKey, t } from '../i18n';
import { icon } from '../icons';
import type { PanelContent, PanelNavigation } from './types';

// Panneau Économie : note du zoo, note visée qu'elle rejoint et ce qui fixe celle-ci, prix du billet et son effet,
// bilan du jour et de la veille.

const PRICE_STEPS = [-5, -1, 1, 5];
/** En dessous de ce facteur prix, le panneau prévient que le billet est trop cher. */
const TOO_EXPENSIVE_BELOW = 0.6;

export function economyPanel(state: Readonly<GameState>, nav: PanelNavigation): PanelContent {
  // Note du zoo (celle de la barre du haut et des objectifs) et note visée, qu'elle rejoint jour après jour.
  const rating = state.stats.rating;
  const breakdown = ratingBreakdown(state);
  const demand = visitorDemand(state);
  const { min, max } = balance.economy.ticketPrice;
  const price = state.ticketPrice;

  const stepper = h(
    'div',
    { className: 'price-stepper', attrs: { role: 'group', 'aria-label': t('economy.ticket') } },
    PRICE_STEPS.map((step) => {
      const next = Math.min(max, Math.max(min, price + step));
      const label = t(step < 0 ? 'economy.ticket.down' : 'economy.ticket.up', { step: Math.abs(step) });
      const button = h('button', {
        className: 'price-button',
        text: step < 0 ? `−${-step}` : `+${step}`,
        attrs: { 'aria-label': label, title: label, 'data-focus-id': `price${step}` },
        // Prix relu au clic : deux clics rapides avant le rafraîchissement du panneau s'additionnent.
        onClick: () =>
          nav.dispatch({
            type: 'SetTicketPrice',
            price: Math.min(max, Math.max(min, state.ticketPrice + step)),
          }),
      });
      if (next === price) button.setAttribute('disabled', '');
      return button;
    }),
  );

  const childPrice = Math.round(price * VISITOR_KINDS.child.ticketRatio);
  const demandNotes: (Node | null)[] = demand.reason
    ? [warning(t(`economy.noVisitors.${demand.reason}`))]
    : [
        h('p', {
          className: 'panel-note',
          attrs: { 'data-testid': 'expected-visitors' },
          text: t('economy.expected', { count: Math.round(demand.perDay) }),
        }),
        h('p', {
          className: 'panel-note',
          text: t('economy.fairPrice', { price: Math.round(demand.fairPrice) }),
        }),
        demand.priceFactor < TOO_EXPENSIVE_BELOW ? warning(t('economy.tooExpensive')) : null,
      ];

  const yesterday = state.stats.history[state.stats.history.length - 1];
  const planned = dailyCosts(state);
  return {
    title: t('economy.title'),
    body: [
      h('h3', { className: 'rating-heading', attrs: { 'data-testid': 'economy-rating' } }, [
        h('span', { className: 'stars', text: stars(rating), attrs: { 'aria-hidden': 'true' } }),
        t('economy.rating', { rating: formatRating(rating) }),
      ]),
      ratingTrend(rating, breakdown.rating),
      h('p', {
        className: 'panel-note',
        text: t('economy.rating.target', { rating: formatRating(breakdown.rating) }),
      }),
      h('ul', { className: 'equipment' }, [
        h('li', { text: t('economy.rating.wellbeing', { value: Math.round(breakdown.wellbeing) }) }),
        h('li', { text: t('economy.rating.satisfaction', { value: Math.round(breakdown.satisfaction) }) }),
        h('li', {
          text: t('economy.rating.diversity', {
            count: Math.round(breakdown.diversity * balance.visitors.diversityCap),
            cap: balance.visitors.diversityCap,
          }),
        }),
        breakdown.recentDeaths > 0
          ? h('li', {
              text: t('economy.rating.deaths', {
                count: breakdown.recentDeaths,
                penalty: formatRating(balance.rating.deathPenalty),
              }),
            })
          : null,
      ]),
      h('h3', { text: t('economy.ticket') }),
      h('div', { className: 'price-row' }, [
        h('span', {
          className: 'price-value',
          attrs: { 'data-testid': 'ticket-price' },
          text: t('economy.ticket.value', { price, child: childPrice }),
        }),
      ]),
      stepper,
      ...demandNotes,
      h('h3', { text: t('economy.today', { day: state.stats.today.day }) }),
      ledgerTable(state.stats.today, planned),
      yesterday ? h('h3', { text: t('economy.yesterday', { day: yesterday.day }) }) : null,
      yesterday ? ledgerTable(yesterday, null) : null,
    ],
  };
}

function stars(rating: number): string {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

/** Sens dans lequel la note évolue : flèche et texte, rien si elle a rejoint la note visée. */
function ratingTrend(rating: number, target: number): HTMLElement | null {
  const shown = formatRating(rating);
  const aimed = formatRating(target);
  if (shown === aimed) return null;
  const rising = target > rating;
  return h('p', { className: 'panel-note rating-trend', attrs: { 'data-testid': 'rating-trend' } }, [
    h('span', { className: 'trend-arrow', text: rising ? '▲' : '▼', attrs: { 'aria-hidden': 'true' } }),
    t(rising ? 'economy.rating.rising' : 'economy.rating.falling', { rating: aimed }),
  ]);
}

function warning(text: string): HTMLElement {
  return h('p', { className: 'panel-warning' }, [icon('alert'), text]);
}

/** Bilan d'une journée. `planned` : dépenses de minuit pas encore prélevées (journée en cours). */
function ledgerTable(
  ledger: Readonly<DayLedger>,
  planned: { animalFood: number; upkeep: number } | null,
): HTMLElement {
  const row = (key: TextKey, amount: number, sign: 1 | -1, note?: string) =>
    h('tr', {}, [
      h('th', { attrs: { scope: 'row' }, text: t(key) }),
      h('td', { text: note ?? formatSigned(sign * amount) }),
    ]);
  const food = planned
    ? row('ledger.animalFood', 0, -1, t('ledger.planned', { amount: formatSigned(-planned.animalFood) }))
    : row('ledger.animalFood', ledger.animalFood, -1);
  const upkeep = planned
    ? row('ledger.upkeep', 0, -1, t('ledger.planned', { amount: formatSigned(-planned.upkeep) }))
    : row('ledger.upkeep', ledger.upkeep, -1);
  const net = ledgerNet(ledger);
  return h('div', { className: 'ledger' }, [
    h('table', {}, [
      h('tbody', {}, [
        h('tr', { className: 'ledger-section' }, [
          h('th', { attrs: { colspan: '2', scope: 'colgroup' }, text: t('ledger.income') }),
        ]),
        row('ledger.tickets', ledger.tickets, 1),
        row('ledger.snacks', ledger.snacks, 1),
        h('tr', { className: 'ledger-section' }, [
          h('th', { attrs: { colspan: '2', scope: 'colgroup' }, text: t('ledger.expenses') }),
        ]),
        row('ledger.construction', ledger.construction, -1),
        row('ledger.animalPurchases', ledger.animalPurchases, -1),
        food,
        upkeep,
        h('tr', { className: 'ledger-net', attrs: { 'data-sign': net < 0 ? 'loss' : 'gain' } }, [
          h('th', { attrs: { scope: 'row' }, text: t('ledger.net') }),
          h('td', { text: `${net < 0 ? '▼' : '▲'} ${formatSigned(net)}` }),
        ]),
      ]),
    ]),
    h('p', { className: 'panel-note', text: t('ledger.visitors', { count: ledger.visitors }) }),
  ]);
}
