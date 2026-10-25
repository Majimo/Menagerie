import './style.css';
import { attachInput } from './input';
import { createRenderer } from './render/renderer';
import type { Session } from './session';
import { createClock, tickFraction, ticksDue } from './sim/clock';
import { dispatchCommand, stepSimulation } from './sim/simulation';
import { createInitialState } from './sim/state';
import { createGameUi, setupShell } from './ui';
import { createDebugOverlay } from './ui/debugOverlay';
import { createGameSpeed, SPEEDS } from './ui/timeControls';
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
const speed = createGameSpeed();
const ui = createGameUi({ root: uiRoot, tools, renderer, speed, reducedMotion });
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
  cancel: () => {
    if (tools.active) tools.cancel();
    else ui.inspector.select(null);
  },
  tap: (point) => {
    const ground = renderer.pick(point.x, point.y);
    if (ground) ui.inspector.pickAt(session.state, ground);
  },
  togglePause: () => speed.togglePause(),
  setSpeed: (rank) => {
    const value = SPEEDS[rank];
    if (value) speed.setSpeed(value);
  },
});

const clock = createClock();
/** Les tests avancent la simulation eux-mêmes (API de debug) : le temps réel ne la fait plus bouger. */
let realTimeSuspended = false;
let lastFrame = -1;

let signalFirstFrame: () => void = () => {};
const firstFrame = new Promise<void>((resolve) => {
  signalFirstFrame = resolve;
});

function frame(now: number): void {
  const delta = lastFrame < 0 ? 0 : now - lastFrame;
  lastFrame = now;
  const due = ticksDue(clock, delta, realTimeSuspended ? 0 : speed.factor);
  for (let i = 0; i < due; i++) stepSimulation(session.state);
  renderer.render(session.state, {
    preview: tools.preview(session.state),
    now,
    alpha: tickFraction(clock),
    selectedAnimal: ui.inspector.selectedAnimal,
  });
  ui.update(session.state, now);
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
      inspector: ui.inspector,
      pauseRealTime: () => {
        realTimeSuspended = true;
      },
    }),
  );
}
