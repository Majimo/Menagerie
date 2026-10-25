// Retours au joueur : message d'erreur annoncé (zone `aria-live`) et info-bulle qui suit le pointeur.

const TOAST_MS = 3500;

export interface Toast {
  /** `error` : refus d'une action ; `info` : événement de la partie. */
  show(text: string, tone?: 'error' | 'info'): void;
}

export function createToast(parent: HTMLElement): Toast {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.dataset.testid = 'toast';
  parent.append(el);
  let timer = 0;
  return {
    show(text, tone = 'error') {
      el.textContent = text;
      el.dataset.tone = tone;
      el.classList.add('visible');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        el.classList.remove('visible');
        el.textContent = '';
      }, TOAST_MS);
    },
  };
}

export interface TooltipLine {
  text: string;
  tone?: 'ok' | 'error';
}

export interface Tooltip {
  show(lines: TooltipLine[], x: number, y: number): void;
  hide(): void;
}

/** Doublon visuel d'informations déjà portées par l'aperçu : masquée aux lecteurs d'écran. */
export function createTooltip(parent: HTMLElement): Tooltip {
  const el = document.createElement('div');
  el.className = 'tooltip';
  el.setAttribute('aria-hidden', 'true');
  el.dataset.testid = 'tooltip';
  el.hidden = true;
  parent.append(el);
  let last = '';
  return {
    show(lines, x, y) {
      const key = JSON.stringify(lines);
      if (key !== last) {
        el.replaceChildren(
          ...lines.map(({ text, tone }) => {
            const line = document.createElement('div');
            line.textContent = tone === 'ok' ? `✓ ${text}` : tone === 'error' ? `✗ ${text}` : text;
            if (tone) line.dataset.tone = tone;
            return line;
          }),
        );
        last = key;
      }
      el.hidden = lines.length === 0;
      // Décalée du pointeur, et gardée dans l'écran.
      const width = el.offsetWidth;
      const left = Math.min(x + 16, window.innerWidth - width - 8);
      const top = Math.max(8, y - el.offsetHeight - 16);
      el.style.transform = `translate(${Math.max(8, left)}px, ${top}px)`;
    },
    hide() {
      el.hidden = true;
    },
  };
}
