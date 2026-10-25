import './style.css';
import { attachInput } from './input';
import { createRenderer } from './render/renderer';
import type { Session } from './session';
import { createClock, ticksDue } from './sim/clock';
import { dispatchCommand, stepSimulation } from './sim/simulation';
import { createInitialState } from './sim/state';
import { createGameUi, setupShell } from './ui';
import { createDebugOverlay } from './ui/debugOverlay';
import { createToolController } from './ui/tools';

// Point d'entrée : assemble simulation, rendu, UI et entrées.

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const uiRoot = document.querySelector<HTMLElement>('#ui');
if (!canvas || !uiRoot) throw new Error('Canvas #scene ou conteneur #ui introuvable');

setupShell(canvas);

const session: Session = { state: createInitialState() };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = createRenderer(canvas, session.state.world, { reducedMotion });
const tools = createToolController(
  () => session.state,
  (command) => dispatchCommand(session.state, command),
);
const ui = createGameUi({ root: uiRoot, tools, renderer, reducedMotion });
const debugOverlay = new URLSearchParams(window.location.search).has('debug')
  ? createDebugOverlay(document.body)
  : null;

attachInput(canvas, {
  wantsPress: () => tools.active !== null,
  hover: (point) => tools.hover(point && renderer.pick(point.x, point.y)),
  pressStart: (point) => {
    const ground = renderer.pick(point.x, point.y);
    if (ground) tools.pressStart(ground);
  },
  pressMove: (point) => {
    const ground = renderer.pick(point.x, point.y);
    if (ground) tools.pressMove(ground);
  },
  pressEnd: (point) => {
    const ground = renderer.pick(point.x, point.y);
    const outcome = ground ? tools.pressEnd(ground) : null;
    if (outcome) ui.report(outcome);
  },
  pressCancel: () => tools.pressCancel(),
  pan: (dx, dy) => renderer.camera.panPixels(dx, dy),
  zoom: (factor) => renderer.camera.zoomBy(factor),
  rotate: (steps) => renderer.camera.rotate(steps),
  cancel: () => tools.cancel(),
});

const clock = createClock();
/** Vitesse de jeu : pause et ×2 / ×4 arrivent à l'itération 2. */
const speed = 1;
let paused = false;
let lastFrame = -1;

let signalFirstFrame: () => void = () => {};
const firstFrame = new Promise<void>((resolve) => {
  signalFirstFrame = resolve;
});

function frame(now: number): void {
  const delta = lastFrame < 0 ? 0 : now - lastFrame;
  lastFrame = now;
  const due = ticksDue(clock, delta, paused ? 0 : speed);
  for (let i = 0; i < due; i++) stepSimulation(session.state);
  renderer.render(session.state, tools.preview(session.state), now);
  ui.update(session.state);
  debugOverlay?.frame(now, session.state.tick);
  signalFirstFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  void import('./debug/gameApi').then(({ installGameApi }) =>
    installGameApi({
      session,
      renderer,
      tools,
      firstFrame,
      // Les tests avancent la simulation eux-mêmes : le temps réel ne doit plus la faire bouger.
      pauseRealTime: () => {
        paused = true;
      },
    }),
  );
}
