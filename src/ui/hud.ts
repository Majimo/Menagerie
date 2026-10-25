import type { IsoCamera } from '../render/camera';
import { formatMoney, t } from './i18n';
import { type IconId, icon } from './icons';

// Ressources (en haut) et commandes de caméra (à droite).

export interface MoneyDisplay {
  update(money: number): void;
  /** Nouvelle partie (scénario, chargement) : affiche le montant sans variation. */
  reset(): void;
}

/** `extra` : éléments ajoutés à droite du montant (note et visiteurs). */
export function createMoneyDisplay(
  parent: HTMLElement,
  reducedMotion: boolean,
  extra: HTMLElement[] = [],
): MoneyDisplay {
  const box = document.createElement('div');
  box.className = 'money';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', t('money.label'));
  const value = document.createElement('span');
  value.className = 'money-value';
  value.dataset.testid = 'money';
  const delta = document.createElement('span');
  delta.className = 'money-delta';
  delta.setAttribute('aria-hidden', 'true');
  const amount = document.createElement('span');
  amount.className = 'money-amount';
  amount.append(icon('coin'), value, delta);
  box.append(amount, ...extra);
  parent.append(box);

  let shown: number | null = null;
  let hideTimer = 0;
  return {
    update(money) {
      if (money === shown) return;
      if (shown !== null) {
        // Retour visuel de la dernière action : variation d'argent affichée un instant.
        const change = money - shown;
        delta.textContent = `${change > 0 ? '+' : '−'}${formatMoney(Math.abs(change))}`;
        delta.dataset.sign = change > 0 ? 'gain' : 'loss';
        delta.classList.remove('visible');
        if (!reducedMotion) void delta.offsetWidth; // relance l'animation
        delta.classList.add('visible');
        window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => delta.classList.remove('visible'), 1600);
      }
      shown = money;
      value.textContent = formatMoney(money);
    },
    reset() {
      shown = null;
      delta.classList.remove('visible');
    },
  };
}

export function createCameraControls(parent: HTMLElement, camera: IsoCamera): void {
  const group = document.createElement('div');
  group.className = 'camera-controls';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', t('camera.label'));
  const actions: [
    IconId,
    'camera.rotateLeft' | 'camera.rotateRight' | 'camera.zoomIn' | 'camera.zoomOut',
    () => void,
  ][] = [
    ['zoomIn', 'camera.zoomIn', () => camera.zoomBy(1 / 1.3)],
    ['zoomOut', 'camera.zoomOut', () => camera.zoomBy(1.3)],
    ['rotateLeft', 'camera.rotateLeft', () => camera.rotate(-1)],
    ['rotateRight', 'camera.rotateRight', () => camera.rotate(1)],
  ];
  for (const [id, key, action] of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button';
    button.setAttribute('aria-label', t(key));
    button.title = t(key);
    button.append(icon(id));
    button.addEventListener('click', action);
    group.append(button);
  }
  parent.append(group);
}
