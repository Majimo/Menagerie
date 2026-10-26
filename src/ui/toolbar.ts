import { speciesIcon } from '../render/speciesIcons';
import { balance } from '../sim/data/balance';
import { BUILDING_KINDS, BUILDINGS } from '../sim/data/buildings';
import { SPECIES, SPECIES_IDS } from '../sim/data/species';
import { PAINTABLE_BIOMES } from '../sim/data/terrain';
import { formatMoney, type TextKey, t } from './i18n';
import { icon } from './icons';
import type { ToolController } from './tools';
import { TOOLS, type ToolId } from './toolTargets';

// Barre d'outils de construction (en bas) et choix de la variante (biome, espèce, objet) au-dessus de l'outil actif.

const HELP_COST: Record<ToolId, number> = {
  path: balance.costs.path,
  fence: balance.costs.fence,
  biome: balance.costs.biome,
  animal: 0,
  object: 0,
  demolish: 0,
};

interface PickerOption<T extends string> {
  id: T;
  label: string;
  /** Prix affiché sous le nom, s'il y en a un. */
  price?: number | undefined;
  visual: HTMLElement;
}

interface Picker<T extends string> {
  readonly el: HTMLElement;
  sync(selected: T): void;
}

function createPicker<T extends string>(
  labelKey: TextKey,
  options: PickerOption<T>[],
  onSelect: (id: T) => void,
): Picker<T> {
  const el = document.createElement('div');
  el.className = 'picker';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', t(labelKey));
  const buttons = new Map<T, HTMLButtonElement>();
  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'picker-button';
    button.dataset.option = option.id;
    const text = document.createElement('span');
    text.className = 'picker-text';
    const name = document.createElement('span');
    name.textContent = option.label;
    text.append(name);
    if (option.price !== undefined) {
      const price = document.createElement('span');
      price.className = 'picker-price';
      price.textContent = formatMoney(option.price);
      text.append(price);
    }
    option.visual.setAttribute('aria-hidden', 'true');
    button.append(option.visual, text);
    button.addEventListener('click', () => onSelect(option.id));
    buttons.set(option.id, button);
    el.append(button);
  }
  return {
    el,
    sync(selected) {
      for (const [id, button] of buttons) button.setAttribute('aria-pressed', String(id === selected));
    },
  };
}

function swatch(className: string): HTMLElement {
  const el = document.createElement('span');
  el.className = `swatch ${className}`;
  return el;
}

function iconImage(canvas: HTMLCanvasElement): HTMLElement {
  const img = document.createElement('img');
  img.className = 'picker-icon';
  img.src = canvas.toDataURL();
  img.alt = '';
  return img;
}

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

  const biomes = createPicker(
    'biome.label',
    PAINTABLE_BIOMES.map((biome) => ({
      id: biome,
      label: t(`biome.${biome}`),
      price: biome === 'water' ? balance.costs.water : undefined,
      visual: swatch(`swatch-${biome}`),
    })),
    (biome) => tools.setBiome(biome),
  );
  const species = createPicker(
    'species.label',
    SPECIES_IDS.map((id) => ({
      id,
      label: t(`species.${id}`),
      price: SPECIES[id].price,
      visual: iconImage(speciesIcon(id)),
    })),
    (id) => tools.setSpecies(id),
  );
  const buildings = createPicker(
    'building.label',
    BUILDING_KINDS.map((kind) => ({
      id: kind,
      label: t(`building.${kind}`),
      price: BUILDINGS[kind].cost,
      visual: swatch(`swatch-building swatch-${kind}`),
    })),
    (kind) => tools.setBuilding(kind),
  );
  biomes.el.classList.add('biome-picker');
  parent.append(biomes.el, species.el, buildings.el, bar);

  function sync(): void {
    for (const [tool, button] of buttons) button.setAttribute('aria-pressed', String(tools.active === tool));
    biomes.el.hidden = tools.active !== 'biome';
    species.el.hidden = tools.active !== 'animal';
    buildings.el.hidden = tools.active !== 'object';
    biomes.sync(tools.biome);
    species.sync(tools.species);
    buildings.sync(tools.building);
  }
  tools.onChange(sync);
  sync();
}
