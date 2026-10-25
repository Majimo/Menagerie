import { scenarios } from '../../tests/e2e/scenarios';
import type { CameraPreset } from '../render/camera';
import type { GameRenderer } from '../render/renderer';
import type { Session } from '../session';
import type { Command, CommandResult } from '../sim/commands';
import type { PaintableBiome } from '../sim/data/terrain';
import { dispatchCommand, stepSimulation } from '../sim/simulation';
import { createInitialState, type GameState } from '../sim/state';
import type { TileCoord } from '../sim/world/grid';
import type { ToolController } from '../ui/tools';
import type { ToolId } from '../ui/toolTargets';

// API de debug `window.__game` (docs/09) : dev et tests uniquement. Chargée par import dynamique
// derrière `import.meta.env.DEV`, elle est absente du build de production.

export interface GameApi {
  ready(): Promise<void>;
  /** Charge un scénario seedé et suspend l'écoulement du temps réel (seul `advance` fait avancer la partie). */
  loadScenario(name: string): void;
  advance(ticks: number): void;
  dispatch(command: Command): CommandResult;
  getState(): Readonly<GameState>;
  /** Sans cible : centre de la carte, ou tuile `focus` du scénario chargé pour `mid` et `close`. */
  setCamera(preset: CameraPreset, target?: TileCoord): void;
  freezeTime(): void;
  /** Position écran (coordonnées client) du centre d'une tuile. */
  tileToScreen(tile: TileCoord): { x: number; y: number };
  /**
   * Montre l'aperçu d'un outil comme pendant un glisser de `from` à `to`, sans relâcher : centres de tuiles,
   * ou coins nord-ouest pour la clôture (elle relie des coins).
   */
  previewTool(tool: ToolId, from: TileCoord, to: TileCoord, biome?: PaintableBiome): void;
}

declare global {
  interface Window {
    __game?: GameApi;
  }
}

interface GameApiDeps {
  session: Session;
  renderer: GameRenderer;
  tools: ToolController;
  firstFrame: Promise<void>;
  pauseRealTime(): void;
}

const center = (tile: TileCoord) => ({ x: tile.x + 0.5, z: tile.y + 0.5 });

export function installGameApi({ session, renderer, tools, firstFrame, pauseRealTime }: GameApiDeps): void {
  let focus: TileCoord | undefined;
  window.__game = {
    ready: () => firstFrame,
    loadScenario(name) {
      const scenario = scenarios[name as keyof typeof scenarios];
      if (!scenario) throw new Error(`Scénario inconnu : ${name}`);
      pauseRealTime();
      tools.select(null);
      session.state = createInitialState(scenario.seed);
      for (const command of scenario.commands) dispatchCommand(session.state, command);
      for (let i = 0; i < scenario.ticks; i++) stepSimulation(session.state);
      focus = 'focus' in scenario ? scenario.focus : undefined;
    },
    advance(ticks) {
      for (let i = 0; i < ticks; i++) stepSimulation(session.state);
    },
    dispatch: (command) => dispatchCommand(session.state, command),
    getState: () => structuredClone(session.state),
    setCamera(preset, target) {
      const tile = target ?? (preset === 'far' ? undefined : focus);
      renderer.setCameraPreset(preset, tile && center(tile));
    },
    freezeTime: () => renderer.setFrozen(true),
    tileToScreen: (tile) => renderer.toClient(center(tile)),
    previewTool(tool, from, to, biome) {
      tools.select(tool);
      if (biome) tools.setBiome(biome);
      const point = (tile: TileCoord) => (tool === 'fence' ? { x: tile.x, z: tile.y } : center(tile));
      tools.pressStart(point(from));
      tools.pressMove(point(to));
    },
  };
}
