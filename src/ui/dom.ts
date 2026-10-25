// Construction de DOM concise pour les panneaux.

type Child = Node | string | null | undefined | false;

export interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  onClick?: () => void;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.text !== undefined) el.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) el.setAttribute(name, value);
  if (options.onClick) el.addEventListener('click', options.onClick);
  for (const child of children) if (child) el.append(child);
  if (tag === 'button' && !el.getAttribute('type')) el.setAttribute('type', 'button');
  return el;
}

const dataUrls = new WeakMap<HTMLCanvasElement, string>();

/** Image décorative tirée d'un canvas d'icône (le texte voisin porte le sens). */
export function canvasImage(canvas: HTMLCanvasElement, className: string): HTMLImageElement {
  let url = dataUrls.get(canvas);
  if (!url) {
    url = canvas.toDataURL();
    dataUrls.set(canvas, url);
  }
  return h('img', { className, attrs: { alt: '', 'aria-hidden': 'true', src: url } });
}
