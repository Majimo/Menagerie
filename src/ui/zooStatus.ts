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
  // Nom accessible = texte du bouton (le visible y figure tel quel) : « Économie : note 4,0 sur 5, 157 visiteurs ».
  const hidden = (key: 'hud.economy.lead' | 'hud.economy.middle' | 'hud.economy.tail') =>
    h('span', { className: 'visually-hidden', text: t(key) });
  const el = h(
    'button',
    {
      className: 'economy-button',
      attrs: { 'data-testid': 'economy-button', title: t('hud.economy.help') },
      onClick: onOpen,
    },
    [
      hidden('hud.economy.lead'),
      icon('star'),
      rating,
      hidden('hud.economy.middle'),
      icon('person'),
      visitors,
      hidden('hud.economy.tail'),
    ],
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
    },
  };
}
