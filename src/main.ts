import './style.css';
import { attachInput } from './input';
import { readSave, writeSave } from './persistence/storage';
import { createRenderer } from './render/renderer';
import type { Session } from './session';
import { createClock, tickFraction, ticksDue } from './sim/clock';
import { dispatchCommand, stepSimulation } from './sim/simulation';
import { createInitialState, type GameState } from './sim/state';
import { createGameUi, setupShell } from './ui';
import { createDebugOverlay } from './ui/debugOverlay';
import { t } from './ui/i18n';
import type { ScreenActions } from './ui/screens';
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

/** Dernier jour sauvegardé automatiquement (sauvegarde à chaque changement de jour). */
let lastSavedDay = session.state.stats.today.day;
/** Partie dont l'écran de fin a déjà été montré. */
let endShownFor: GameState | null = null;

/** Vue de départ : l'entrée et la sortie, au bas de la carte, là où tout commence. */
function showGates(state: Readonly<GameState>): void {
  const { entrance, exit } = state.world;
  renderer.setCameraPreset('mid', { x: (entrance.x + exit.x) / 2 + 0.5, z: entrance.y - 6 });
}

function replaceState(state: GameState): void {
  session.state = state;
  lastSavedDay = state.stats.today.day;
  tools.select(null);
  ui.inspector.select(null);
}

const actions: ScreenActions = {
  newGame() {
    // Seed tirée de l'horloge réelle : ici, hors de la simulation, c'est permis (règle n° 3).
    replaceState(createInitialState(Date.now() % 2_147_483_647 || 1));
    showGates(session.state);
    ui.tutorial.setEnabled(true);
  },
  loadGame() {
    const result = readSave();
    if (!result) return t('menu.noSave');
    if (!result.ok) return t('title.loadError', { reason: t(`save.${result.error}`) });
    replaceState(result.state);
    ui.tutorial.setEnabled(true);
    ui.notify(t('notice.loaded', { day: result.state.stats.today.day }));
    return null;
  },
  saveGame() {
    const { state } = session;
    return writeSave(state) ? t('menu.saved', { day: state.stats.today.day }) : t('menu.saveFailed');
  },
  savedDay() {
    const result = readSave();
    return result?.ok ? result.state.stats.today.day : null;
  },
};

const ui = createGameUi({
  root: uiRoot,
  tools,
  renderer,
  speed,
  reducedMotion,
  dispatch: (command) => dispatchCommand(session.state, command),
  actions,
});
showGates(session.state);
ui.screens.showTitle();
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
  // La partie s'arrête sous un écran modal (titre, menu, fin) et après une défaite.
  const halted = realTimeSuspended || ui.screens.blocking || session.state.scenario.outcome !== 'playing';
  const due = ticksDue(clock, delta, halted ? 0 : speed.factor);
  for (let i = 0; i < due; i++) stepSimulation(session.state);
  const { state } = session;
  if (state.stats.today.day !== lastSavedDay) {
    lastSavedDay = state.stats.today.day;
    // Sauvegarde automatique en fin de journée ; jamais une partie perdue, ni pendant les tests.
    if (!realTimeSuspended && state.scenario.outcome === 'playing') writeSave(state);
  }
  if (state.scenario.outcome === 'lost' && endShownFor !== state) {
    endShownFor = state;
    ui.screens.showEnd(state);
  }
  renderer.render(session.state, {
    preview: tools.preview(session.state),
    now,
    alpha: tickFraction(clock),
    selectedAnimal: ui.inspector.selectedAnimal,
    selectedVisitor: ui.inspector.selectedVisitor,
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
      // Scénario de démonstration : ni écran titre, ni tutoriel.
      prepareScenario: () => {
        ui.screens.closeAll();
        ui.tutorial.setEnabled(false);
      },
    }),
  );
}
