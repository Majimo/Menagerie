import type { GameRenderer } from '../render/renderer';
import type { GameState } from '../sim/state';
import { createToast, createTooltip, type TooltipLine } from './feedback';
import { createCameraControls, createMoneyDisplay } from './hud';
import { errorKey, formatMoney, t } from './i18n';
import { createToolbar } from './toolbar';
import type { ToolController, ToolOutcome } from './tools';
import { tileUnder } from './toolTargets';

// Coquille DOM de l'application et interface de jeu en surimpression du canvas.

export function setupShell(canvas: HTMLCanvasElement): void {
  document.title = t('app.title');
  const heading = document.getElementById('app-heading');
  if (heading) heading.textContent = t('app.heading');
  canvas.setAttribute('aria-label', t('scene.label'));
}

export interface GameUi {
  /** À chaque frame : argent, info-bulle. */
  update(state: Readonly<GameState>): void;
  /** Résultat d'un placement : message clair si quelque chose a été refusé. */
  report(outcome: ToolOutcome): void;
}

interface GameUiDeps {
  root: HTMLElement;
  tools: ToolController;
  renderer: GameRenderer;
  reducedMotion: boolean;
}

export function createGameUi({ root, tools, renderer, reducedMotion }: GameUiDeps): GameUi {
  const money = createMoneyDisplay(root, reducedMotion);
  createCameraControls(root, renderer.camera);
  createToolbar(root, tools);
  const toast = createToast(root);
  const tooltip = createTooltip(root);
  let lastState: Readonly<GameState> | null = null;

  return {
    update(state) {
      if (state !== lastState) money.reset();
      lastState = state;
      money.update(state.money);
      const pointer = tools.pointer;
      const lines = pointer ? tooltipLines(state, tools) : [];
      if (!pointer || lines.length === 0) {
        tooltip.hide();
        return;
      }
      const screen = renderer.toClient(pointer);
      tooltip.show(lines, screen.x, screen.y);
    },
    report(outcome) {
      if (!outcome.error) return;
      const reason = t(errorKey(outcome.error));
      const total = outcome.applied + outcome.refused;
      toast.show(
        outcome.applied === 0 ? reason : t('outcome.partial', { refused: outcome.refused, total, reason }),
      );
    },
  };
}

function tooltipLines(state: Readonly<GameState>, tools: ToolController): TooltipLine[] {
  const lines: TooltipLine[] = [];
  const pointer = tools.pointer;
  if (!pointer) return lines;
  const tile = tileUnder(pointer);
  const { world } = state;
  const inside = tile.x >= 0 && tile.y >= 0 && tile.x < world.width && tile.y < world.height;
  const enclosure = inside
    ? state.enclosures[world.enclosureOf[tile.y * world.width + tile.x] ?? 0]
    : undefined;
  if (enclosure && !tools.dragging) {
    lines.push({ text: t('tooltip.enclosure', { id: enclosure.id, area: enclosure.area }) });
  }

  const evaluation = tools.evaluate(state);
  if (!evaluation) return lines;
  const valid = evaluation.commands.filter(({ result }) => result.ok).length;
  if (evaluation.commands.length > 1) lines.push({ text: t('tooltip.count', { count: valid }) });
  if (valid > 0) {
    const amount = formatMoney(Math.abs(evaluation.moneyDelta));
    lines.push({
      text: t(evaluation.moneyDelta > 0 ? 'tooltip.refund' : 'tooltip.cost', { amount }),
      tone: 'ok',
    });
  }
  const refused = evaluation.commands.find(({ result }) => !result.ok)?.result;
  if (refused && !refused.ok) lines.push({ text: t(errorKey(refused.error)), tone: 'error' });
  return lines;
}
