import type { GroundPoint } from '../render/picking';
import { EMPTY_PREVIEW, type Preview } from '../render/views/previewView';
import { type Command, type CommandError, type CommandResult, validateCommand } from '../sim/commands';
import type { PaintableBiome } from '../sim/data/terrain';
import type { GameState } from '../sim/state';
import { inBounds } from '../sim/world/grid';
import { type ToolId, targetsFor, tileUnder } from './toolTargets';

// Outil actif, survol et glisser : calcule l'aperçu (valide / invalide) et envoie les commandes au relâchement.
// L'UI ne modifie jamais l'état : elle passe par `dispatch`.

export interface ToolOutcome {
  applied: number;
  refused: number;
  /** Raison du premier refus. */
  error: CommandError | null;
  moneyDelta: number;
}

export interface Evaluation {
  commands: { command: Command; result: CommandResult }[];
  /** Somme des mouvements d'argent des commandes valides. */
  moneyDelta: number;
}

export interface ToolController {
  readonly active: ToolId | null;
  readonly biome: PaintableBiome;
  readonly dragging: boolean;
  select(tool: ToolId | null): void;
  setBiome(biome: PaintableBiome): void;
  hover(point: GroundPoint | null): void;
  pressStart(point: GroundPoint): void;
  pressMove(point: GroundPoint): void;
  pressEnd(point: GroundPoint): ToolOutcome | null;
  pressCancel(): void;
  /** Échap : annule le glisser en cours, sinon désactive l'outil. */
  cancel(): void;
  evaluate(state: Readonly<GameState>): Evaluation | null;
  preview(state: Readonly<GameState>): Preview;
  /** Point survolé (ou point courant du glisser). */
  readonly pointer: GroundPoint | null;
  onChange(listener: () => void): void;
}

export function createToolController(
  getState: () => Readonly<GameState>,
  dispatch: (command: Command) => CommandResult,
): ToolController {
  let active: ToolId | null = null;
  let biome: PaintableBiome = 'savanna';
  let start: GroundPoint | null = null;
  let pointer: GroundPoint | null = null;
  const listeners: (() => void)[] = [];
  const changed = () => {
    for (const listener of listeners) listener();
  };

  function evaluate(state: Readonly<GameState>): Evaluation | null {
    if (!active || !pointer) return null;
    // Validation en séquence avec l'argent restant : au-delà du budget, la suite de l'aperçu passe en invalide.
    const scratch = { ...state, money: state.money };
    let moneyDelta = 0;
    const commands = targetsFor(active, biome, state, start, pointer).map((command) => {
      const result = validateCommand(scratch, command);
      if (result.ok) {
        scratch.money += result.moneyDelta;
        moneyDelta += result.moneyDelta;
      }
      return { command, result };
    });
    return { commands, moneyDelta };
  }

  return {
    get active() {
      return active;
    },
    get biome() {
      return biome;
    },
    get dragging() {
      return start !== null;
    },
    get pointer() {
      return pointer;
    },
    select(tool) {
      active = tool;
      start = null;
      changed();
    },
    setBiome(value) {
      biome = value;
      changed();
    },
    hover(point) {
      if (start === null) pointer = point;
    },
    pressStart(point) {
      start = point;
      pointer = point;
    },
    pressMove(point) {
      pointer = point;
    },
    pressEnd(point) {
      if (!active || !start) return null;
      pointer = point;
      const outcome: ToolOutcome = { applied: 0, refused: 0, error: null, moneyDelta: 0 };
      // Cibles calculées avant d'envoyer la première commande : `dispatch` fait évoluer l'état.
      for (const command of targetsFor(active, biome, getState(), start, point)) {
        const result = dispatch(command);
        if (result.ok) {
          outcome.applied += 1;
          outcome.moneyDelta += result.moneyDelta;
        } else {
          outcome.refused += 1;
          outcome.error ??= result.error;
        }
      }
      start = null;
      return outcome;
    },
    pressCancel() {
      start = null;
    },
    cancel() {
      if (start) start = null;
      else this.select(null);
    },
    evaluate,
    preview(state) {
      const tile = pointer ? tileUnder(pointer) : null;
      const enclosureId =
        tile && !start && inBounds(state.world, tile)
          ? (state.world.enclosureOf[tile.y * state.world.width + tile.x] ?? 0)
          : 0;
      const evaluation = evaluate(state);
      if (!evaluation) return { ...EMPTY_PREVIEW, enclosureId };
      const preview: Preview = { tiles: [], edges: [], enclosureId };
      for (const { command, result } of evaluation.commands) {
        const valid = result.ok;
        if (command.type === 'PlaceFence') preview.edges.push({ at: command.edge, valid });
        else if (command.type === 'Demolish' && command.target.kind === 'fence')
          preview.edges.push({ at: command.target.edge, valid });
        else if (command.type === 'Demolish' && command.target.kind === 'tile')
          preview.tiles.push({ at: command.target.tile, valid });
        else if (command.type === 'PlacePath' || command.type === 'PaintBiome')
          preview.tiles.push({ at: command.tile, valid });
      }
      return preview;
    },
    onChange(listener) {
      listeners.push(listener);
    },
  };
}
