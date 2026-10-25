import { scenarios } from '../../tests/e2e/scenarios';
import type { CameraPreset } from '../render/camera';
import type { GameRenderer } from '../render/renderer';
import type { Session } from '../session';
import type { Command, CommandResult } from '../sim/commands';
import { dispatchCommand, stepSimulation } from '../sim/simulation';
import { createInitialState, type GameState } from '../sim/state';

// API de debug `window.__game` (docs/09) : dev et tests uniquement. Chargée par import dynamique
// derrière `import.meta.env.DEV`, elle est absente du build de production.

export interface GameApi {
  ready(): Promise<void>;
  loadScenario(name: string): void;
  advance(ticks: number): void;
  dispatch(command: Command): CommandResult;
  getState(): Readonly<GameState>;
  setCamera(preset: CameraPreset): void;
  freezeTime(): void;
}

declare global {
  interface Window {
    __game?: GameApi;
  }
}

interface GameApiDeps {
  session: Session;
  renderer: GameRenderer;
  firstFrame: Promise<void>;
}

export function installGameApi({ session, renderer, firstFrame }: GameApiDeps): void {
  window.__game = {
    ready: () => firstFrame,
    loadScenario(name) {
      const scenario = scenarios[name as keyof typeof scenarios];
      if (!scenario) throw new Error(`Scénario inconnu : ${name}`);
      session.state = createInitialState(scenario.seed);
      for (const command of scenario.commands) dispatchCommand(session.state, command);
      for (let i = 0; i < scenario.ticks; i++) stepSimulation(session.state);
    },
    advance(ticks) {
      for (let i = 0; i < ticks; i++) stepSimulation(session.state);
    },
    dispatch: (command) => dispatchCommand(session.state, command),
    getState: () => structuredClone(session.state),
    setCamera: (preset) => renderer.setCameraPreset(preset),
    freezeTime: () => renderer.setFrozen(true),
  };
}
