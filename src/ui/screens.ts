import { speciesIcon } from '../render/icons';
import { FIRST_STEPS } from '../sim/data/scenario';
import { SPECIES_IDS } from '../sim/data/species';
import type { GameState } from '../sim/state';
import { canvasImage, h } from './dom';
import { t } from './i18n';
import { icon } from './icons';

// Écrans modaux : écran titre, menu de partie, fin de partie. Des `<dialog>` natifs ouverts par `showModal()` :
// focus piégé dans la boîte, reste de la page inerte, fermeture au clavier gérée par le navigateur.
// Tant qu'un écran est ouvert, la partie ne s'écoule pas (`blocking`).

export interface ScreenActions {
  newGame(): void;
  /** Charge la sauvegarde ; renvoie un message d'erreur, ou `null` si tout va bien. */
  loadGame(): string | null;
  /** Sauvegarde ; renvoie un message à afficher. */
  saveGame(): string;
  /** Jour de la sauvegarde existante, ou `null` s'il n'y en a pas. */
  savedDay(): number | null;
}

export interface Screens {
  readonly blocking: boolean;
  showTitle(): void;
  showMenu(): void;
  showEnd(state: Readonly<GameState>): void;
  closeAll(): void;
}

function dialog(
  parent: HTMLElement,
  className: string,
  labelId: string,
  closable: boolean,
): HTMLDialogElement {
  const el = h('dialog', { className: `screen ${className}`, attrs: { 'aria-labelledby': labelId } });
  // Écran titre et fin de partie : on ne les quitte qu'en choisissant une action.
  if (!closable) el.addEventListener('cancel', (event) => event.preventDefault());
  parent.append(el);
  return el;
}

const button = (text: string, onClick: () => void, primary = false) =>
  h('button', { className: primary ? 'screen-button primary' : 'screen-button', text, onClick });

export function createScreens(parent: HTMLElement, actions: ScreenActions): Screens {
  const title = dialog(parent, 'title-screen', 'title-heading', false);
  const menu = dialog(parent, 'menu-screen', 'menu-heading', true);
  const end = dialog(parent, 'end-screen', 'end-heading', false);
  const all = [title, menu, end];

  const open = (el: HTMLDialogElement) => {
    for (const other of all) if (other !== el && other.open) other.close();
    if (!el.open) el.showModal();
  };
  const close = (el: HTMLDialogElement) => {
    if (el.open) el.close();
  };
  const message = () => h('p', { className: 'screen-message', attrs: { role: 'status' } });

  function startNew(el: HTMLDialogElement): void {
    close(el);
    actions.newGame();
  }

  function load(el: HTMLDialogElement, status: HTMLElement): void {
    const error = actions.loadGame();
    if (error) status.textContent = error;
    else close(el);
  }

  function renderTitle(): void {
    const status = message();
    const day = actions.savedDay();
    title.replaceChildren(
      h('h2', { className: 'title-name', text: t('app.title'), attrs: { id: 'title-heading' } }),
      h(
        'div',
        { className: 'title-animals', attrs: { 'aria-hidden': 'true' } },
        SPECIES_IDS.map((id) => canvasImage(speciesIcon(id), 'title-animal')),
      ),
      h('p', { className: 'title-tagline', text: t('title.tagline') }),
      h('div', { className: 'screen-actions' }, [
        day !== null ? button(t('title.continue', { day }), () => load(title, status), true) : null,
        button(t('title.new'), () => startNew(title), day === null),
      ]),
      status,
      h('p', { className: 'screen-help', text: t('title.howTo') }),
      h('p', { className: 'screen-help', text: t('title.controls') }),
    );
  }

  function renderMenu(confirming = false): void {
    const status = message();
    const heading = h('h2', { text: t('menu.title'), attrs: { id: 'menu-heading' } });
    if (confirming) {
      menu.replaceChildren(
        heading,
        h('p', { text: t('menu.newConfirm') }),
        h('div', { className: 'screen-actions' }, [
          button(t('menu.newConfirmYes'), () => startNew(menu), true),
          button(t('menu.resume'), () => renderMenu()),
        ]),
      );
      menu.querySelector('button')?.focus();
      return;
    }
    const day = actions.savedDay();
    menu.replaceChildren(
      heading,
      h('div', { className: 'screen-actions vertical' }, [
        button(t('menu.resume'), () => close(menu), true),
        button(t('menu.save'), () => {
          status.textContent = actions.saveGame();
        }),
        day !== null ? button(t('menu.load'), () => load(menu, status)) : null,
        button(t('menu.new'), () => renderMenu(true)),
      ]),
      status,
      h('p', { className: 'screen-help', text: t('menu.autosave') }),
    );
    menu.querySelector('button')?.focus();
  }

  function renderEnd(state: Readonly<GameState>): void {
    const status = message();
    const done = state.scenario.completedAt.filter((tick) => tick !== -1).length;
    end.replaceChildren(
      h('h2', { className: 'end-title', attrs: { id: 'end-heading' } }, [
        icon('alert', 'end-icon'),
        h('span', { text: t('end.lost.title') }),
      ]),
      h('p', {
        text: t('end.lost.text', { days: FIRST_STEPS.bankruptcyDays, day: state.stats.today.day }),
      }),
      h('p', { text: t('end.lost.objectives', { done, total: FIRST_STEPS.objectives.length }) }),
      h('p', { className: 'screen-help', text: t('end.lost.tip') }),
      h('div', { className: 'screen-actions' }, [
        button(t('end.retry'), () => startNew(end), true),
        actions.savedDay() !== null ? button(t('end.load'), () => load(end, status)) : null,
      ]),
      status,
    );
  }

  return {
    get blocking() {
      return all.some((el) => el.open);
    },
    showTitle() {
      renderTitle();
      open(title);
    },
    showMenu() {
      renderMenu();
      open(menu);
    },
    showEnd(state) {
      renderEnd(state);
      open(end);
    },
    closeAll() {
      for (const el of all) close(el);
    },
  };
}
