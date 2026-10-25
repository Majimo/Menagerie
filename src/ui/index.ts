import { t } from './i18n';

// Coquille DOM de l'application : titre du document, titre accessible, libellé du canvas.

export function setupShell(canvas: HTMLCanvasElement): void {
  document.title = t('app.title');
  const heading = document.getElementById('app-heading');
  if (heading) heading.textContent = t('app.heading');
  canvas.setAttribute('aria-label', t('scene.label'));
}
