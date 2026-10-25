import { t } from './i18n';

// Compteur de FPS et de ticks, affiché avec `?debug`. Masqué aux lecteurs d'écran (bruit sans intérêt pour le joueur).

export interface DebugOverlay {
  frame(now: number, tick: number): void;
}

const SAMPLE_MS = 500;

export function createDebugOverlay(parent: HTMLElement): DebugOverlay {
  const el = document.createElement('div');
  el.className = 'debug-overlay';
  el.setAttribute('aria-hidden', 'true');
  el.dataset.testid = 'debug-overlay';
  el.textContent = `${t('debug.fps')} … · ${t('debug.tick')} 0`;
  parent.append(el);

  let frames = 0;
  let windowStart = -1;

  return {
    frame(now, tick) {
      if (windowStart < 0) windowStart = now;
      frames += 1;
      const elapsed = now - windowStart;
      if (elapsed < SAMPLE_MS) return;
      const fps = Math.round((frames * 1000) / elapsed);
      el.textContent = `${t('debug.fps')} ${fps} · ${t('debug.tick')} ${tick}`;
      frames = 0;
      windowStart = now;
    },
  };
}
