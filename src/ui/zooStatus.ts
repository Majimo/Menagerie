import type { GameState } from '../sim/state';
import { h } from './dom';
import { formatRating, t } from './i18n';
import { icon } from './icons';

// Note du zoo et visiteurs présents, à côté de l'argent : un bouton qui ouvre le panneau Économie.

export interface ZooStatus {
  readonly el: HTMLButtonElement;
  update(state: Readonly<GameState>): void;
}

export function createZooStatus(onOpen: () => void): ZooStatus {
  const rating = h('span', { className: 'status-value', attrs: { 'data-testid': 'rating' } });
  const visitors = h('span', { className: 'status-value', attrs: { 'data-testid': 'visitor-count' } });
  const el = h(
    'button',
    {
      className: 'economy-button',
      attrs: { 'data-testid': 'economy-button', title: t('hud.economy.help') },
      onClick: onOpen,
    },
    [icon('star'), rating, icon('person'), visitors],
  );
  let shown = '';
  return {
    el,
    update(state) {
      const count = Object.keys(state.visitors).length;
      const text = formatRating(state.stats.rating);
      const key = `${text}|${count}`;
      if (key === shown) return;
      shown = key;
      rating.textContent = text;
      visitors.textContent = String(count);
      el.setAttribute('aria-label', t('hud.economy', { rating: text, count }));
    },
  };
}
