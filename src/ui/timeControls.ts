import { timeOfDay } from '../sim/time';
import { t } from './i18n';
import { icon } from './icons';

// Horloge de jeu et vitesse : pause, ×1, ×2, ×4. La vitesse change le nombre de ticks par seconde réelle,
// jamais la durée d'un tick (règle d'architecture n° 6) : elle vit hors de la simulation.

export const SPEEDS = [1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

export interface GameSpeed {
  readonly paused: boolean;
  readonly speed: Speed;
  /** Multiplicateur appliqué au temps réel : 0 en pause. */
  readonly factor: number;
  togglePause(): void;
  setSpeed(speed: Speed): void;
  onChange(listener: () => void): void;
}

export function createGameSpeed(): GameSpeed {
  let paused = false;
  let speed: Speed = 1;
  const listeners: (() => void)[] = [];
  const changed = () => {
    for (const listener of listeners) listener();
  };
  return {
    get paused() {
      return paused;
    },
    get speed() {
      return speed;
    },
    get factor() {
      return paused ? 0 : speed;
    },
    togglePause() {
      paused = !paused;
      changed();
    },
    setSpeed(value) {
      speed = value;
      paused = false;
      changed();
    },
    onChange(listener) {
      listeners.push(listener);
    },
  };
}

export interface TimeControls {
  update(tick: number): void;
}

function formatHour(hour: number): string {
  // Affichage par pas de 10 minutes : l'horloge ne clignote pas à chaque tick.
  const minutes = Math.floor((hour * 60) / 10) * 10;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function createTimeControls(
  parent: HTMLElement,
  speed: GameSpeed,
  extra: HTMLElement[],
): TimeControls {
  const group = document.createElement('div');
  group.className = 'time-controls';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', t('time.label'));

  const clock = document.createElement('span');
  clock.className = 'clock';
  clock.dataset.testid = 'clock';

  const pause = document.createElement('button');
  pause.type = 'button';
  pause.className = 'icon-button';
  pause.dataset.testid = 'pause';
  pause.addEventListener('click', () => speed.togglePause());

  const speedButtons = SPEEDS.map((value, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'speed-button';
    button.textContent = `×${value}`;
    const label = t('time.speed', { speed: value, key: i + 1 });
    button.setAttribute('aria-label', label);
    button.title = label;
    button.addEventListener('click', () => speed.setSpeed(value));
    return button;
  });

  group.append(clock, pause, ...speedButtons, ...extra);
  parent.append(group);

  function sync(): void {
    const key = speed.paused ? 'time.play' : 'time.pause';
    pause.replaceChildren(icon(speed.paused ? 'play' : 'pause'));
    pause.setAttribute('aria-label', t(key));
    pause.title = t(key);
    pause.setAttribute('aria-pressed', String(speed.paused));
    SPEEDS.forEach((value, i) => {
      speedButtons[i]?.setAttribute('aria-pressed', String(!speed.paused && speed.speed === value));
    });
  }
  speed.onChange(sync);
  sync();

  let shown = '';
  return {
    update(tick) {
      const time = timeOfDay(tick);
      const text = t('time.clock', { day: time.day, time: formatHour(time.hour) });
      const full = time.night ? `${text} · ${t('time.night')}` : text;
      if (full === shown) return;
      shown = full;
      clock.textContent = full;
    },
  };
}
