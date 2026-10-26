// Icônes SVG maison (traits simples), toujours accompagnées d'un texte : décoratives pour les lecteurs d'écran.

const PATHS = {
  path: 'M5 21 9 3M19 21 15 3M12 5v2M12 10.5v3M12 17v3',
  fence: 'M5 4v17M12 4v17M19 4v17M3 9h18M3 15h18',
  biome: 'M5 19C5 11 11 5 19 5c0 8-6 14-14 14ZM5 19l8-8',
  demolish: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  rotateLeft: 'M4 12a8 8 0 1 0 2.4-5.7L4 8.6M4 3.5v5.1h5.1',
  rotateRight: 'M20 12a8 8 0 1 1-2.4-5.7L20 8.6M20 3.5v5.1h-5.1',
  zoomIn: 'M5 12h14M12 5v14',
  zoomOut: 'M5 12h14',
  animal:
    'M12 13c-3 0-5.5 3.2-5.5 5.4 0 1.6 1.4 2.6 3 2.6 1 0 1.7-.4 2.5-.4s1.5.4 2.5.4c1.6 0 3-1 3-2.6 0-2.2-2.5-5.4-5.5-5.4ZM5 12.5a2 2.5 0 1 0 0-.1M19 12.5a2 2.5 0 1 0 0-.1M9 7.5a2 2.5 0 1 0 0-.1M15 7.5a2 2.5 0 1 0 0-.1',
  object: 'M12 3 6.5 11h3L6 17h12l-3.5-6h3L12 3ZM12 17v4',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 4.5v15l12-7.5-12-7.5Z',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  close: 'M6 6l12 12M18 6 6 18',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v10M9.5 9.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.8-2.5 2.2-2.5 1-2.5 2.3 1.1 2 2.5 2 2.5-.8 2.5-2',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L12 3.5Z',
  person: 'M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5.5 20.5c0-3.8 2.9-6.5 6.5-6.5s6.5 2.7 6.5 6.5',
  alert: 'M12 3.5 2.5 20h19L12 3.5ZM12 9.5v5M12 17.2v.3',
  menu: 'M4 6.5h16M4 12h16M4 17.5h16',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM12 11.2v1.6',
  check: 'M4.5 12.5l5 5L19.5 7',
  todo: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9.3 9.4a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2.9-1.2 1.8v.4M12 17v.3',
} as const;

export type IconId = keyof typeof PATHS;

/** `extraClass` : classe de style propre à l'emplacement (taille, couleur). */
export function icon(id: IconId, extraClass?: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon');
  if (extraClass) svg.classList.add(extraClass);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', PATHS[id]);
  svg.append(path);
  return svg;
}
