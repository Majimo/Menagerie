// Traduction souris / tactile / clavier en intentions. Le reste du code ne connaît pas le périphérique.
//
// - Souris : clic gauche = construire si un outil est actif, sinon déplacer la vue ; clic droit ou milieu = déplacer ;
//   molette = zoom.
// - Tactile : un doigt = construire (outil actif) ou déplacer ; deux doigts = déplacer et zoomer (pincement).
// - Clavier : flèches / ZQSD = déplacer, + / − = zoom, A / E = rotation, Échap = annuler.

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface Intents {
  /** Un outil de construction est actif : un appui sert à construire plutôt qu'à déplacer la vue. */
  wantsPress(): boolean;
  hover(point: ScreenPoint | null): void;
  pressStart(point: ScreenPoint): void;
  pressMove(point: ScreenPoint): void;
  pressEnd(point: ScreenPoint): void;
  pressCancel(): void;
  pan(dx: number, dy: number): void;
  zoom(factor: number): void;
  rotate(steps: number): void;
  cancel(): void;
}

const KEY_PAN_PX = 40;
const WHEEL_ZOOM = 1.0015;
const KEY_ZOOM = 1.25;

export function attachInput(canvas: HTMLCanvasElement, intents: Intents): void {
  const pointers = new Map<number, ScreenPoint>();
  let pressing: number | null = null;
  let panning = false;
  let pinchDistance = 0;

  const at = (event: PointerEvent): ScreenPoint => ({ x: event.clientX, y: event.clientY });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, at(event));
    if (pointers.size === 2) {
      // Deuxième doigt : on abandonne la construction en cours, on passe en déplacement + pincement.
      if (pressing !== null) intents.pressCancel();
      pressing = null;
      panning = true;
      pinchDistance = spread();
      return;
    }
    if (pointers.size > 2) return;
    if (event.button === 0 && intents.wantsPress()) {
      pressing = event.pointerId;
      intents.pressStart(at(event));
    } else {
      panning = true;
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    const point = at(event);
    if (!previous) {
      if (event.pointerType === 'mouse') intents.hover(point);
      return;
    }
    pointers.set(event.pointerId, point);
    if (pressing === event.pointerId) {
      intents.pressMove(point);
    } else if (panning) {
      if (pointers.size === 2) {
        const distance = spread();
        if (pinchDistance > 0 && distance > 0) intents.zoom(pinchDistance / distance);
        pinchDistance = distance;
        intents.pan((point.x - previous.x) / 2, (point.y - previous.y) / 2);
      } else {
        intents.pan(point.x - previous.x, point.y - previous.y);
      }
    }
  });

  const release = (event: PointerEvent, cancelled: boolean): void => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pressing === event.pointerId) {
      if (cancelled) intents.pressCancel();
      else intents.pressEnd(at(event));
      pressing = null;
    }
    if (pointers.size === 0) panning = false;
    if (pointers.size < 2) pinchDistance = 0;
  };
  canvas.addEventListener('pointerup', (event) => release(event, false));
  canvas.addEventListener('pointercancel', (event) => release(event, true));
  canvas.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && !pointers.has(event.pointerId)) intents.hover(null);
  });

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      intents.zoom(WHEEL_ZOOM ** event.deltaY);
    },
    { passive: false },
  );

  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    const actions: Record<string, () => void> = {
      escape: () => intents.cancel(),
      arrowleft: () => intents.pan(KEY_PAN_PX, 0),
      q: () => intents.pan(KEY_PAN_PX, 0),
      arrowright: () => intents.pan(-KEY_PAN_PX, 0),
      d: () => intents.pan(-KEY_PAN_PX, 0),
      arrowup: () => intents.pan(0, KEY_PAN_PX),
      z: () => intents.pan(0, KEY_PAN_PX),
      arrowdown: () => intents.pan(0, -KEY_PAN_PX),
      s: () => intents.pan(0, -KEY_PAN_PX),
      '+': () => intents.zoom(1 / KEY_ZOOM),
      '=': () => intents.zoom(1 / KEY_ZOOM),
      '-': () => intents.zoom(KEY_ZOOM),
      a: () => intents.rotate(-1),
      e: () => intents.rotate(1),
    };
    const action = actions[key];
    if (!action) return;
    // Les flèches restent aux contrôles de l'interface qui en ont besoin (groupes de boutons radio).
    if (
      key.startsWith('arrow') &&
      event.target instanceof HTMLElement &&
      event.target.closest('[role="radiogroup"]')
    )
      return;
    event.preventDefault();
    action();
  });

  function spread(): number {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
}
