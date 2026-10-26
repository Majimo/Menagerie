import { balance } from '../sim/data/balance';
import { BUILDINGS } from '../sim/data/buildings';
import { tileCode } from '../sim/data/terrain';
import type { GameState } from '../sim/state';
import { visitorNetwork } from '../sim/world/visitorNetwork';
import { h } from './dom';
import { type TextKey, t } from './i18n';
import { icon } from './icons';

// Tutoriel minimal : cinq bulles d'aide contextuelles, une à la fois, au fil de la première partie. Une bulle
// disparaît d'elle-même quand le joueur a fait ce qu'elle demande, ou quand il clique « Compris ».
// L'avancement est une commodité locale (localStorage), pas de l'état de jeu.

const STORAGE_KEY = 'menagerie.tutorial';
const REFRESH_MS = 400;

interface Step {
  text: TextKey;
  /** La bulle n'apparaît que si cette condition est remplie (par défaut : toujours). */
  when?: (state: Readonly<GameState>) => boolean;
  /** Le joueur a fait ce qui est demandé : on passe à la suite. */
  done: (state: Readonly<GameState>) => boolean;
}

const livingAnimals = (state: Readonly<GameState>) =>
  Object.values(state.animals).filter((a) => a.diedAt < 0).length;

const STEPS: readonly Step[] = [
  {
    text: 'tutorial.path',
    done: (state) => {
      const paths = state.world.tiles.filter((code) => code === tileCode('path')).length;
      return paths > 2 && visitorNetwork(state).exitReachable;
    },
  },
  { text: 'tutorial.enclosure', done: (state) => Object.keys(state.enclosures).length > 0 },
  { text: 'tutorial.animals', done: (state) => livingAnimals(state) > 0 },
  {
    text: 'tutorial.watch',
    when: (state) => Object.keys(state.visitors).length > 0,
    done: () => false,
  },
  {
    text: 'tutorial.comfort',
    when: (state) =>
      Object.values(state.visitors).some(
        (v) => v.hunger < balance.visitors.hungryBelow || v.energy < balance.visitors.tiredBelow,
      ),
    done: (state) => {
      const kinds = Object.values(state.buildings).map((b) => BUILDINGS[b.kind]);
      return kinds.some((b) => b.sellsSnacks) && kinds.some((b) => b.seats > 0);
    },
  },
];

export interface Tutorial {
  readonly el: HTMLElement;
  /** Active ou coupe le tutoriel (coupé pour les scénarios de démonstration). */
  setEnabled(enabled: boolean): void;
  update(state: Readonly<GameState>, now: number): void;
}

function loadProgress(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveProgress(step: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(step));
  } catch {
    // Stockage indisponible : le tutoriel reprendra au début la prochaine fois.
  }
}

export function createTutorial(parent: HTMLElement): Tutorial {
  const counter = h('span', { className: 'tutorial-counter' });
  const text = h('p', { className: 'tutorial-text' });
  const el = h(
    'aside',
    { className: 'tutorial', attrs: { 'aria-label': t('tutorial.label'), 'data-testid': 'tutorial' } },
    [
      h('div', { className: 'tutorial-head' }, [icon('help', 'tutorial-icon'), counter]),
      // Zone annoncée : chaque nouvelle bulle est lue par les lecteurs d'écran.
      h('div', { attrs: { 'aria-live': 'polite' } }, [text]),
      h('div', { className: 'tutorial-actions' }, [
        h('button', { className: 'tutorial-next', text: t('tutorial.next'), onClick: () => advance() }),
        h('button', {
          className: 'tutorial-skip',
          text: t('tutorial.skip'),
          onClick: () => setStep(STEPS.length),
        }),
      ]),
    ],
  );
  el.hidden = true;
  parent.append(el);

  let step = loadProgress();
  let enabled = false;
  let lastRefresh = Number.NEGATIVE_INFINITY;
  let current = -1;

  function setStep(next: number): void {
    step = next;
    saveProgress(step);
    lastRefresh = Number.NEGATIVE_INFINITY;
    show(-1);
  }

  function advance(): void {
    setStep(step + 1);
  }

  function show(index: number): void {
    if (index === current) return;
    current = index;
    const def = STEPS[index];
    el.hidden = !def;
    if (!def) return;
    counter.textContent = `${t('tutorial.label')} ${index + 1}/${STEPS.length}`;
    text.textContent = t(def.text);
  }

  return {
    el,
    setEnabled(value) {
      enabled = value;
      if (!enabled) show(-1);
      lastRefresh = Number.NEGATIVE_INFINITY;
    },
    update(state, now) {
      if (!enabled || now - lastRefresh < REFRESH_MS) return;
      lastRefresh = now;
      // Saute les étapes déjà faites (un joueur peut anticiper la consigne).
      while (STEPS[step]?.done(state)) setStep(step + 1);
      const def = STEPS[step];
      show(def && (def.when?.(state) ?? true) ? step : -1);
    },
  };
}
