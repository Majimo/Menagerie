import { balance } from '../sim/data/balance';
import { PAINTABLE_BIOMES } from '../sim/data/terrain';
import { t } from './i18n';
import { icon } from './icons';
import type { ToolController } from './tools';
import { TOOLS, type ToolId } from './toolTargets';

// Barre d'outils de construction (en bas) et choix du biome (au-dessus quand l'outil Biome est actif).

const HELP_COST: Record<ToolId, number> = {
  path: balance.costs.path,
  fence: balance.costs.fence,
  biome: balance.costs.biome,
  demolish: 0,
};

export function createToolbar(parent: HTMLElement, tools: ToolController): void {
  const bar = document.createElement('div');
  bar.className = 'toolbar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', t('toolbar.label'));

  const buttons = new Map<ToolId, HTMLButtonElement>();
  for (const tool of TOOLS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tool-button';
    button.dataset.tool = tool;
    const help = t(`tool.${tool}.help`, { cost: HELP_COST[tool] });
    button.title = help;
    button.setAttribute('aria-label', t(`tool.${tool}`));
    const label = document.createElement('span');
    label.textContent = t(`tool.${tool}`);
    button.append(icon(tool), label);
    button.addEventListener('click', () => tools.select(tools.active === tool ? null : tool));
    buttons.set(tool, button);
    bar.append(button);
  }

  const picker = document.createElement('div');
  picker.className = 'biome-picker';
  picker.setAttribute('role', 'group');
  picker.setAttribute('aria-label', t('biome.label'));
  const swatches = new Map<string, HTMLButtonElement>();
  for (const biome of PAINTABLE_BIOMES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'biome-button';
    button.dataset.biome = biome;
    button.title = t(`biome.${biome}`);
    const swatch = document.createElement('span');
    swatch.className = `swatch swatch-${biome}`;
    swatch.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = t(`biome.${biome}`);
    button.append(swatch, label);
    button.addEventListener('click', () => tools.setBiome(biome));
    swatches.set(biome, button);
    picker.append(button);
  }

  parent.append(picker, bar);

  function sync(): void {
    for (const [tool, button] of buttons) button.setAttribute('aria-pressed', String(tools.active === tool));
    picker.hidden = tools.active !== 'biome';
    for (const [biome, button] of swatches)
      button.setAttribute('aria-pressed', String(tools.biome === biome));
  }
  tools.onChange(sync);
  sync();
}
