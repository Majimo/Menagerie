import './style.css';
import { createRenderer } from './render/renderer';
import type { Session } from './session';
import { createInitialState } from './sim/state';
import { setupShell } from './ui';
import { createDebugOverlay } from './ui/debugOverlay';

// Point d'entrée : assemble simulation, rendu, UI et entrées.

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) throw new Error('Canvas #scene introuvable');

setupShell(canvas);

const session: Session = { state: createInitialState() };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = createRenderer(canvas, { reducedMotion });
const debugOverlay = new URLSearchParams(window.location.search).has('debug')
  ? createDebugOverlay(document.body)
  : null;

let signalFirstFrame: () => void = () => {};
const firstFrame = new Promise<void>((resolve) => {
  signalFirstFrame = resolve;
});

function frame(now: number): void {
  renderer.render(session.state, now);
  debugOverlay?.frame(now, session.state.tick);
  signalFirstFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  void import('./debug/gameApi').then(({ installGameApi }) =>
    installGameApi({ session, renderer, firstFrame }),
  );
}
