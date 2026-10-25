import type { GameRenderer } from '../render/renderer';
import type { Command, CommandResult } from '../sim/commands';
import type { GameState } from '../sim/state';
import { createAlertsBar } from './alerts';
import { h } from './dom';
import { createToast, createTooltip, type TooltipLine } from './feedback';
import { createCameraControls, createMoneyDisplay } from './hud';
import { errorText, formatMoney, t } from './i18n';
import { icon } from './icons';
import { createInspector, type Inspector } from './inspector';
import { createNotices } from './notices';
import { createTimeControls, type GameSpeed } from './timeControls';
import { createToolbar } from './toolbar';
import type { ToolController, ToolOutcome } from './tools';
import { tileUnder } from './toolTargets';
import { createZooStatus } from './zooStatus';

// Coquille DOM de l'application et interface de jeu en surimpression du canvas.

export function setupShell(canvas: HTMLCanvasElement): void {
  document.title = t('app.title');
  const heading = document.getElementById('app-heading');
  if (heading) heading.textContent = t('app.heading');
  canvas.setAttribute('aria-label', t('scene.label'));
}

export interface GameUi {
  readonly inspector: Inspector;
  /** À chaque frame : argent, horloge, info-bulle, panneau d'inspection, annonces. */
  update(state: Readonly<GameState>, now: number): void;
  /** Résultat d'un placement : message clair si quelque chose a été refusé. */
  report(outcome: ToolOutcome): void;
}

interface GameUiDeps {
  root: HTMLElement;
  tools: ToolController;
  renderer: GameRenderer;
  speed: GameSpeed;
  reducedMotion: boolean;
  dispatch: (command: Command) => CommandResult;
}

export function createGameUi({ root, tools, renderer, speed, reducedMotion, dispatch }: GameUiDeps): GameUi {
  const status = createZooStatus(() =>
    inspector.select(inspector.selection?.kind === 'economy' ? null : { kind: 'economy' }),
  );
  const money = createMoneyDisplay(root, reducedMotion, [status.el]);
  const inspector = createInspector(root, dispatch);
  const alerts = createAlertsBar(root, inspector);
  const zooButton = h('button', {
    className: 'zoo-button',
    attrs: { 'data-testid': 'zoo-button', 'aria-label': t('zoo.button'), title: t('zoo.button.help') },
    onClick: () => inspector.select(inspector.selection?.kind === 'zoo' ? null : { kind: 'zoo' }),
  });
  zooButton.append(icon('list'), h('span', { text: t('zoo.button') }));
  const clock = createTimeControls(root, speed, [zooButton]);
  createCameraControls(root, renderer.camera);
  createToolbar(root, tools);
  const toast = createToast(root);
  const tooltip = createTooltip(root);
  const notices = createNotices(toast);
  let lastState: Readonly<GameState> | null = null;

  return {
    inspector,
    update(state, now) {
      if (state !== lastState) money.reset();
      lastState = state;
      money.update(state.money);
      status.update(state);
      alerts.update(state, now);
      clock.update(state.tick);
      inspector.update(state, now);
      notices.update(state);
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
      const reason = errorText(outcome.error);
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
  if (refused && !refused.ok) lines.push({ text: errorText(refused), tone: 'error' });
  return lines;
}
